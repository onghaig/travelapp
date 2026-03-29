import random
from datetime import datetime, timedelta
from typing import Optional


AIRLINES = [
    {"code": "AA", "name": "American Airlines"},
    {"code": "UA", "name": "United Airlines"},
    {"code": "DL", "name": "Delta Air Lines"},
    {"code": "BA", "name": "British Airways"},
    {"code": "LH", "name": "Lufthansa"},
    {"code": "AF", "name": "Air France"},
    {"code": "JL", "name": "Japan Airlines"},
    {"code": "NH", "name": "All Nippon Airways"},
    {"code": "SQ", "name": "Singapore Airlines"},
    {"code": "EK", "name": "Emirates"},
    {"code": "CX", "name": "Cathay Pacific"},
    {"code": "KL", "name": "KLM Royal Dutch Airlines"},
]

PEAK_MONTHS = [6, 7, 8, 12]  # June, July, August, December

CITY_AIRPORTS = {
    "tokyo": ["NRT", "HND"],
    "paris": ["CDG", "ORY"],
    "london": ["LHR", "LGW", "STN"],
    "new york": ["JFK", "EWR", "LGA"],
    "los angeles": ["LAX"],
    "chicago": ["ORD", "MDW"],
    "miami": ["MIA"],
    "san francisco": ["SFO"],
    "rome": ["FCO"],
    "barcelona": ["BCN"],
    "amsterdam": ["AMS"],
    "dubai": ["DXB"],
    "singapore": ["SIN"],
    "sydney": ["SYD"],
    "toronto": ["YYZ"],
}

