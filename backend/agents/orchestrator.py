import asyncio
import json
import os
from typing import AsyncGenerator

import anthropic

from backend.agents.flight_agent import FlightAgent
from backend.agents.lodging_agent import LodgingAgent
from backend.agents.events_agent import EventsAgent
from backend.agents.budget_agent import BudgetAgent
from backend.agents.calendar_agent import CalendarAgent
from backend.agents.verification_agent import VerificationAgent
from backend.agents.booking_agent import BookingAgent
from backend.tools.tool_definitions import TOOLS


STATUS_MESSAGES = {
    "search_flights": "Searching for flights...",
    "search_lodging": "Finding the best places to stay...",
    "find_events": "Discovering activities and experiences...",
    "check_budget": "Checking your budget...",
    "sync_calendar": "Updating your trip calendar...",
    "verify_plan": "Reviewing your complete itinerary...",
    "initiate_booking": "Initiating booking process...",
}


class OrchestratorAgent:
    SYSTEM_PROMPT = """
    You are Travvy, an expert AI travel planner. Your job is to help users plan
    complete trips from scratch — collecting their preferences, searching for the
    best options, building a full itinerary, and guiding them through booking.

    You have access to tools to search for flights, lodging, and events, manage
    their budget, sync their calendar, and initiate bookings.

    Personality: warm, efficient, knowledgeable. Like a personal travel agent who
    genuinely cares about getting every detail right.

    Always:
    - Collect all necessary info before searching (destination, dates, travelers, budget)
    - Run flight, lodging, and event searches in parallel
    - Check budget after every search
    - Present options clearly with prices and key details
    - Confirm the full plan before initiating any booking
    - Never re-ask for information the user has already provided

    Trip state you are maintaining: {trip_state}
    """

    def __init__(self, trip_state: dict, user: dict):
        self.client = anthropic.AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY", "")
        )
        self.trip_state = trip_state
        self.user = user
        self.sub_agents: dict = {
            "search_flights": FlightAgent(),
            "search_lodging": LodgingAgent(),
            "find_events": EventsAgent(),
            "check_budget": BudgetAgent(),
            "sync_calendar": CalendarAgent(),
            "verify_plan": VerificationAgent(),
            "initiate_booking": BookingAgent(),
        }

    def get_status_message(self, tool_name: str) -> str:
        return STATUS_MESSAGES.get(tool_name, f"Running {tool_name}...")

    def build_messages(self, user_message: str, history: list) -> list:
        messages = list(history)
        messages.append({"role": "user", "content": user_message})
        return messages

    def update_trip_state(self, tool_name: str, result: dict):
        if tool_name == "search_flights":
            self.trip_state["flights"] = result.get("flights", [])
        elif tool_name == "search_lodging":
            self.trip_state["lodging"] = result.get("lodging", [])
        elif tool_name == "find_events":
            self.trip_state["events"] = result.get("events", [])
        elif tool_name == "check_budget":
            self.trip_state["budget"] = result
        elif tool_name == "sync_calendar":
            self.trip_state["calendar_events"] = result.get("events", [])
        elif tool_name == "verify_plan":
            self.trip_state["verification"] = result

    async def stream(
        self, user_message: str, history: list
    ) -> AsyncGenerator[dict, None]:
        messages = self.build_messages(user_message, history)

        # Agentic loop — keeps running until Claude stops calling tools
        while True:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                system=self.SYSTEM_PROMPT.format(
                    trip_state=json.dumps(self.trip_state)
                ),
                tools=TOOLS,
                messages=messages,
            )

            # Stream text deltas
            for block in response.content:
                if hasattr(block, "type") and block.type == "text":
                    yield {"type": "text_delta", "content": block.text}

            # If no tool calls, we're done
            if response.stop_reason != "tool_use":
                yield {"type": "done"}
                break

            # Handle tool calls — run independent ones in parallel
            tool_calls = [
                b for b in response.content if hasattr(b, "type") and b.type == "tool_use"
            ]
            parallel_tools = ["search_flights", "search_lodging", "find_events"]

            parallel = [t for t in tool_calls if t.name in parallel_tools]
            sequential = [t for t in tool_calls if t.name not in parallel_tools]

            # Emit tool_start events
            for tool_call in tool_calls:
                yield {
                    "type": "tool_start",
                    "tool": tool_call.name,
                    "status": self.get_status_message(tool_call.name),
                }

            # Append assistant message with tool use
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []

            # Execute parallel tools simultaneously
            if parallel:
                results = await asyncio.gather(
                    *[self.sub_agents[t.name].run(t.input) for t in parallel]
                )
                for tool_call, result in zip(parallel, results):
                    yield {"type": "tool_result", "tool": tool_call.name, "data": result}
                    self.update_trip_state(tool_call.name, result)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_call.id,
                        "content": json.dumps(result),
                    })

            # Execute sequential tools one by one
            for tool_call in sequential:
                result = await self.sub_agents[tool_call.name].run(tool_call.input)
                yield {"type": "tool_result", "tool": tool_call.name, "data": result}
                self.update_trip_state(tool_call.name, result)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_call.id,
                    "content": json.dumps(result),
                })

            # Add all tool results in one user message
            if tool_results:
                messages.append({"role": "user", "content": tool_results})

            # Emit state/calendar/budget updates after each round
            yield {"type": "trip_state_update", "state": self.trip_state}
            if "calendar_events" in self.trip_state:
                yield {
                    "type": "calendar_update",
                    "events": self.trip_state["calendar_events"],
                }
            if "budget" in self.trip_state:
                yield {
                    "type": "budget_update",
                    "breakdown": self.trip_state["budget"],
                }
