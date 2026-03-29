from backend.tools.playwright_booking import PlaywrightBooker


class BookingAgent:
    def __init__(self):
        self.booker = PlaywrightBooker()

    async def run(self, params: dict) -> dict:
        booking_type = params.get("booking_type", "flight")
        item_id = params.get("item_id", "")
        traveler_info = params.get("traveler_info", {})

        # item_id references an item in trip state
        # In production, look up the full item from the trip state
        item = {
            "id": item_id,
            "booking_url_params": traveler_info.get("booking_url_params", {}),
            "type": booking_type,
            "name": traveler_info.get("name", ""),
        }

        result = await self.booker.book(booking_type, item, traveler_info)
        return {
            "booking_type": booking_type,
            "item_id": item_id,
            "result": result,
            "status": result.get("status", "unknown"),
        }
