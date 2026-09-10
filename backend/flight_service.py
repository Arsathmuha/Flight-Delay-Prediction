"""
Real-time flight data service using AirLabs API.
Returns actual scheduled/active flights with real flight numbers.
"""

import requests
from datetime import datetime
import os

AIRLABS_KEY = os.environ.get('AIRLABS_KEY', '04ed3510-cfec-4acf-9a13-30116a5144d6')

AIRLINE_NAMES = {
    'AA': 'American Airlines', 'DL': 'Delta Air Lines', 'UA': 'United Airlines',
    'WN': 'Southwest Airlines', 'B6': 'JetBlue Airways', 'AS': 'Alaska Airlines',
    'NK': 'Spirit Airlines', 'F9': 'Frontier Airlines', 'G4': 'Allegiant Air',
    'HA': 'Hawaiian Airlines', 'BA': 'British Airways', 'LH': 'Lufthansa',
    'AF': 'Air France', 'QR': 'Qatar Airways', 'EK': 'Emirates',
    'AC': 'Air Canada', 'AV': 'Avianca', 'CM': 'Copa Airlines',
    'IB': 'Iberia', 'AY': 'Finnair', 'KL': 'KLM', 'SQ': 'Singapore Airlines',
    'CX': 'Cathay Pacific', 'JL': 'Japan Airlines', 'NH': 'ANA',
    'EI': 'Aer Lingus', 'RJ': 'Royal Jordanian', 'G3': 'GOL Airlines',
    'QF': 'Qantas', 'VS': 'Virgin Atlantic', 'SK': 'SAS',
    'OO': 'SkyWest', 'YX': 'Republic Airways', 'MQ': 'Envoy Air',
    '9E': 'Endeavor Air', 'OH': 'PSA Airlines', 'YV': 'Mesa Airlines',
}

CITY_NAMES = {
    'ATL': 'Atlanta', 'ORD': 'Chicago', 'DFW': 'Dallas', 'DEN': 'Denver',
    'LAX': 'Los Angeles', 'JFK': 'New York', 'SFO': 'San Francisco',
    'SEA': 'Seattle', 'LAS': 'Las Vegas', 'MCO': 'Orlando', 'EWR': 'Newark',
    'BOS': 'Boston', 'MIA': 'Miami', 'PHX': 'Phoenix', 'IAH': 'Houston',
    'MSP': 'Minneapolis', 'DTW': 'Detroit', 'CLT': 'Charlotte',
    'LGA': 'New York LGA', 'BWI': 'Baltimore', 'PHL': 'Philadelphia',
    'DCA': 'Washington DC', 'SAN': 'San Diego', 'TPA': 'Tampa',
    'PDX': 'Portland', 'SLC': 'Salt Lake City', 'STL': 'St. Louis',
    'BNA': 'Nashville', 'AUS': 'Austin', 'IND': 'Indianapolis',
    'MCI': 'Kansas City', 'RDU': 'Raleigh', 'CLE': 'Cleveland',
    'PIT': 'Pittsburgh', 'BOG': 'Bogota', 'LHR': 'London',
    'CDG': 'Paris', 'FRA': 'Frankfurt', 'DOH': 'Doha', 'NRT': 'Tokyo',
    'HND': 'Tokyo', 'ICN': 'Seoul', 'HKG': 'Hong Kong', 'SIN': 'Singapore',
    'DUB': 'Dublin', 'AMS': 'Amsterdam', 'MAD': 'Madrid', 'MEX': 'Mexico City',
    'YYZ': 'Toronto', 'YVR': 'Vancouver', 'CUN': 'Cancun', 'SJU': 'San Juan',
}


def get_live_flights(airport_iata):
    """Fetch real scheduled flights from AirLabs API."""
    if not AIRLABS_KEY:
        return None

    try:
        url = "https://airlabs.co/api/v9/schedules"
        params = {
            'dep_iata': airport_iata,
            'api_key': AIRLABS_KEY,
        }
        resp = requests.get(url, params=params, timeout=10)

        if resp.status_code == 200:
            data = resp.json()
            all_flights = data.get('response', [])

            if not all_flights:
                return None

            # Filter: only scheduled/active flights, skip landed/cancelled
            valid_statuses = {'scheduled', 'active'}
            flights = [f for f in all_flights if f.get('status', '') in valid_statuses]

            # If not enough scheduled, include recently active ones
            if len(flights) < 5:
                flights = [f for f in all_flights if f.get('status', '') != 'cancelled']

            # Keep only operating carriers (not codeshares)
            # A codeshare: airline_iata != first 2 chars of flight_iata
            # Also prioritize major carriers for a cleaner board
            MAJOR_CARRIERS = {'AA', 'DL', 'UA', 'WN', 'B6', 'AS', 'NK', 'F9', 'G4', 'HA'}

            def is_operating(f):
                flight_iata = f.get('flight_iata', '')
                airline_iata = f.get('airline_iata', '')
                if not flight_iata or not airline_iata:
                    return False
                return flight_iata[:2] == airline_iata

            flights = [f for f in flights if is_operating(f)]

            # Prefer major US carriers first, then others
            major_flights = [f for f in flights if f.get('airline_iata', '') in MAJOR_CARRIERS]
            other_flights = [f for f in flights if f.get('airline_iata', '') not in MAJOR_CARRIERS]
            flights = major_flights + other_flights

            # Sort by departure time
            flights.sort(key=lambda x: x.get('dep_time', ''))

            # Take upcoming ones
            results = []
            seen_destinations = set()

            for f in flights:
                flight_iata = f.get('flight_iata', '')
                arr_iata = f.get('arr_iata', '')

                # Skip duplicates to same destination (codeshare remnants)
                route_key = f"{arr_iata}"
                if not flight_iata or route_key in seen_destinations:
                    continue
                seen_destinations.add(route_key)

                airline_iata = f.get('airline_iata', 'XX')
                arr_iata = f.get('arr_iata', '')
                dep_time_raw = f.get('dep_time', '')
                status = f.get('status', 'scheduled').upper()

                # Parse departure time
                dep_hour = 12
                dep_time_display = ''
                if dep_time_raw:
                    try:
                        dt = datetime.fromisoformat(dep_time_raw)
                        dep_time_display = dt.strftime('%H:%M')
                        dep_hour = dt.hour
                    except (ValueError, TypeError):
                        if len(dep_time_raw) >= 16:
                            dep_time_display = dep_time_raw[11:16]
                            try:
                                dep_hour = int(dep_time_display[:2])
                            except ValueError:
                                dep_hour = 12

                # Get delay info
                delayed = f.get('delayed', None)
                dep_delayed = f.get('dep_delayed', None)
                actual_delay = dep_delayed or delayed or 0

                # Get gate/terminal
                dep_gate = f.get('dep_gate', '-')
                dep_terminal = f.get('dep_terminal', '-')

                carrier_name = AIRLINE_NAMES.get(airline_iata, airline_iata)
                dest_city = CITY_NAMES.get(arr_iata, arr_iata)

                results.append({
                    'flight_number': flight_iata,
                    'carrier': airline_iata,
                    'carrier_name': carrier_name,
                    'origin': airport_iata,
                    'dest': arr_iata,
                    'dest_city': dest_city,
                    'dep_time': dep_time_display,
                    'dep_hour': dep_hour,
                    'status': status,
                    'actual_delay': actual_delay if actual_delay else 0,
                    'gate': dep_gate or '-',
                    'terminal': dep_terminal or '-',
                    'source': 'airlabs',
                })

                if len(results) >= 15:
                    break

            return results if results else None

    except Exception as e:
        print(f"AirLabs API error: {e}")

    return None