HOTELS = {
    "tokyo": [
        {
            "id": "hotel_tokyo_1",
            "name": "Park Hyatt Tokyo",
            "neighborhood": "Shinjuku",
            "type": "hotel",
            "rating": 4.8,
            "stars": 5,
            "base_price": 480,
            "amenities": ["spa", "pool", "gym", "concierge", "room service"],
            "image_hint": "luxury hotel shinjuku tokyo",
        },
        {
            "id": "hotel_tokyo_2",
            "name": "Aman Tokyo",
            "neighborhood": "Otemachi",
            "type": "hotel",
            "rating": 4.9,
            "stars": 5,
            "base_price": 820,
            "amenities": ["spa", "pool", "gym", "butler service"],
            "image_hint": "aman tokyo luxury",
        },
        {
            "id": "hotel_tokyo_3",
            "name": "Shinjuku Airbnb Apartment",
            "neighborhood": "Shinjuku",
            "type": "airbnb",
            "rating": 4.7,
            "stars": None,
            "base_price": 120,
            "amenities": ["kitchen", "washer", "wifi", "self check-in"],
            "image_hint": "tokyo apartment shinjuku",
        },
        {
            "id": "hotel_tokyo_4",
            "name": "The Tokyo EDITION Toranomon",
            "neighborhood": "Toranomon",
            "type": "hotel",
            "rating": 4.6,
            "stars": 5,
            "base_price": 350,
            "amenities": ["rooftop bar", "gym", "spa", "restaurant"],
            "image_hint": "edition hotel tokyo",
        },
        {
            "id": "hotel_tokyo_5",
            "name": "Harajuku Designer Loft",
            "neighborhood": "Harajuku",
            "type": "airbnb",
            "rating": 4.85,
            "stars": None,
            "base_price": 95,
            "amenities": ["kitchen", "wifi", "near metro", "self check-in"],
            "image_hint": "harajuku tokyo apartment",
        },
    ],
    "paris": [
        {
            "id": "hotel_paris_1",
            "name": "Le Bristol Paris",
            "neighborhood": "8th Arrondissement",
            "type": "hotel",
            "rating": 4.9,
            "stars": 5,
            "base_price": 750,
            "amenities": ["spa", "pool", "michelin restaurant", "concierge"],
            "image_hint": "le bristol paris luxury hotel",
        },
        {
            "id": "hotel_paris_2",
            "name": "Hôtel Plaza Athénée",
            "neighborhood": "Avenue Montaigne",
            "type": "hotel",
            "rating": 4.8,
            "stars": 5,
            "base_price": 680,
            "amenities": ["spa", "dior institute", "bar", "michelin restaurant"],
            "image_hint": "plaza athenee paris",
        },
        {
            "id": "hotel_paris_3",
            "name": "Marais District Studio",
            "neighborhood": "Le Marais",
            "type": "airbnb",
            "rating": 4.75,
            "stars": None,
            "base_price": 110,
            "amenities": ["kitchen", "wifi", "historic building", "self check-in"],
            "image_hint": "marais paris apartment",
        },
        {
            "id": "hotel_paris_4",
            "name": "Hôtel des Grands Boulevards",
            "neighborhood": "2nd Arrondissement",
            "type": "hotel",
            "rating": 4.5,
            "stars": 4,
            "base_price": 220,
            "amenities": ["restaurant", "bar", "rooftop", "gym"],
            "image_hint": "hotel grands boulevards paris",
        },
        {
            "id": "hotel_paris_5",
            "name": "Montmartre Artist Flat",
            "neighborhood": "Montmartre",
            "type": "airbnb",
            "rating": 4.9,
            "stars": None,
            "base_price": 145,
            "amenities": ["kitchen", "wifi", "city view", "workspace"],
            "image_hint": "montmartre paris apartment view",
        },
    ],
    "london": [
        {
            "id": "hotel_london_1",
            "name": "The Savoy",
            "neighborhood": "The Strand",
            "type": "hotel",
            "rating": 4.8,
            "stars": 5,
            "base_price": 620,
            "amenities": ["spa", "pool", "multiple restaurants", "iconic bar"],
            "image_hint": "the savoy london hotel",
        },
        {
            "id": "hotel_london_2",
            "name": "Claridge's",
            "neighborhood": "Mayfair",
            "type": "hotel",
            "rating": 4.9,
            "stars": 5,
            "base_price": 780,
            "amenities": ["spa", "afternoon tea", "restaurant", "bar"],
            "image_hint": "claridges london mayfair",
        },
        {
            "id": "hotel_london_3",
            "name": "Shoreditch Modern Flat",
            "neighborhood": "Shoreditch",
            "type": "airbnb",
            "rating": 4.7,
            "stars": None,
            "base_price": 130,
            "amenities": ["kitchen", "wifi", "near tube", "self check-in"],
            "image_hint": "shoreditch london apartment",
        },
        {
            "id": "hotel_london_4",
            "name": "Ace Hotel London Shoreditch",
            "neighborhood": "Shoreditch",
            "type": "hotel",
            "rating": 4.4,
            "stars": 4,
            "base_price": 250,
            "amenities": ["restaurant", "bar", "gym", "rooftop"],
            "image_hint": "ace hotel london shoreditch",
        },
        {
            "id": "hotel_london_5",
            "name": "Notting Hill Victorian House",
            "neighborhood": "Notting Hill",
            "type": "airbnb",
            "rating": 4.85,
            "stars": None,
            "base_price": 195,
            "amenities": ["garden", "kitchen", "wifi", "washer"],
            "image_hint": "notting hill london victorian house",
        },
    ],
    "new york": [
        {
            "id": "hotel_nyc_1",
            "name": "The Mark Hotel",
            "neighborhood": "Upper East Side",
            "type": "hotel",
            "rating": 4.7,
            "stars": 5,
            "base_price": 590,
            "amenities": ["spa", "restaurant", "bar", "concierge"],
            "image_hint": "the mark hotel new york",
        },
        {
            "id": "hotel_nyc_2",
            "name": "1 Hotel Brooklyn Bridge",
            "neighborhood": "Brooklyn",
            "type": "hotel",
            "rating": 4.6,
            "stars": 5,
            "base_price": 380,
            "amenities": ["rooftop pool", "spa", "restaurant", "bridge view"],
            "image_hint": "1 hotel brooklyn bridge",
        },
        {
            "id": "hotel_nyc_3",
            "name": "West Village Brownstone",
            "neighborhood": "West Village",
            "type": "airbnb",
            "rating": 4.8,
            "stars": None,
            "base_price": 220,
            "amenities": ["kitchen", "wifi", "private entrance", "garden"],
            "image_hint": "west village new york brownstone",
        },
        {
            "id": "hotel_nyc_4",
            "name": "The Standard High Line",
            "neighborhood": "Meatpacking District",
            "type": "hotel",
            "rating": 4.3,
            "stars": 4,
            "base_price": 310,
            "amenities": ["rooftop bar", "pool", "restaurant", "gym"],
            "image_hint": "standard high line hotel new york",
        },
        {
            "id": "hotel_nyc_5",
            "name": "SoHo Loft Apartment",
            "neighborhood": "SoHo",
            "type": "airbnb",
            "rating": 4.65,
            "stars": None,
            "base_price": 280,
            "amenities": ["kitchen", "wifi", "high ceilings", "near subway"],
            "image_hint": "soho new york loft apartment",
        },
    ],
}

