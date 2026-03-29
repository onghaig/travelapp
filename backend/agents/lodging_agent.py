from backend.tools.mock_amadeus import search_lodging


class LodgingAgent:
    SYSTEM_PROMPT = """
    You are a lodging search specialist. Given search criteria, return the top 3-5
    hotel and Airbnb options in structured JSON. Always include: name, type,
    neighborhood, price_per_night, total_price, rating, amenities, booking_url_params.
    Return ONLY valid JSON, no other text.
    """

    async def run(self, params: dict) -> dict:
        # PHASE2: Replace with real hotel/Airbnb API calls
        return await search_lodging(params)
