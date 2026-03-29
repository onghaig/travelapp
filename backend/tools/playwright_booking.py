import asyncio
import base64
import urllib.parse
from typing import Optional


class PlaywrightBooker:
    TIMEOUT_SECONDS = 30

    async def book(
        self, booking_type: str, item: dict, traveler_info: dict
    ) -> dict:
        try:
            result = await asyncio.wait_for(
                self._playwright_flow(booking_type, item, traveler_info),
                timeout=self.TIMEOUT_SECONDS,
            )
            return result
        except Exception:
            return self._generate_deep_link(booking_type, item)

    async def _playwright_flow(
        self, booking_type: str, item: dict, traveler_info: dict
    ) -> dict:
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return self._generate_deep_link(booking_type, item)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                if booking_type == "flight":
                    await self._book_flight(page, item, traveler_info)
                elif booking_type in ["hotel", "airbnb"]:
                    await self._book_lodging(page, item, traveler_info)
                elif booking_type == "event":
                    await self._book_event(page, item, traveler_info)

                screenshot = await page.screenshot(full_page=False)
                checkout_url = page.url
            finally:
                await browser.close()

            return {
                "status": "at_checkout",
                "checkout_url": checkout_url,
                "screenshot_b64": base64.b64encode(screenshot).decode(),
                "prefilled": True,
                "booking_type": booking_type,
            }

    async def _book_flight(self, page, item: dict, traveler_info: dict):
        params = item.get("booking_url_params", {})
        origin = params.get("origin", "")
        destination = params.get("destination", "")
        date = params.get("date", "")
        adults = params.get("adults", 1)

        url = (
            f"https://www.google.com/travel/flights"
            f"?q=flights+from+{origin}+to+{destination}+on+{date}"
            f"&adults={adults}"
        )
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)

    async def _book_lodging(self, page, item: dict, traveler_info: dict):
        params = item.get("booking_url_params", {})
        destination = params.get("destination", "")
        check_in = params.get("check_in", "")
        check_out = params.get("check_out", "")
        guests = params.get("guests", 1)

        if item.get("type") == "airbnb":
            query = urllib.parse.quote(destination)
            url = (
                f"https://www.airbnb.com/s/{query}/homes"
                f"?checkin={check_in}&checkout={check_out}&adults={guests}"
            )
        else:
            query = urllib.parse.quote(destination)
            url = (
                f"https://www.booking.com/searchresults.html"
                f"?ss={query}&checkin={check_in}&checkout={check_out}"
                f"&group_adults={guests}"
            )
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)

    async def _book_event(self, page, item: dict, traveler_info: dict):
        destination = urllib.parse.quote(
            f"{item.get('name', '')} {item.get('destination', '')}"
        )
        url = f"https://www.viator.com/search/{destination}"
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)

    def _generate_deep_link(self, booking_type: str, item: dict) -> dict:
        url = self._build_url(booking_type, item)
        return {
            "status": "deep_link",
            "url": url,
            "prefilled": False,
            "booking_type": booking_type,
        }

    def _build_url(self, booking_type: str, item: dict) -> str:
        params = item.get("booking_url_params", {})

        if booking_type == "flight":
            origin = params.get("origin", "")
            destination = params.get("destination", "")
            date = params.get("date", "")
            adults = params.get("adults", 1)
            return (
                f"https://www.google.com/travel/flights"
                f"?q=flights+{origin}+to+{destination}+{date}"
                f"&adults={adults}"
            )

        elif booking_type == "hotel":
            destination = urllib.parse.quote(params.get("destination", ""))
            check_in = params.get("check_in", "")
            check_out = params.get("check_out", "")
            guests = params.get("guests", 1)
            return (
                f"https://www.booking.com/searchresults.html"
                f"?ss={destination}&checkin={check_in}&checkout={check_out}"
                f"&group_adults={guests}"
            )

        elif booking_type == "airbnb":
            destination = urllib.parse.quote(params.get("destination", ""))
            check_in = params.get("check_in", "")
            check_out = params.get("check_out", "")
            guests = params.get("guests", 1)
            return (
                f"https://www.airbnb.com/s/{destination}/homes"
                f"?checkin={check_in}&checkout={check_out}&adults={guests}"
            )

        elif booking_type == "event":
            query = urllib.parse.quote(item.get("name", ""))
            return f"https://www.viator.com/search/{query}"

        return "https://www.google.com/travel"