EVENTS_DATA = {
    "tokyo": [
        {
            "id": "evt_tokyo_1",
            "name": "Tsukiji Outer Market Food Tour",
            "type": "food",
            "duration_hours": 3,
            "price_per_person": 65,
            "rating": 4.9,
            "description": "Guided tour of Tokyo's famous fish market with tastings",
            "category": "food & drink",
        },
        {
            "id": "evt_tokyo_2",
            "name": "teamLab Borderless Digital Art Museum",
            "type": "culture",
            "duration_hours": 3,
            "price_per_person": 38,
            "rating": 4.8,
            "description": "Immersive digital art installation in Azabudai Hills",
            "category": "arts & culture",
        },
        {
            "id": "evt_tokyo_3",
            "name": "Shinjuku Kabukicho Night Tour",
            "type": "nightlife",
            "duration_hours": 4,
            "price_per_person": 85,
            "rating": 4.6,
            "description": "Guided nightlife tour through Tokyo's entertainment district",
            "category": "nightlife",
        },
        {
            "id": "evt_tokyo_4",
            "name": "Sushi Making Class in Ginza",
            "type": "food",
            "duration_hours": 2,
            "price_per_person": 120,
            "rating": 4.9,
            "description": "Learn to make nigiri sushi from a professional chef",
            "category": "food & drink",
        },
        {
            "id": "evt_tokyo_5",
            "name": "Mt. Fuji Day Trip from Tokyo",
            "type": "outdoor",
            "duration_hours": 12,
            "price_per_person": 95,
            "rating": 4.7,
            "description": "Full-day guided excursion to Mt. Fuji and Hakone",
            "category": "day trips",
        },
    ],
    "paris": [
        {
            "id": "evt_paris_1",
            "name": "Louvre Museum Skip-the-Line Tour",
            "type": "culture",
            "duration_hours": 3,
            "price_per_person": 75,
            "rating": 4.8,
            "description": "Expert-guided tour of the Louvre's masterpieces",
            "category": "arts & culture",
        },
        {
            "id": "evt_paris_2",
            "name": "French Cooking Class & Market Visit",
            "type": "food",
            "duration_hours": 4,
            "price_per_person": 145,
            "rating": 4.9,
            "description": "Visit a local market then cook a 3-course French meal",
            "category": "food & drink",
        },
        {
            "id": "evt_paris_3",
            "name": "Seine River Dinner Cruise",
            "type": "food",
            "duration_hours": 2,
            "price_per_person": 110,
            "rating": 4.6,
            "description": "Evening cruise with gourmet dinner and Eiffel Tower views",
            "category": "food & drink",
        },
        {
            "id": "evt_paris_4",
            "name": "Versailles Palace & Gardens Tour",
            "type": "culture",
            "duration_hours": 6,
            "price_per_person": 89,
            "rating": 4.7,
            "description": "Skip-the-line access to the Palace of Versailles",
            "category": "day trips",
        },
        {
            "id": "evt_paris_5",
            "name": "Montmartre Art & History Walk",
            "type": "culture",
            "duration_hours": 2.5,
            "price_per_person": 35,
            "rating": 4.8,
            "description": "Walking tour of the historic Montmartre neighborhood",
            "category": "arts & culture",
        },
    ],
    "london": [
        {
            "id": "evt_london_1",
            "name": "Tower of London Yeoman Tour",
            "type": "culture",
            "duration_hours": 2,
            "price_per_person": 45,
            "rating": 4.8,
            "description": "Behind-the-scenes tour with a Yeoman Warder",
            "category": "arts & culture",
        },
        {
            "id": "evt_london_2",
            "name": "Borough Market Food Walk",
            "type": "food",
            "duration_hours": 2.5,
            "price_per_person": 55,
            "rating": 4.7,
            "description": "Guided tasting tour of London's famous food market",
            "category": "food & drink",
        },
        {
            "id": "evt_london_3",
            "name": "Harry Potter Warner Bros. Studio Tour",
            "type": "entertainment",
            "duration_hours": 4,
            "price_per_person": 65,
            "rating": 4.9,
            "description": "Official Warner Bros. Studio Tour: The Making of Harry Potter",
            "category": "entertainment",
        },
        {
            "id": "evt_london_4",
            "name": "Afternoon Tea at The Ritz",
            "type": "food",
            "duration_hours": 2,
            "price_per_person": 95,
            "rating": 4.8,
            "description": "Classic afternoon tea in the iconic Palm Court",
            "category": "food & drink",
        },
        {
            "id": "evt_london_5",
            "name": "West End Theatre Show",
            "type": "entertainment",
            "duration_hours": 3,
            "price_per_person": 85,
            "rating": 4.7,
            "description": "Premium seats to a top West End production",
            "category": "entertainment",
        },
    ],
    "new york": [
        {
            "id": "evt_nyc_1",
            "name": "Metropolitan Museum of Art Tour",
            "type": "culture",
            "duration_hours": 3,
            "price_per_person": 30,
            "rating": 4.8,
            "description": "Expert-led tour of the Met's greatest works",
            "category": "arts & culture",
        },
        {
            "id": "evt_nyc_2",
            "name": "NYC Food Tour: Lower East Side",
            "type": "food",
            "duration_hours": 3,
            "price_per_person": 75,
            "rating": 4.9,
            "description": "Taste iconic NYC foods through the Lower East Side",
            "category": "food & drink",
        },
        {
            "id": "evt_nyc_3",
            "name": "Broadway Show Premium Tickets",
            "type": "entertainment",
            "duration_hours": 3,
            "price_per_person": 150,
            "rating": 4.8,
            "description": "Orchestra seats to the hottest Broadway show",
            "category": "entertainment",
        },
        {
            "id": "evt_nyc_4",
            "name": "Brooklyn Bridge & DUMBO Walking Tour",
            "type": "outdoor",
            "duration_hours": 2,
            "price_per_person": 25,
            "rating": 4.7,
            "description": "Walk the Brooklyn Bridge with a local guide",
            "category": "outdoor",
        },
        {
            "id": "evt_nyc_5",
            "name": "NYC Helicopter Tour",
            "type": "outdoor",
            "duration_hours": 1,
            "price_per_person": 230,
            "rating": 4.9,
            "description": "15-minute helicopter tour over Manhattan",
            "category": "outdoor",
        },
    ],
}


