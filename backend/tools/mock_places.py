from backend.tools.mock_amadeus import find_events


async def search_places(params: dict) -> dict:
    # PHASE2: Replace with real Google Places API call
    return await find_events(params)
