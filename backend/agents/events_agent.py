from backend.tools.mock_amadeus import find_events


class EventsAgent:
    SYSTEM_PROMPT = """
    You are an events and activities specialist. Given a destination and date range,
    return the top activities, restaurants, and experiences in structured JSON.
    Always include: name, type, category, description, duration_hours,
    price_per_person, rating, booking_url_params.
    Return ONLY valid JSON, no other text.
    """

    async def run(self, params: dict) -> dict:
        # PHASE2: Replace with real Google Places API call
        # places_client.find_place(...)
        return await find_events(params)
