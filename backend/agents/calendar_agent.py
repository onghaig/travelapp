from datetime import datetime


COLOR_MAP = {
    "flight": "#3B82F6",
    "lodging": "#10B981",
    "event": "#8B5CF6",
}


class CalendarAgent:
    async def run(self, params: dict) -> dict:
        trip_id = params.get("trip_id", "")
        events_input = params.get("events", [])

        processed_events = []
        for i, event in enumerate(events_input):
            color = event.get("color") or COLOR_MAP.get(event.get("type", "event"), "#8B5CF6")
            processed = {
                "id": f"cal_{trip_id}_{i}",
                "trip_id": trip_id,
                "type": event.get("type", "event"),
                "title": event.get("title", ""),
                "start_time": event.get("start_time", ""),
                "end_time": event.get("end_time", ""),
                "location": event.get("location", ""),
                "color": color,
                "metadata": event.get("metadata", {}),
            }
            processed_events.append(processed)

        return {
            "trip_id": trip_id,
            "events": processed_events,
            "total_events": len(processed_events),
        }
