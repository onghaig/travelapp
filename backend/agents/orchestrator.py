import asyncio
import json
import os
from typing import AsyncGenerator

import openai

from backend.agents.flight_agent import FlightAgent
from backend.agents.lodging_agent import LodgingAgent
from backend.agents.events_agent import EventsAgent
from backend.agents.budget_agent import BudgetAgent
from backend.agents.calendar_agent import CalendarAgent
from backend.agents.verification_agent import VerificationAgent
from backend.agents.booking_agent import BookingAgent
from backend.tools.tool_definitions import TOOLS


class _TripInfoHandler:
    """Echoes params back so update_trip_state can merge them into trip_state."""
    async def run(self, params: dict) -> dict:
        return params


STATUS_MESSAGES = {
    "update_trip_info": "Saving trip details...",
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
    You are Travvy, a warm and efficient AI travel planner. You help users plan
    complete trips through natural conversation — collecting preferences, finding
    the best options, building an itinerary, and guiding them to booking.

    Tools available: update_trip_info, search_flights, search_lodging, find_events,
    check_budget, sync_calendar, verify_plan, initiate_booking.

    ## STEP 1 — Collect info (one or two questions at a time)
    As the user shares details, call update_trip_info IMMEDIATELY with each new piece.
    Never re-ask for anything already in trip_state. Collect:
      destination, origin (their departure city), departure_date, return_date,
      num_travelers, budget_total, lodging_type, preferred_times, interests.

    When calling search_flights, use trip_state.num_travelers as num_passengers.

    ## STEP 2 — Trigger searches automatically
    Once trip_state contains destination + departure_date + num_travelers + budget_total,
    IMMEDIATELY call search_flights, search_lodging, and find_events in PARALLEL.
    Do NOT ask the user for permission. Do NOT wait for more info.
    After searches return, call check_budget with the combined costs.
    After budget check, call sync_calendar with the flight + lodging events.

    ## STEP 3 — Present results conversationally
    Summarize the top flight (cheapest + best value), top lodging option, and
    3–4 activities in a friendly message. Tell the user to select options on the
    Dashboard. Check in: "Does this look right, or shall I adjust anything?"

    ## STEP 4 — Verify and confirm
    When the user is happy, call verify_plan. If verified, tell the user to go to
    the Confirmation screen to start booking.

    ## RULES
    - NEVER re-ask for information already in trip_state
    - If trip_state already has destination/dates/travelers/budget, skip to STEP 2
    - After every user selection, call check_budget
    - If over_budget, proactively suggest cheaper options
    - For change requests: re-run only the affected agents, present the diff

    Current trip state: {trip_state}
    """

    def __init__(self, trip_state: dict, user: dict):
        self.client = openai.AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "")
        )
        self.trip_state = trip_state
        self.user = user
        self.sub_agents: dict = {
            "update_trip_info": _TripInfoHandler(),
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
        elif tool_name == "update_trip_info":
            for key, value in result.items():
                if value is not None:
                    self.trip_state[key] = value

    async def stream(
        self, user_message: str, history: list
    ) -> AsyncGenerator[dict, None]:
        messages = self.build_messages(user_message, history)

        while True:
            # Prepare messages with system prompt first
            openai_messages = [
                {"role": "system", "content": self.SYSTEM_PROMPT.format(trip_state=json.dumps(self.trip_state))}
            ] + messages

            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=openai_messages,
                tools=TOOLS,
            )
            
            choice = response.choices[0]
            message = choice.message

            # Stream text deltas
            if message.content:
                yield {"type": "text_delta", "content": message.content}

            # If no tool calls, we're done
            if choice.finish_reason != "tool_calls":
                # Append final reply to history
                messages.append({"role": "assistant", "content": message.content or ""})
                yield {"type": "done"}
                break

            # Handle tool calls
            tool_calls = message.tool_calls or []
            parallel_tools = ["update_trip_info", "search_flights", "search_lodging", "find_events"]

            parallel = [t for t in tool_calls if t.function.name in parallel_tools]
            sequential = [t for t in tool_calls if t.function.name not in parallel_tools]

            # Emit tool_start events
            for tool_call in tool_calls:
                yield {
                    "type": "tool_start",
                    "tool": tool_call.function.name,
                    "status": self.get_status_message(tool_call.function.name),
                }

            # Append assistant message with tool use
            assistant_msg = {"role": "assistant", "content": message.content}
            assistant_msg["tool_calls"] = [
                {
                    "id": t.id,
                    "type": "function",
                    "function": {
                        "name": t.function.name,
                        "arguments": t.function.arguments,
                    }
                }
                for t in tool_calls
            ]
            messages.append(assistant_msg)

            tool_results = []

            # Execute parallel tools
            if parallel:
                results = await asyncio.gather(
                    *[self.sub_agents[t.function.name].run(json.loads(t.function.arguments)) for t in parallel]
                )
                for tool_call, result in zip(parallel, results):
                    yield {"type": "tool_result", "tool": tool_call.function.name, "data": result}
                    self.update_trip_state(tool_call.function.name, result)
                    tool_results.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_call.function.name,
                        "content": json.dumps(result),
                    })

            # Execute sequential tools
            for tool_call in sequential:
                result = await self.sub_agents[tool_call.function.name].run(json.loads(tool_call.function.arguments))
                yield {"type": "tool_result", "tool": tool_call.function.name, "data": result}
                self.update_trip_state(tool_call.function.name, result)
                tool_results.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_call.function.name,
                    "content": json.dumps(result),
                })

            # Add all tool results back to history
            if tool_results:
                messages.extend(tool_results)

            # Emit state/calendar/budget updates
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
