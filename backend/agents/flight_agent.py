import json
import os
import anthropic
from backend.tools.mock_amadeus import search_flights


class FlightAgent:
    SYSTEM_PROMPT = """
    You are a flight search specialist. Given search criteria, return the top 3-5
    flight options in structured JSON. Always include: airline, flight_number,
    departure_time, arrival_time, duration, stops, price, booking_url_params.
    Return ONLY valid JSON, no other text.
    """

    async def run(self, params: dict) -> dict:
        # PHASE2: Replace with real Amadeus API call
        # amadeus_client.shopping.flight_offers_search.get(...)
        return await search_flights(params)
