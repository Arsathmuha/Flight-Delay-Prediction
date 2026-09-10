"""
Real-time weather service for flight delay prediction.
Uses Open-Meteo API (free, no API key needed).
"""

import requests
from datetime import datetime

AIRPORT_COORDS = {
    'ATL': (33.64, -84.43), 'ORD': (41.97, -87.91), 'DFW': (32.90, -97.04),
    'DEN': (39.86, -104.67), 'LAX': (33.94, -118.41), 'JFK': (40.64, -73.78),
    'SFO': (37.62, -122.38), 'SEA': (47.45, -122.31), 'LAS': (36.08, -115.15),
    'MCO': (28.43, -81.31), 'EWR': (40.69, -74.17), 'BOS': (42.36, -71.01),
    'MIA': (25.79, -80.29), 'PHX': (33.43, -112.01), 'IAH': (29.98, -95.34),
    'MSP': (44.88, -93.22), 'DTW': (42.21, -83.35), 'CLT': (35.21, -80.94),
    'LGA': (40.77, -73.87), 'BWI': (39.18, -76.67),
}


def get_weather(airport_code):
    """Fetch current weather for an airport from Open-Meteo (free, no key needed)."""
    coords = AIRPORT_COORDS.get(airport_code)
    if not coords:
        return None

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={coords[0]}&longitude={coords[1]}"
            f"&current=temperature_2m,wind_speed_10m,precipitation,weather_code,visibility"
            f"&temperature_unit=celsius&wind_speed_unit=kmh"
            f"&timezone=auto"
        )
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            current = data.get('current', {})

            weather_code = current.get('weather_code', 0)
            weather_risk = compute_weather_risk(weather_code, current)

            return {
                'airport': airport_code,
                'temperature_c': current.get('temperature_2m'),
                'wind_speed_kmh': current.get('wind_speed_10m'),
                'precipitation_mm': current.get('precipitation', 0),
                'weather_code': weather_code,
                'weather_desc': decode_weather(weather_code),
                'visibility': current.get('visibility'),
                'weather_risk_score': weather_risk,
                'timestamp': current.get('time'),
            }
    except Exception:
        pass

    return None


def compute_weather_risk(code, current):
    """Convert weather code to a delay risk multiplier (0 to 1)."""
    wind = current.get('wind_speed_10m', 0) or 0  # km/h
    precip = current.get('precipitation', 0) or 0

    # WMO weather codes: 0=clear, 1-3=cloudy, 45-48=fog, 51-57=drizzle,
    # 61-67=rain, 71-77=snow, 80-82=showers, 95-99=thunderstorm
    code_risk = 0
    if code == 0:
        code_risk = 0
    elif code <= 3:
        code_risk = 0.02
    elif code <= 48:
        code_risk = 0.15  # fog
    elif code <= 57:
        code_risk = 0.08  # drizzle
    elif code <= 67:
        code_risk = 0.20  # rain
    elif code <= 77:
        code_risk = 0.35  # snow
    elif code <= 82:
        code_risk = 0.25  # showers
    elif code >= 95:
        code_risk = 0.50  # thunderstorm

    wind_risk = min(0.3, wind / 100)  # km/h scale
    precip_risk = min(0.2, precip / 10)

    return round(min(1.0, code_risk + wind_risk + precip_risk), 3)


def decode_weather(code):
    """Convert WMO weather code to description."""
    descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        66: 'Light freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
    }
    return descriptions.get(code, f'Code {code}')


def get_all_weather():
    """Fetch weather for all airports (used for dashboard)."""
    results = {}
    for code in AIRPORT_COORDS:
        w = get_weather(code)
        if w:
            results[code] = w
    return results
