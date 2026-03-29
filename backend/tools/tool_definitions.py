TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_flights",
            "description": "Search for available flights matching the user's criteria. Returns top 3-5 options with prices, times, and airlines.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "IATA airport code"},
                    "destination": {"type": "string", "description": "IATA airport code"},
                    "departure_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "return_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "num_passengers": {"type": "integer"},
                    "preferred_airlines": {"type": "array", "items": {"type": "string"}},
                    "preferred_times": {
                        "type": "string",
                        "enum": ["morning", "afternoon", "evening", "any"],
                    },
                    "max_price": {"type": "number"},
                },
                "required": ["origin", "destination", "departure_date", "num_passengers"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_lodging",
            "description": "Search for hotels and Airbnbs at the destination. Returns top 3-5 options with prices, ratings, and amenities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {"type": "string"},
                    "check_in": {"type": "string"},
                    "check_out": {"type": "string"},
                    "num_guests": {"type": "integer"},
                    "lodging_type": {
                        "type": "string",
                        "enum": ["airbnb", "hotel", "both"],
                    },
                    "max_price_per_night": {"type": "number"},
                },
                "required": ["destination", "check_in", "check_out", "num_guests"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_events",
            "description": "Find activities, restaurants, and experiences at the destination during the trip dates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {"type": "string"},
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "interests": {"type": "array", "items": {"type": "string"}},
                    "max_budget": {"type": "number"},
                },
                "required": ["destination", "start_date", "end_date"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_budget",
            "description": "Validate the current plan against the user's budget. Returns breakdown and overage warnings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "budget_total": {"type": "number"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "category": {"type": "string"},
                                "label": {"type": "string"},
                                "cost": {"type": "number"},
                            },
                        },
                    },
                },
                "required": ["budget_total", "items"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "sync_calendar",
            "description": "Build or update the trip timeline with flights, lodging, and events.",
            "parameters": {
                "type": "object",
                "properties": {
                    "trip_id": {"type": "string"},
                    "events": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "enum": ["flight", "lodging", "event"],
                                },
                                "title": {"type": "string"},
                                "start_time": {"type": "string"},
                                "end_time": {"type": "string"},
                                "location": {"type": "string"},
                                "color": {"type": "string"},
                            },
                        },
                    },
                },
                "required": ["trip_id", "events"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "verify_plan",
            "description": "Run a full review of the itinerary before the booking phase begins. Returns a structured verification report.",
            "parameters": {
                "type": "object",
                "properties": {
                    "trip_id": {"type": "string"},
                    "plan_summary": {"type": "object"},
                },
                "required": ["trip_id", "plan_summary"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_trip_info",
            "description": (
                "Persist trip planning information collected from the user into the trip state. "
                "Call this IMMEDIATELY whenever you learn destination, origin, dates, travelers, "
                "budget, or preferences — do NOT wait to collect everything first. "
                "Omit fields you don't yet know."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "City name or region (e.g. 'Tokyo')"},
                    "origin": {"type": "string", "description": "Departure city or IATA code (e.g. 'New York', 'JFK')"},
                    "departure_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "return_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "num_travelers": {"type": "integer"},
                    "budget_total": {"type": "number", "description": "Total trip budget in USD"},
                    "lodging_type": {"type": "string", "enum": ["airbnb", "hotel", "both"]},
                    "preferred_airlines": {"type": "array", "items": {"type": "string"}},
                    "preferred_times": {"type": "string", "enum": ["morning", "afternoon", "evening", "any"]},
                    "interests": {"type": "array", "items": {"type": "string"}},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "initiate_booking",
            "description": "Begin the automated booking process for a specific item using Playwright.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_type": {
                        "type": "string",
                        "enum": ["flight", "hotel", "airbnb", "event"],
                    },
                    "item_id": {"type": "string"},
                    "traveler_info": {"type": "object"},
                },
                "required": ["booking_type", "item_id", "traveler_info"],
            }
        }
    },
]