def _get_price_multiplier(departure_date: str) -> float:
    try:
        dt = datetime.strptime(departure_date, "%Y-%m-%d")
        if dt.month in PEAK_MONTHS:
            return random.uniform(1.3, 1.7)
        return random.uniform(0.85, 1.15)
    except Exception:
        return 1.0


def _get_destination_key(destination: str) -> str:
    dest_lower = destination.lower()
    for key in HOTELS.keys():
        if key in dest_lower or dest_lower in key:
            return key
    return "new york"


async def search_flights(params: dict) -> dict:
    origin = params.get("origin", "JFK")
    destination = params.get("destination", "NRT")
    departure_date = params.get("departure_date", "2025-07-01")
    return_date = params.get("return_date")
    num_passengers = params.get("num_passengers", 1)
    max_price = params.get("max_price")
    preferred_times = params.get("preferred_times", "any")

    multiplier = _get_price_multiplier(departure_date)

    # Base prices by route distance (rough approximation)
    route_key = f"{origin}-{destination}".upper()
    base_prices = {
        "JFK-NRT": 780, "NRT-JFK": 780,
        "JFK-CDG": 520, "CDG-JFK": 520,
        "JFK-LHR": 490, "LHR-JFK": 490,
        "LAX-NRT": 720, "NRT-LAX": 720,
        "LAX-CDG": 680, "CDG-LAX": 680,
        "ORD-CDG": 550, "CDG-ORD": 550,
        "SFO-NRT": 700, "NRT-SFO": 700,
    }
    base_price = base_prices.get(route_key, 450)

    time_slots = {
        "morning": [(6, 0), (7, 30), (8, 45)],
        "afternoon": [(12, 0), (14, 15), (15, 30)],
        "evening": [(17, 0), (18, 45), (20, 30)],
        "any": [(6, 0), (10, 30), (14, 15), (18, 45), (22, 0)],
    }
    slots = time_slots.get(preferred_times, time_slots["any"])

    # Duration estimates
    durations = {
        "JFK-NRT": "14h 00m", "NRT-JFK": "13h 30m",
        "JFK-CDG": "7h 30m", "CDG-JFK": "8h 15m",
        "JFK-LHR": "7h 00m", "LHR-JFK": "7h 45m",
        "LAX-NRT": "11h 30m", "NRT-LAX": "10h 45m",
    }
    duration = durations.get(route_key, "9h 00m")

    flights = []
    airlines_for_route = random.sample(AIRLINES, min(5, len(AIRLINES)))

    for i, airline in enumerate(airlines_for_route[:4]):
        hour, minute = random.choice(slots)
        dep_time = datetime.strptime(departure_date, "%Y-%m-%d").replace(
            hour=hour, minute=minute
        )
        # Parse duration
        dur_parts = duration.replace("h", "").replace("m", "").split()
        dur_hours = int(dur_parts[0])
        dur_minutes = int(dur_parts[1]) if len(dur_parts) > 1 else 0
        arr_time = dep_time + timedelta(hours=dur_hours, minutes=dur_minutes)

        price_variation = random.uniform(0.85, 1.25)
        price = round(base_price * multiplier * price_variation * num_passengers)

        stops = 0 if price_variation > 1.1 else random.choice([0, 1])
        stop_city = None
        if stops == 1:
            stop_cities = {
                "JFK-NRT": "Chicago (ORD)", "JFK-CDG": "Reykjavik (KEF)",
                "LAX-NRT": "Seattle (SEA)", "default": "Atlanta (ATL)"
            }
            stop_city = stop_cities.get(route_key, stop_cities["default"])

        if max_price and price > max_price:
            continue

        flight = {
            "id": f"flight_{i+1}_{airline['code']}",
            "airline": airline["name"],
            "airline_code": airline["code"],
            "flight_number": f"{airline['code']}{random.randint(100, 999)}",
            "origin": origin,
            "destination": destination,
            "departure_time": dep_time.isoformat(),
            "arrival_time": arr_time.isoformat(),
            "duration": duration,
            "stops": stops,
            "stop_city": stop_city,
            "price_per_person": round(price / num_passengers),
            "total_price": price,
            "cabin_class": "economy",
            "baggage_included": stops == 0,
            "booking_url_params": {
                "origin": origin,
                "destination": destination,
                "date": departure_date,
                "return_date": return_date,
                "adults": num_passengers,
                "airline": airline["code"],
            },
        }
        flights.append(flight)

    flights.sort(key=lambda x: x["total_price"])

    # PHASE2: Replace with real Amadeus API call
    # amadeus_client.shopping.flight_offers_search.get(...)
    return {
        "flights": flights[:4],
        "search_params": params,
        "currency": "USD",
    }


async def search_lodging(params: dict) -> dict:
    destination = params.get("destination", "Tokyo")
    check_in = params.get("check_in", "2025-07-01")
    check_out = params.get("check_out", "2025-07-07")
    num_guests = params.get("num_guests", 1)
    lodging_type = params.get("lodging_type", "both")
    max_price_per_night = params.get("max_price_per_night")

    dest_key = _get_destination_key(destination)
    available = HOTELS.get(dest_key, HOTELS["new york"])

    # Filter by type
    if lodging_type == "hotel":
        available = [h for h in available if h["type"] == "hotel"]
    elif lodging_type == "airbnb":
        available = [h for h in available if h["type"] == "airbnb"]

    # Calculate nights
    try:
        checkin_dt = datetime.strptime(check_in, "%Y-%m-%d")
        checkout_dt = datetime.strptime(check_out, "%Y-%m-%d")
        nights = max(1, (checkout_dt - checkin_dt).days)
    except Exception:
        nights = 5

    multiplier = _get_price_multiplier(check_in)
    results = []

    for lodging in available:
        price_per_night = round(lodging["base_price"] * multiplier * random.uniform(0.9, 1.1))

        if num_guests > 2:
            price_per_night = round(price_per_night * 1.1)

        if max_price_per_night and price_per_night > max_price_per_night:
            continue

        total_price = price_per_night * nights

        result = {
            "id": lodging["id"],
            "name": lodging["name"],
            "type": lodging["type"],
            "neighborhood": lodging["neighborhood"],
            "destination": destination,
            "rating": lodging["rating"],
            "stars": lodging["stars"],
            "price_per_night": price_per_night,
            "total_price": total_price,
            "nights": nights,
            "check_in": check_in,
            "check_out": check_out,
            "amenities": lodging["amenities"],
            "max_guests": 2 + (1 if lodging["type"] == "airbnb" else 0),
            "booking_url_params": {
                "destination": destination,
                "check_in": check_in,
                "check_out": check_out,
                "guests": num_guests,
                "property_id": lodging["id"],
            },
        }
        results.append(result)

    results.sort(key=lambda x: x["total_price"])

    # PHASE2: Replace with real hotel/Airbnb API calls
    return {
        "lodging": results[:4],
        "search_params": params,
        "currency": "USD",
        "nights": nights,
    }


async def find_events(params: dict) -> dict:
    destination = params.get("destination", "Tokyo")
    start_date = params.get("start_date", "2025-07-01")
    end_date = params.get("end_date", "2025-07-07")
    interests = params.get("interests", [])
    max_budget = params.get("max_budget")

    dest_key = _get_destination_key(destination)
    available = EVENTS_DATA.get(dest_key, EVENTS_DATA["new york"])

    results = []
    for event in available:
        if max_budget and event["price_per_person"] > max_budget:
            continue

        result = {
            "id": event["id"],
            "name": event["name"],
            "type": event["type"],
            "category": event["category"],
            "description": event["description"],
            "duration_hours": event["duration_hours"],
            "price_per_person": event["price_per_person"],
            "rating": event["rating"],
            "destination": destination,
            "booking_url_params": {
                "event_id": event["id"],
                "destination": destination,
                "date": start_date,
            },
        }
        results.append(result)

    # PHASE2: Replace with real Google Places API call
    # places_client.find_place(...)
    return {
        "events": results,
        "search_params": params,
        "currency": "USD",
    }
