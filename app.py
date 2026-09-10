"""
Flask API for Flight Delay Prediction.
Serves predictions, SHAP explanations, and analytics data.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import json
import numpy as np
import math
import os
from datetime import datetime

try:
    from weather_service import get_weather, get_all_weather
    WEATHER_ENABLED = True
except ImportError:
    WEATHER_ENABLED = False

try:
    from flight_service import get_live_flights
    FLIGHTS_ENABLED = True
except ImportError:
    FLIGHTS_ENABLED = False

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

# Load model and artifacts
import xgboost as xgb

_booster_path = os.path.join(MODEL_DIR, 'xgb_booster.json')
if os.path.exists(_booster_path):
    _booster = xgb.Booster()
    _booster.load_model(_booster_path)
    USE_BOOSTER = True
else:
    with open(os.path.join(MODEL_DIR, 'xgb_model.pkl'), 'rb') as f:
        model = pickle.load(f)
    USE_BOOSTER = False

# Load encoders - prefer JSON (no sklearn needed) over pickle
_enc_json_path = os.path.join(MODEL_DIR, 'encoders_simple.json')
if os.path.exists(_enc_json_path):
    with open(_enc_json_path, 'r') as f:
        _raw_enc = json.load(f)

    class DictEncoder:
        def __init__(self, mapping):
            self._map = mapping
        def transform(self, values):
            return [self._map.get(v, 0) for v in values]

    encoders = {k: DictEncoder(v) for k, v in _raw_enc.items()}
else:
    with open(os.path.join(MODEL_DIR, 'encoders.pkl'), 'rb') as f:
        encoders = pickle.load(f)


class _BoosterWrapper:
    """Wraps XGBoost Booster to provide predict_proba and get_booster interface."""
    def __init__(self, booster, feature_names):
        self._booster = booster
        self._feature_names = feature_names

    def predict_proba(self, features):
        import numpy as np
        dmat = xgb.DMatrix(features, feature_names=self._feature_names)
        preds = self._booster.predict(dmat)
        return np.column_stack([1 - preds, preds])

    def get_booster(self):
        return self._booster

with open(os.path.join(MODEL_DIR, 'feature_cols.json'), 'r') as f:
    feature_cols = json.load(f)

if USE_BOOSTER:
    model = _BoosterWrapper(_booster, feature_cols)

with open(os.path.join(MODEL_DIR, 'metrics.json'), 'r') as f:
    metrics = json.load(f)

with open(os.path.join(MODEL_DIR, 'stats.json'), 'r') as f:
    stats = json.load(f)



# ==================== INDIAN MODEL ====================
_india_booster_path = os.path.join(MODEL_DIR, 'xgb_booster_india.json')
_india_enc_path = os.path.join(MODEL_DIR, 'encoders_india.json')
INDIA_MODEL_AVAILABLE = False

if os.path.exists(_india_booster_path) and os.path.exists(_india_enc_path):
    _india_booster = xgb.Booster()
    _india_booster.load_model(_india_booster_path)

    with open(_india_enc_path, 'r') as f:
        _india_raw_enc = json.load(f)
    india_encoders = {k: DictEncoder(v) for k, v in _india_raw_enc.items()}

    INDIA_FEATURE_NAMES = [
        'carrier', 'origin', 'dest', 'dep_hour', 'day_of_week', 'month',
        'aircraft_leg_number', 'cumulative_fatigue_min', 'turnaround_time_min',
        'prior_leg_delay'
    ]
    india_model = _BoosterWrapper(_india_booster, INDIA_FEATURE_NAMES)
    INDIA_MODEL_AVAILABLE = True
    print(f"Indian model loaded from {_india_booster_path}")


CARRIERS = {
    'AA': 'American Airlines', 'DL': 'Delta Air Lines', 'UA': 'United Airlines',
    'WN': 'Southwest Airlines', 'B6': 'JetBlue Airways', 'AS': 'Alaska Airlines',
    'NK': 'Spirit Airlines', 'F9': 'Frontier Airlines', 'G4': 'Allegiant Air',
    'HA': 'Hawaiian Airlines'
}

AIRPORTS = {
    'ATL': ('Atlanta', 0.92), 'ORD': ('Chicago', 0.88), 'DFW': ('Dallas', 0.85),
    'DEN': ('Denver', 0.82), 'LAX': ('Los Angeles', 0.80), 'JFK': ('New York JFK', 0.87),
    'SFO': ('San Francisco', 0.84), 'SEA': ('Seattle', 0.78), 'LAS': ('Las Vegas', 0.75),
    'MCO': ('Orlando', 0.76), 'EWR': ('Newark', 0.90), 'BOS': ('Boston', 0.83),
    'MIA': ('Miami', 0.81), 'PHX': ('Phoenix', 0.74), 'IAH': ('Houston', 0.79),
    'MSP': ('Minneapolis', 0.80), 'DTW': ('Detroit', 0.82), 'CLT': ('Charlotte', 0.78),
    'LGA': ('LaGuardia', 0.91), 'BWI': ('Baltimore', 0.77),
}

INDIA_CARRIERS = {
    '6E': 'IndiGo', 'AI': 'Air India', 'SG': 'SpiceJet', 'UK': 'Vistara',
    'G8': 'GoFirst', 'I5': 'AirAsia India', 'QP': 'Akasa Air', 'IX': 'Air India Express'
}

INDIA_AIRPORTS = {
    'DEL': ('New Delhi', 0.90), 'BOM': ('Mumbai', 0.85), 'BLR': ('Bangalore', 0.75),
    'HYD': ('Hyderabad', 0.60), 'MAA': ('Chennai', 0.65), 'CCU': ('Kolkata', 0.60),
    'GOI': ('Goa', 0.30), 'PNQ': ('Pune', 0.50), 'AMD': ('Ahmedabad', 0.45),
    'COK': ('Kochi', 0.40), 'JAI': ('Jaipur', 0.35), 'LKO': ('Lucknow', 0.35),
    'PAT': ('Patna', 0.30), 'GAU': ('Guwahati', 0.25), 'IXC': ('Chandigarh', 0.25),
    'TRV': ('Thiruvananthapuram', 0.30), 'VNS': ('Varanasi', 0.20),
    'IXR': ('Ranchi', 0.20), 'BBI': ('Bhubaneswar', 0.25), 'SXR': ('Srinagar', 0.20),
    'IXM': ('Madurai', 0.25),
}

def is_india_flight(carrier, origin, dest):
    """Check if this is an Indian domestic flight."""
    return carrier in INDIA_CARRIERS or origin in INDIA_AIRPORTS or dest in INDIA_AIRPORTS


def calibrate_probability(raw_prob, dep_hour=12, carrier='AA', month=6, day_of_week=3, origin_congestion=0.80):
    """
    Blend model output with scenario-based prior for realistic predictions.
    BTS data: overall ~20% delay rate. Morning ~12%, afternoon ~22%,
    evening ~35%, late night ~45%. Model alone is too binary due to
    prior_leg_delay dominance, so we blend with empirical priors.
    """
    # Time-of-day base risk (from BTS statistics)
    if dep_hour < 9:
        time_prior = 0.10
    elif dep_hour < 12:
        time_prior = 0.15
    elif dep_hour < 15:
        time_prior = 0.22
    elif dep_hour < 18:
        time_prior = 0.30
    elif dep_hour < 21:
        time_prior = 0.38
    else:
        time_prior = 0.45

    # Carrier reliability modifier
    carrier_mod = {
        'NK': 1.5, 'F9': 1.4, 'G4': 1.35, 'B6': 1.2, 'OO': 1.25,
        'EV': 1.25, 'MQ': 1.15, 'UA': 1.05, 'AA': 1.0,
        'WN': 0.9, 'US': 0.9, 'AS': 0.75, 'VX': 0.75, 'HA': 0.7, 'DL': 0.8
    }.get(carrier, 1.0)

    # Season modifier
    season_mod = 1.2 if month in [12, 1, 2] else (1.1 if month in [6, 7, 8] else 0.9)

    # Congestion modifier
    cong_mod = 1.0 + max(0, (origin_congestion - 0.80)) * 1.5

    # Weekend modifier
    weekend_mod = 1.1 if day_of_week in [5, 6, 7] else 0.95

    # Compute scenario prior (capped at 0.75)
    scenario_prior = min(0.75, time_prior * carrier_mod * season_mod * cong_mod * weekend_mod)

    # Model provides directional signal (±20%) on top of scenario prior
    if raw_prob >= 0.6:
        blended = scenario_prior * 1.2
    elif raw_prob <= 0.25:
        blended = scenario_prior * 0.8
    else:
        blended = scenario_prior

    return max(0.04, min(0.88, blended))


def calibrate_probability_india(raw_prob, dep_hour=12, carrier='6E', month=6, day_of_week=3, origin='DEL'):
    """
    Calibration for Indian domestic flights.
    DGCA data: overall ~22% delay rate. Delhi winter fog: 40-60%. Monsoon: 25-35%.
    """
    # Time-of-day base risk (Indian patterns: fog mornings, monsoon afternoons)
    if dep_hour < 8:
        time_prior = 0.25  # Early morning fog risk
    elif dep_hour < 11:
        time_prior = 0.15
    elif dep_hour < 14:
        time_prior = 0.18
    elif dep_hour < 17:
        time_prior = 0.22  # Afternoon storms
    elif dep_hour < 20:
        time_prior = 0.30  # Evening congestion
    else:
        time_prior = 0.35  # Late night cascading

    # Carrier modifier (DGCA OTP data)
    carrier_mod = {
        'G8': 1.6, 'SG': 1.5, 'I5': 1.3, 'AI': 1.35, 'IX': 1.2,
        '6E': 1.0, 'QP': 0.9, 'UK': 0.75
    }.get(carrier, 1.0)

    # Season modifier (India-specific: fog + monsoon)
    if month in [12, 1]:  # Peak fog
        season_mod = 1.8
        if origin in ['DEL', 'LKO', 'PAT', 'VNS', 'GAU', 'IXC', 'AMD'] and dep_hour < 10:
            season_mod = 2.5  # Delhi fog morning
    elif month == 2:
        season_mod = 1.3
    elif month in [6, 7, 8, 9]:  # Monsoon
        season_mod = 1.5
        if origin in ['BOM', 'CCU', 'COK', 'TRV', 'GOI']:  # Coastal = heavier rain
            season_mod = 1.8
    else:
        season_mod = 0.85

    # Congestion
    origin_cong = INDIA_AIRPORTS.get(origin, ('', 0.40))[1]
    cong_mod = 1.0 + max(0, (origin_cong - 0.50)) * 1.2

    # Weekend
    weekend_mod = 1.1 if day_of_week in [4, 6] else 0.95  # Friday, Sunday

    scenario_prior = min(0.80, time_prior * carrier_mod * season_mod * cong_mod * weekend_mod)

    # Blend with model output
    if raw_prob >= 0.6:
        blended = scenario_prior * 1.15
    elif raw_prob <= 0.25:
        blended = scenario_prior * 0.85
    else:
        blended = scenario_prior * (0.9 + raw_prob * 0.3)

    return max(0.05, min(0.90, blended))


def build_features_india(carrier, origin, dest, dep_hour, day_of_week, month):
    """Build feature vector for Indian model."""
    import random

    carrier_enc = india_encoders['carrier'].transform([carrier])[0]
    origin_enc = india_encoders['origin'].transform([origin])[0]
    dest_enc = india_encoders['dest'].transform([dest])[0]

    # Simulate operational features (same logic as US model)
    if dep_hour < 8:
        aircraft_leg = random.choice([1, 2])
    elif dep_hour < 14:
        aircraft_leg = random.choice([2, 3, 4])
    else:
        aircraft_leg = random.choice([3, 4, 5])

    base_flight_time = random.randint(60, 180)
    cumulative_fatigue = base_flight_time * (aircraft_leg - 1) + random.randint(-15, 15)
    cumulative_fatigue = max(0, cumulative_fatigue)

    # Budget carriers have shorter turnarounds
    if carrier in ['6E', 'SG', 'I5', 'G8', 'QP']:
        turnaround = random.randint(25, 40)
    else:
        turnaround = random.randint(35, 55)

    # Prior leg delay probability increases with leg number and time of day
    prior_leg_prob = min(0.8, (aircraft_leg - 1) * 0.12 + dep_hour * 0.02)
    prior_leg_delay = 1 if random.random() < prior_leg_prob else 0

    features = np.array([[
        carrier_enc, origin_enc, dest_enc,
        dep_hour, day_of_week, month,
        aircraft_leg, cumulative_fatigue, turnaround, prior_leg_delay
    ]])

    origin_cong = INDIA_AIRPORTS.get(origin, ('', 0.40))[1]
    prop_risk = min(0.95, prior_leg_delay * 0.7 + aircraft_leg * 0.05 + dep_hour * 0.01)

    # Estimate taxi time based on airport congestion
    taxi_out = 12 + origin_cong * 15 + random.uniform(-2, 2)

    # Approximate distance for Indian routes (km converted to miles)
    india_distances = {
        ('DEL', 'BOM'): 708, ('DEL', 'BLR'): 1090, ('DEL', 'HYD'): 790,
        ('DEL', 'MAA'): 1070, ('DEL', 'CCU'): 810, ('DEL', 'GOI'): 930,
        ('BOM', 'BLR'): 500, ('BOM', 'HYD'): 380, ('BOM', 'CCU'): 1030,
        ('BOM', 'DEL'): 708, ('BLR', 'DEL'): 1090, ('BLR', 'HYD'): 310,
    }
    distance = india_distances.get((origin, dest), random.randint(400, 1200))

    computed = {
        'aircraft_leg_number': aircraft_leg,
        'leg_number': aircraft_leg,
        'cumulative_fatigue_min': cumulative_fatigue,
        'turnaround_time_min': turnaround,
        'prior_leg_delay': prior_leg_delay,
        'fuel_load_factor': round(0.3 + aircraft_leg * 0.1 + random.uniform(-0.05, 0.05), 2),
        'refuel_time_min': turnaround - random.randint(5, 15),
        'propagation_risk': prop_risk,
        'origin_congestion': origin_cong,
        'time_since_last_flight': turnaround,
        'taxi_out': taxi_out,
        'distance': distance,
    }

    return features, computed


def build_features(carrier, origin, dest, dep_hour, day_of_week, month):
    """Build feature vector from flight params. System auto-computes operational features."""
    # Convert 0-6 (Mon=0, Sun=6) to 1-7 (Mon=1, Sun=7) to match training data
    day_of_week = max(1, min(7, day_of_week + 1))
    origin_congestion = AIRPORTS.get(origin, ('', 0.80))[1]
    dest_congestion = AIRPORTS.get(dest, ('', 0.80))[1]

    # Distance estimate (based on typical US route distances)
    ROUTE_DISTANCES = {
        ('JFK', 'LAX'): 2475, ('ATL', 'ORD'): 606, ('ORD', 'DEN'): 888,
        ('DFW', 'JFK'): 1391, ('LAX', 'SFO'): 337, ('EWR', 'MIA'): 1085,
        ('ORD', 'LAX'): 1745, ('ATL', 'MIA'): 594, ('DEN', 'LAX'): 862,
        ('JFK', 'SFO'): 2586, ('SEA', 'LAX'): 954, ('BOS', 'JFK'): 187,
        ('ATL', 'LAX'): 1946, ('DEN', 'SFO'): 967, ('ORD', 'JFK'): 740,
        ('DFW', 'LAX'): 1235, ('MIA', 'JFK'): 1089, ('SEA', 'SFO'): 679,
    }
    distance = ROUTE_DISTANCES.get((origin, dest),
               ROUTE_DISTANCES.get((dest, origin),
               abs(hash(origin + dest) % 2000) + 300))

    # Prior leg delay: estimate based on time of day + carrier patterns.
    # BTS data shows: avg LATE_AIRCRAFT_DELAY = 26 min WHEN it occurs,
    # but it only occurs for ~20% of flights. We estimate the EXPECTED value.
    carrier_delay_mult = {
        'NK': 1.6, 'F9': 1.5, 'G4': 1.4, 'B6': 1.2, 'OO': 1.3,
        'EV': 1.3, 'MQ': 1.2, 'UA': 1.0, 'AA': 0.9,
        'WN': 0.8, 'US': 0.8, 'AS': 0.5, 'VX': 0.5, 'HA': 0.4, 'DL': 0.5
    }
    cm = carrier_delay_mult.get(carrier, 1.0)

    if dep_hour >= 21:
        base_prior = 7
    elif dep_hour >= 18:
        base_prior = 5
    elif dep_hour >= 15:
        base_prior = 2.5
    elif dep_hour >= 11:
        base_prior = 0.5
    else:
        base_prior = 0

    # Congested airports amplify prior delays
    cong_boost = max(0, (origin_congestion - 0.84)) * 8
    # Winter/summer weather adds to prior delay likelihood
    season_boost = 1.5 if month in [12, 1, 2] else (1.0 if month in [6, 7, 8] else 0)
    # Weekend travel volume
    weekend_boost = 0.5 if day_of_week in [5, 6, 7] else 0

    # Morning flights: aircraft was parked overnight, no prior leg delay
    if dep_hour < 9:
        prior_leg_delay = 0
    elif dep_hour < 11:
        prior_leg_delay = (base_prior + cong_boost * 0.05) * cm
    else:
        prior_leg_delay = (base_prior + cong_boost + season_boost + weekend_boost) * cm

    # Compute propagation risk score separately for display/reasons (not fed to model)
    carrier_base_prob = {
        'NK': 0.28, 'F9': 0.26, 'G4': 0.25, 'OO': 0.24, 'EV': 0.24,
        'MQ': 0.23, 'B6': 0.22, 'UA': 0.20, 'AA': 0.19,
        'WN': 0.18, 'US': 0.17, 'AS': 0.15, 'VX': 0.14, 'HA': 0.12, 'DL': 0.14
    }
    if dep_hour >= 20:
        time_mult = 1.8
    elif dep_hour >= 17:
        time_mult = 1.5
    elif dep_hour >= 14:
        time_mult = 1.2
    elif dep_hour >= 10:
        time_mult = 1.0
    else:
        time_mult = 0.3

    cong_mult = 1.0 + max(0, origin_congestion - 0.75) * 2.0
    season_mult = 1.3 if month in [12, 1, 2] else (1.15 if month in [6, 7, 8] else 0.9)
    propagation_risk = min(0.55, carrier_base_prob.get(carrier, 0.20) * time_mult * cong_mult * season_mult)

    # Taxi out: training data mean=17, median=14, P90=28
    base_taxi = 10 + origin_congestion * 12
    if dep_hour >= 16 and dep_hour <= 20:
        base_taxi += 4  # Rush hour taxi queues
    taxi_out = min(35, base_taxi)

    # Encode categoricals
    try:
        carrier_enc = encoders['carrier'].transform([carrier])[0]
    except (ValueError, KeyError):
        carrier_enc = 0
    try:
        origin_enc = encoders['origin'].transform([origin])[0]
    except (ValueError, KeyError):
        origin_enc = 0
    try:
        dest_enc = encoders['dest'].transform([dest])[0]
    except (ValueError, KeyError):
        dest_enc = 0

    is_evening = int(dep_hour >= 18)
    is_winter = int(month in [12, 1, 2])
    is_summer = int(month in [6, 7, 8])
    is_weekend = int(day_of_week in [6, 7])
    route_congestion = origin_congestion + dest_congestion
    dep_hour_sin = np.sin(2 * np.pi * dep_hour / 24)
    dep_hour_cos = np.cos(2 * np.pi * dep_hour / 24)
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)

    # NEW: Fuel Load Factor
    # Estimate fuel based on distance and estimated air time
    est_air_time = distance / 8.0  # avg ~8 miles per minute
    burn_rate = 30 if distance > 1500 else 12  # widebody vs narrowbody
    fuel_load = (burn_rate * est_air_time) * 1.1 + (burn_rate * 45)  # +reserves
    refuel_time_min = fuel_load / 800  # pump rate
    fuel_load_factor = min(1.0, fuel_load / 25000)  # normalized

    # NEW: Aircraft Utilization Fatigue
    # Later flights = higher leg number (aircraft has been flying all day)
    # Estimate: first flight ~6AM, each leg ~2.5hrs apart
    est_leg_number = max(1, min(8, (dep_hour - 5) / 2.5 + 1))
    leg_number_norm = min(1.0, est_leg_number / 8.0)

    # Cumulative fatigue: accumulated air time before this leg
    cumulative_fatigue = max(0, (est_leg_number - 1) * est_air_time * 0.7)
    fatigue_norm = min(1.0, cumulative_fatigue / 600)

    # Time since last flight (turnaround): shorter at busy times
    if dep_hour >= 16:
        time_since_last = 30  # tight turnarounds in evening
    elif dep_hour >= 10:
        time_since_last = 45
    else:
        time_since_last = 90  # morning = fresh from overnight

    features = np.array([[
        carrier_enc, origin_enc, dest_enc, dep_hour, day_of_week, month,
        distance, origin_congestion, dest_congestion, prior_leg_delay,
        taxi_out, is_evening, is_winter, is_summer, is_weekend,
        route_congestion, dep_hour_sin, dep_hour_cos, month_sin, month_cos,
        fuel_load_factor, refuel_time_min,
        leg_number_norm, fatigue_norm, time_since_last,
    ]])

    return features, {
        'origin_congestion': origin_congestion,
        'dest_congestion': dest_congestion,
        'prior_leg_delay': prior_leg_delay,
        'propagation_risk': propagation_risk,
        'distance': distance,
        'taxi_out': taxi_out,
        'fuel_load_factor': fuel_load_factor,
        'refuel_time_min': refuel_time_min,
        'leg_number': int(est_leg_number),
        'cumulative_fatigue_min': round(cumulative_fatigue),
        'time_since_last_flight': time_since_last,
    }


@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json

    carrier = data.get('carrier', 'AA')
    origin = data.get('origin', 'ATL')
    dest = data.get('dest', 'LAX')
    dep_hour = int(data.get('dep_hour', 12))
    day_of_week = int(data.get('day_of_week', 0))
    month = int(data.get('month', 6))

    # Route to India model if Indian carrier/airport detected
    use_india = INDIA_MODEL_AVAILABLE and is_india_flight(carrier, origin, dest)

    if use_india:
        features, computed = build_features_india(carrier, origin, dest, dep_hour, day_of_week, month)
        raw_prob = float(india_model.predict_proba(features)[0][1])
        prob = calibrate_probability_india(raw_prob, dep_hour, carrier, month, day_of_week, origin)
    else:
        features, computed = build_features(carrier, origin, dest, dep_hour, day_of_week, month)
        raw_prob = float(model.predict_proba(features)[0][1])
        origin_congestion = AIRPORTS.get(origin, ('', 0.80))[1]
        prob = calibrate_probability(raw_prob, dep_hour, carrier, month, day_of_week, origin_congestion)

    # Adjust with real-time weather if available
    weather_data = None
    if WEATHER_ENABLED:
        weather_data = get_weather(origin)
        if weather_data:
            risk_score = weather_data['weather_risk_score']
            if risk_score > 0.10:
                weather_boost = (risk_score - 0.10) * 0.20
                prob = min(0.95, prob + weather_boost)
            computed['weather_risk'] = risk_score

    if prob >= 0.40:
        risk_level = 'HIGH'
        action = 'Proactive rebooking recommended. Alert crew scheduling and notify passengers of potential delay.'
    elif prob >= 0.20:
        risk_level = 'MEDIUM'
        action = 'Monitor flight closely. Prepare backup crew and gate assignments.'
    else:
        risk_level = 'LOW'
        action = 'No action needed. Flight expected to depart on time.'

    # Estimate delay duration (minutes) based on BTS averages
    # BTS data: when delayed, avg=45min, median=25min. Duration correlates with
    # time of day, carrier, and congestion. We estimate the EXPECTED delay
    # (probability × duration-if-delayed).
    carrier_avg_delay = {
        'NK': 55, 'F9': 52, 'G4': 50, 'B6': 45, 'OO': 48,
        'EV': 47, 'MQ': 44, 'UA': 40, 'AA': 38,
        'WN': 35, 'US': 35, 'AS': 32, 'VX': 30, 'HA': 28, 'DL': 33,
        # Indian carriers (DGCA data)
        'G8': 58, 'SG': 52, 'AI': 48, 'I5': 45, 'IX': 42,
        '6E': 38, 'QP': 35, 'UK': 30,
    }
    base_delay_min = carrier_avg_delay.get(carrier, 40)
    # Evening delays tend to be longer (cascading)
    if dep_hour >= 20:
        base_delay_min = int(base_delay_min * 1.4)
    elif dep_hour >= 17:
        base_delay_min = int(base_delay_min * 1.2)
    # Winter storms cause longer delays
    if month in [12, 1, 2]:
        base_delay_min = int(base_delay_min * 1.15)
    # Congested airports add taxi/gate hold time
    origin_cong = INDIA_AIRPORTS.get(origin, AIRPORTS.get(origin, ('', 0.80)))[1]
    if origin_cong >= 0.85:
        base_delay_min += 10

    # Expected delay = probability × typical duration when delayed
    if prob >= 0.40:
        delay_min_low = max(15, int(base_delay_min * 0.6))
        delay_min_high = int(base_delay_min * 1.3)
    elif prob >= 0.25:
        delay_min_low = 15
        delay_min_high = int(base_delay_min * 0.7)
    else:
        delay_min_low = 0
        delay_min_high = 0

    # Feature contribution explanations (based on real BTS delay cause analysis)
    contributions = {}
    prop_risk = computed['propagation_risk']
    cong = computed['origin_congestion']

    # Late Aircraft (Cascade Propagation) — #1 cause from BTS data (avg 26 min)
    contributions['Late Aircraft (Cascade)'] = round(prop_risk * 0.25, 3)

    # Airline Operations — #2 cause (avg 17.8 min): crew, maintenance, fueling
    carrier_ops_scores = {'NK': 0.09, 'F9': 0.08, 'G4': 0.07, 'B6': 0.05, 'OO': 0.06,
                          'EV': 0.06, 'MQ': 0.05, 'UA': 0.03, 'AA': 0.02,
                          'WN': 0.01, 'US': 0.01, 'AS': -0.02, 'VX': -0.02, 'HA': -0.03, 'DL': -0.04,
                          'G8': 0.09, 'SG': 0.08, 'AI': 0.06, 'I5': 0.05, 'IX': 0.04,
                          '6E': 0.02, 'QP': 0.01, 'UK': -0.03}
    contributions['Airline Operations'] = carrier_ops_scores.get(carrier, 0.02)

    # Air Traffic Control (NAS/Air System) — #3 cause (avg 14 min)
    if cong >= 0.88:
        contributions['ATC / Air System'] = round((cong - 0.75) * 0.4, 3)
    elif cong >= 0.80:
        contributions['ATC / Air System'] = round((cong - 0.75) * 0.25, 3)
    else:
        contributions['ATC / Air System'] = 0.005

    # Weather — #4 cause (avg 2.8 min but causes worst delays when it hits)
    if month in [12, 1, 2]:
        contributions['Weather (Seasonal)'] = 0.06
    elif month in [6, 7, 8]:
        contributions['Weather (Seasonal)'] = 0.04
    else:
        contributions['Weather (Seasonal)'] = -0.02

    # Time of day effect (accumulating delays)
    if dep_hour >= 20:
        contributions['Time-of-Day Effect'] = 0.10
    elif dep_hour >= 18:
        contributions['Time-of-Day Effect'] = 0.07
    elif dep_hour >= 14:
        contributions['Time-of-Day Effect'] = 0.03
    else:
        contributions['Time-of-Day Effect'] = -0.04

    # Taxi/Ground Operations
    taxi = computed.get('taxi_out', 15)
    contributions['Ground Operations (Taxi)'] = round((taxi - 15) / 100, 3)

    # Day of week (1=Mon, 7=Sun; 5=Fri, 6=Sat, 7=Sun)
    if day_of_week in [6, 7]:
        contributions['Day of Week (Weekend)'] = 0.02
    elif day_of_week in [2, 3, 4]:
        contributions['Day of Week (Midweek)'] = -0.02
    else:
        contributions['Day of Week'] = 0.01

    # Generate human-readable delay reasons (all 5 BTS categories)
    delay_reasons = []

    # 1. LATE AIRCRAFT / CASCADE PROPAGATION (biggest factor)
    if prop_risk >= 0.35:
        delay_reasons.append({
            'reason': 'High cascade delay propagation risk',
            'detail': f'Based on carrier history, time of day, and hub congestion, there is a {round(prop_risk*100)}% chance the inbound aircraft arrives late. Late aircraft is the #1 cause of US flight delays (avg 26 min when it occurs). Delays propagate through connected flights all day.',
            'impact': 'high',
            'category': 'late_aircraft'
        })
    elif prop_risk >= 0.18:
        delay_reasons.append({
            'reason': 'Moderate cascade propagation risk',
            'detail': f'Aircraft rotation has a {round(prop_risk*100)}% probability of running late based on carrier patterns and time of day. Delays compound at hub airports during peak hours.',
            'impact': 'medium',
            'category': 'late_aircraft'
        })

    # 2. AIRLINE OPERATIONS (crew, maintenance, baggage, fueling)
    carrier_detail = {
        'NK': ('Spirit Airlines — tight turnaround operations', 'Ultra-low-cost model uses minimal ground time (25-min turnarounds). Any crew/maintenance issue directly delays departure. Limited spare aircraft at outstations.'),
        'F9': ('Frontier — minimal schedule buffer', 'ULCC operations with aggressive scheduling. Crew duty-time limits and single-aircraft routes leave no recovery margin.'),
        'G4': ('Allegiant — limited fleet redundancy', 'Point-to-point model with older aircraft fleet (MD-80/A320). Fewer spares mean maintenance delays cascade.'),
        'B6': ('JetBlue — operational complexity at congested hubs', 'Heavy presence at JFK/BOS/FLL means ground operations compete for limited gates, tugs, and crew parking.'),
        'OO': ('SkyWest regional — crew scheduling constraints', 'Regional airlines face tighter crew duty-time regulations and smaller crew pools at outstations.'),
        'EV': ('ExpressJet — regional operations challenges', 'Regional carrier facing crew availability and maintenance resource limitations at smaller stations.'),
    }
    if carrier in carrier_detail:
        reason_text, detail_text = carrier_detail[carrier]
        delay_reasons.append({
            'reason': reason_text,
            'detail': detail_text,
            'impact': 'medium',
            'category': 'airline'
        })

    # 3. AIR SYSTEM / ATC (National Airspace System delays)
    if cong >= 0.88:
        origin_city = AIRPORTS.get(origin, ('Unknown',))[0]
        delay_reasons.append({
            'reason': f'ATC congestion — {origin} is a major hub',
            'detail': f'{origin_city} ({origin}) is among the busiest US airports. FAA ground delay programs (GDP), miles-in-trail restrictions, and departure queue management cause ATC-attributable delays averaging 14 min.',
            'impact': 'high',
            'category': 'atc'
        })
    elif cong >= 0.82:
        delay_reasons.append({
            'reason': f'Moderate ATC sequencing delays at {origin}',
            'detail': f'Airport traffic volume approaches capacity. Expect departure queue delays and potential enroute flow restrictions from FAA Command Center.',
            'impact': 'medium',
            'category': 'atc'
        })

    # 4. WEATHER
    if weather_data and weather_data.get('weather_risk_score', 0) > 0.15:
        delay_reasons.append({
            'reason': f"Live weather impact: {weather_data.get('weather_desc', 'adverse')}",
            'detail': f"Current conditions at {origin}: {weather_data.get('weather_desc')}, wind {round(weather_data.get('wind_speed_kmh', 0))} km/h, precip {weather_data.get('precipitation_mm', 0)}mm. FAA may implement ground stops, reduced arrival rates, or instrument-only approaches.",
            'impact': 'high' if weather_data['weather_risk_score'] > 0.4 else 'medium',
            'category': 'weather'
        })
    elif month in [12, 1, 2]:
        delay_reasons.append({
            'reason': 'Winter season — elevated weather risk',
            'detail': 'December-February brings snow, ice, and de-icing procedures. Even minor winter weather triggers ground delay programs at northern hubs. De-icing queues add 15-45 min.',
            'impact': 'high',
            'category': 'weather'
        })
    elif month in [6, 7, 8]:
        delay_reasons.append({
            'reason': 'Summer convective weather season',
            'detail': 'June-August thunderstorms peak in afternoons, causing ground stops and enroute rerouting. Southeast and Midwest hubs most affected. Storms build rapidly and can shut airports for 1-3 hours.',
            'impact': 'medium',
            'category': 'weather'
        })

    # 5. CREW DUTY TIME / FAA REST RULES (14 CFR Part 117)
    # FAA requires min 10 consecutive hours rest before duty. Max flight duty period
    # is 9-14 hours depending on start time and segments. Late flights risk crew timeout.
    crew_risk = False
    if dep_hour >= 20:
        delay_reasons.append({
            'reason': 'Crew duty-time limit risk (FAA Part 117)',
            'detail': f'FAA mandates minimum 10 consecutive hours rest between duty periods. Flights departing after 20:00 are often crewed by pilots who started duty at ~12:00 (8+ hours ago). If any prior delay extends duty beyond the legal max (9-14 hrs depending on segments), the airline MUST pull the crew and find replacements — causing 1-3 hour delays or cancellation.',
            'impact': 'high',
            'category': 'crew'
        })
        crew_risk = True
    elif dep_hour >= 17 and carrier in ('NK', 'F9', 'G4'):
        delay_reasons.append({
            'reason': 'Crew fatigue rules — ULCC thin crew pool',
            'detail': f'Ultra-low-cost carriers operate with minimal crew reserves. By evening, crews on multi-leg days approach their FAA duty limit (max {9 if dep_hour >= 20 else 11} hrs for {4 if dep_hour >= 18 else 3}+ segment days). If preceding delays push past the limit, no reserve crew may be available at outstations.',
            'impact': 'medium',
            'category': 'crew'
        })
        crew_risk = True

    # 6. TIME-OF-DAY EFFECT (accumulating system delays)
    if dep_hour >= 20 and not crew_risk:
        delay_reasons.append({
            'reason': 'Late night — full-day delay accumulation',
            'detail': f'By {dep_hour}:00, the entire air traffic system has accumulated delays from the day. Aircraft, crew, and gates are all running behind schedule. On average, flights after 8 PM are 3x more likely to be delayed than 6 AM departures.',
            'impact': 'high',
            'category': 'schedule'
        })
    elif dep_hour >= 17:
        delay_reasons.append({
            'reason': 'Evening rush — peak departure congestion',
            'detail': 'The 5-8 PM window has the highest departure volume. Ground holds, taxi queues, and gate conflicts peak.',
            'impact': 'medium',
            'category': 'schedule'
        })

    # 6. DEMAND / DAY OF WEEK
    if day_of_week in [5, 6, 7]:
        delay_reasons.append({
            'reason': 'Peak travel day (Friday/Sunday)',
            'detail': 'Highest passenger volumes increase load factors to 90%+. Full flights mean any mechanical swap requires rebooking hundreds of passengers. Ground handling slows.',
            'impact': 'low',
            'category': 'demand'
        })

    # 7. SECURITY (rare but real — avg 0.1 min but can be catastrophic)
    # Only flag in high-alert scenarios
    if origin in ('JFK', 'LAX', 'EWR', 'ORD') and day_of_week in [5, 6, 7] and dep_hour >= 16:
        delay_reasons.append({
            'reason': 'Security screening volume',
            'detail': 'Major international hub during peak travel period. TSA checkpoint congestion can cause passengers to miss boarding cutoffs, triggering bag-pull delays.',
            'impact': 'low',
            'category': 'security'
        })

    if not delay_reasons:
        delay_reasons.append({
            'reason': 'Optimal flight conditions',
            'detail': 'Early morning departure on a reliable carrier from an uncongested airport in mild season. Aircraft is fresh from overnight maintenance with no prior-leg delay. These are statistically the most punctual flights.',
            'impact': 'none',
            'category': 'positive'
        })

    response = {
        'delay_probability': round(prob, 4),
        'prediction': int(prob >= 0.5),
        'risk_level': risk_level,
        'estimated_delay': {
            'min_minutes': delay_min_low,
            'max_minutes': delay_min_high,
            'display': f"{delay_min_low}-{delay_min_high} min" if delay_min_low > 0 else "On time",
        },
        'recommended_action': action,
        'delay_reasons': delay_reasons,
        'feature_contributions': contributions,
        'computed_features': {
            'origin_congestion_score': computed['origin_congestion'],
            'propagation_risk': round(computed['propagation_risk'] * 100, 1),
            'taxi_out_estimate': round(computed['taxi_out'], 1),
            'route_distance_mi': round(computed['distance'], 0),
            'fuel_load_factor': round(computed.get('fuel_load_factor', 0.5), 3),
            'refuel_time_min': round(computed.get('refuel_time_min', 3), 1),
            'aircraft_leg_number': computed.get('leg_number', 1),
            'cumulative_fatigue_min': computed.get('cumulative_fatigue_min', 0),
            'turnaround_time_min': computed.get('time_since_last_flight', 45),
        },
        'flight_details': {
            'carrier': carrier,
            'carrier_name': CARRIERS.get(carrier, INDIA_CARRIERS.get(carrier, carrier)),
            'origin': origin,
            'origin_city': INDIA_AIRPORTS.get(origin, AIRPORTS.get(origin, ('Unknown',)))[0],
            'dest': dest,
            'dest_city': INDIA_AIRPORTS.get(dest, AIRPORTS.get(dest, ('Unknown',)))[0],
            'dep_hour': dep_hour,
            'day_of_week': day_of_week,
            'month': month,
            'region': 'india' if use_india else 'us'
        }
    }

    if weather_data:
        response['live_weather'] = weather_data

    # Compute downstream cascade chain — only for medium/high risk flights later in day
    cascade_chain = []
    accumulated_delay = 0
    turnaround = 35  # standard turnaround minutes

    if prob >= 0.30 and dep_hour >= 11:
        if prob >= 0.40:
            accumulated_delay = int(15 + (prob - 0.40) * 80)
        else:
            accumulated_delay = int(5 + (prob - 0.30) * 50)

    if accumulated_delay > 0:
        # Simulate 3 downstream legs for this aircraft
        downstream_routes = {
            'ATL': [('ORD', 3), ('DEN', 6)], 'ORD': [('DEN', 3), ('LAX', 6)],
            'DFW': [('ATL', 3), ('JFK', 6)], 'DEN': [('SFO', 3), ('SEA', 6)],
            'LAX': [('SFO', 2), ('SEA', 5)], 'JFK': [('BOS', 2), ('MIA', 5)],
            'SFO': [('LAX', 2), ('SEA', 4)], 'SEA': [('SFO', 3), ('LAX', 5)],
            'LAS': [('LAX', 2), ('DEN', 4)], 'MCO': [('ATL', 3), ('JFK', 5)],
            'EWR': [('BOS', 2), ('CLT', 4)], 'BOS': [('JFK', 2), ('DCA', 4)],
            'MIA': [('ATL', 3), ('JFK', 5)], 'PHX': [('LAX', 2), ('DEN', 4)],
            'IAH': [('DFW', 2), ('ATL', 5)], 'MSP': [('ORD', 2), ('DEN', 4)],
            'DTW': [('ORD', 2), ('JFK', 4)], 'CLT': [('ATL', 2), ('JFK', 4)],
            'LGA': [('BOS', 2), ('ORD', 4)], 'BWI': [('ATL', 3), ('BOS', 4)],
        }
        next_legs = downstream_routes.get(dest, [('ATL', 3), ('ORD', 6)])

        for next_dest, hours_later in next_legs:
            next_hour = min(23, dep_hour + hours_later)
            # Run real model for downstream leg
            next_features, _ = build_features(carrier, dest, next_dest, next_hour, day_of_week, month)
            next_raw = float(model.predict_proba(next_features)[0][1])
            dest_cong = AIRPORTS.get(dest, ('', 0.80))[1]
            next_base = calibrate_probability(next_raw, next_hour, carrier, month, day_of_week, dest_cong)

            # Cascade boost from accumulated delay
            overflow = max(0, accumulated_delay - turnaround)
            if overflow > 0:
                cascade_boost = min(0.45, overflow / 60 * 0.50)
            else:
                cascade_boost = min(0.15, accumulated_delay / turnaround * 0.15)

            next_prob = min(0.92, next_base + cascade_boost)

            # Check crew duty limit: if next leg is 14+ hours after assumed duty start (dep_hour - 1)
            duty_hours = next_hour - max(5, dep_hour - 1)
            crew_timeout = duty_hours >= 12

            # Update accumulated delay
            if next_prob >= 0.40:
                leg_delay = int(15 + (next_prob - 0.40) * 80)
            elif next_prob >= 0.20:
                leg_delay = int(5 + (next_prob - 0.20) * 50)
            else:
                leg_delay = 0
                # Recovery
                accumulated_delay = max(0, accumulated_delay - 7)

            accumulated_delay = max(0, accumulated_delay - 5 + leg_delay)

            cascade_chain.append({
                'origin': dest if len(cascade_chain) == 0 else next_legs[len(cascade_chain)-1][0] if len(cascade_chain) < len(next_legs) else dest,
                'dest': next_dest,
                'dep_hour': f"{next_hour}:00",
                'carrier_name': CARRIERS.get(carrier, carrier),
                'model_base_risk': round(next_base * 100, 1),
                'cascade_boost': round(cascade_boost * 100, 1),
                'total_risk': round(next_prob * 100, 1),
                'accumulated_delay': accumulated_delay,
                'crew_timeout_risk': crew_timeout,
                'status': 'CREW TIMEOUT' if crew_timeout and next_prob >= 0.35 else ('DELAYED' if accumulated_delay >= 15 else 'ON TIME')
            })

    response['cascade_chain'] = cascade_chain

    # === SHAP EXPLANATION (XGBoost native pred_contribs) ===
    try:
        import xgboost as xgb
        dmat = xgb.DMatrix(features, feature_names=feature_cols)
        contribs = model.get_booster().predict(dmat, pred_contribs=True)
        base_value = float(contribs[0][-1])
        feature_labels = {
            'carrier_enc': 'Airline',
            'origin_enc': 'Origin Airport',
            'dest_enc': 'Destination',
            'dep_hour': 'Departure Hour',
            'day_of_week': 'Day of Week',
            'month': 'Month/Season',
            'distance': 'Route Distance',
            'origin_congestion': 'Origin Congestion',
            'dest_congestion': 'Destination Congestion',
            'prior_leg_delay': 'Prior Leg Delay (Cascade)',
            'taxi_out': 'Taxi-Out Time',
            'is_weekend': 'Weekend',
            'is_winter': 'Winter Season',
            'route_congestion': 'Route Congestion',
            'dep_hour_sin': 'Time Pattern',
            'dep_hour_cos': 'Time Cycle',
            'month_sin': 'Season Pattern',
            'month_cos': 'Season Cycle',
            'fuel_load_factor': 'Fuel Load Factor',
            'refuel_time_min': 'Refuel Time',
            'leg_number_norm': 'Aircraft Leg Number',
            'cumulative_fatigue_norm': 'Cumulative Fatigue',
            'time_since_last_flight': 'Turnaround Time',
        }
        shap_items = []
        for i, fname in enumerate(feature_cols):
            val = float(contribs[0][i])
            if abs(val) > 0.05:
                label = feature_labels.get(fname, fname)
                shap_items.append({'feature': label, 'impact': round(val, 3), 'direction': 'increases' if val > 0 else 'decreases'})
        shap_items.sort(key=lambda x: abs(x['impact']), reverse=True)
        response['shap_explanation'] = shap_items[:8]
        response['shap_base_value'] = round(base_value, 4)
    except Exception as e:
        response['shap_explanation'] = []
        response['shap_base_value'] = 0.0

    # === ALTERNATIVE SUGGESTIONS ===
    alternatives = []
    if prob >= 0.25:
        if use_india:
            alt_carriers = [c for c in INDIA_CARRIERS.keys() if c != carrier]
        else:
            alt_carriers = [c for c in CARRIERS.keys() if c != carrier]
        alt_hours = [7, 8, 9, 10]
        best_alts = []
        for ac in alt_carriers:
            for ah in alt_hours:
                if use_india:
                    alt_features, _ = build_features_india(ac, origin, dest, ah, day_of_week, month)
                    alt_raw = float(india_model.predict_proba(alt_features)[0][1])
                    alt_prob = calibrate_probability_india(alt_raw, ah, ac, month, day_of_week, origin)
                else:
                    alt_features, _ = build_features(ac, origin, dest, ah, day_of_week, month)
                    alt_raw = float(model.predict_proba(alt_features)[0][1])
                    alt_cong = AIRPORTS.get(origin, ('', 0.80))[1]
                    alt_prob = calibrate_probability(alt_raw, ah, ac, month, day_of_week, alt_cong)
                if alt_prob < prob * 0.6:
                    all_carriers = {**CARRIERS, **INDIA_CARRIERS}
                    best_alts.append({
                        'carrier': ac,
                        'carrier_name': all_carriers.get(ac, ac),
                        'dep_hour': ah,
                        'delay_probability': round(alt_prob, 4),
                        'risk_level': 'LOW' if alt_prob < 0.20 else ('MEDIUM' if alt_prob < 0.40 else 'HIGH'),
                        'savings': f"{int((prob - alt_prob) * 100)}% lower risk",
                    })
        best_alts.sort(key=lambda x: x['delay_probability'])
        alternatives = best_alts[:3]
    response['alternatives'] = alternatives

    # === HOURLY RISK CHART ===
    hourly_risk = []
    for h in range(5, 24):
        if use_india:
            h_features, _ = build_features_india(carrier, origin, dest, h, day_of_week, month)
            h_raw = float(india_model.predict_proba(h_features)[0][1])
            h_prob = calibrate_probability_india(h_raw, h, carrier, month, day_of_week, origin)
        else:
            h_features, _ = build_features(carrier, origin, dest, h, day_of_week, month)
            h_raw = float(model.predict_proba(h_features)[0][1])
            h_cong = AIRPORTS.get(origin, ('', 0.80))[1]
            h_prob = calibrate_probability(h_raw, h, carrier, month, day_of_week, h_cong)
        hourly_risk.append({'hour': h, 'probability': round(h_prob, 4)})
    response['hourly_risk'] = hourly_risk

    # === ROUTE HISTORY INSIGHT ===
    route_insights = []
    all_airports = {**AIRPORTS, **INDIA_AIRPORTS}
    origin_city = all_airports.get(origin, ('Unknown',))[0]
    dest_city = all_airports.get(dest, ('Unknown',))[0]
    origin_cong_val = AIRPORTS.get(origin, ('', 0.80))[1]

    # Compute seasonal risk for this route
    season_risks = {}
    for s_name, s_months in [('Winter', [12,1,2]), ('Spring', [3,4,5]), ('Summer', [6,7,8]), ('Fall', [9,10,11])]:
        s_probs = []
        for sm in s_months:
            for sh in [8, 12, 17]:
                sf, _ = build_features(carrier, origin, dest, sh, 3, sm)
                sr = float(model.predict_proba(sf)[0][1])
                sp = calibrate_probability(sr, sh, carrier, sm, 3, origin_cong_val)
                s_probs.append(sp)
        season_risks[s_name] = round(sum(s_probs) / len(s_probs) * 100)

    worst_season = max(season_risks, key=season_risks.get)
    best_season = min(season_risks, key=season_risks.get)

    route_insights.append(f"{origin}-{dest} in {worst_season}: {season_risks[worst_season]}% avg delay rate (worst season)")
    route_insights.append(f"{origin}-{dest} in {best_season}: {season_risks[best_season]}% avg delay rate (best season)")

    if origin_cong_val >= 0.88:
        route_insights.append(f"{origin_city} ({origin}) is a top-5 busiest US airport — expect ATC congestion year-round")
    if dep_hour >= 17:
        route_insights.append(f"Evening flights on this route average {int(prob * 100)}% delay — morning departures cut risk by 60%+")
    elif dep_hour < 10:
        route_insights.append(f"Morning departures on this route have the lowest delay rates — good choice")

    response['route_insights'] = route_insights
    response['season_risks'] = season_risks

    return jsonify(response)


@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    return jsonify(metrics)


@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify(stats)


@app.route('/api/carriers', methods=['GET'])
def get_carriers():
    region = request.args.get('region', 'all')
    if region == 'india':
        return jsonify(INDIA_CARRIERS)
    elif region == 'us':
        return jsonify(CARRIERS)
    # Return both with region tags
    all_carriers = {}
    for code, name in CARRIERS.items():
        all_carriers[code] = {'name': name, 'region': 'us'}
    for code, name in INDIA_CARRIERS.items():
        all_carriers[code] = {'name': name, 'region': 'india'}
    return jsonify(all_carriers)


@app.route('/api/airports', methods=['GET'])
def get_airports():
    region = request.args.get('region', 'all')
    if region == 'india':
        result = {code: {'city': info[0], 'congestion': info[1]} for code, info in INDIA_AIRPORTS.items()}
        return jsonify(result)
    elif region == 'us':
        result = {code: {'city': info[0], 'congestion': info[1]} for code, info in AIRPORTS.items()}
        return jsonify(result)
    # Return both
    result = {}
    for code, info in AIRPORTS.items():
        result[code] = {'city': info[0], 'congestion': info[1], 'region': 'us'}
    for code, info in INDIA_AIRPORTS.items():
        result[code] = {'city': info[0], 'congestion': info[1], 'region': 'india'}
    return jsonify(result)


@app.route('/api/batch-predict', methods=['POST'])
def batch_predict():
    """Predict delays for upcoming flights from an airport."""
    data = request.json
    origin = data.get('origin', 'ATL')
    month = int(data.get('month', 6))
    day_of_week = int(data.get('day_of_week', 0))

    results = []
    carriers_sample = list(CARRIERS.keys())
    dests_sample = [a for a in list(AIRPORTS.keys()) if a != origin][:10]

    for i in range(min(12, len(dests_sample))):
        carrier = carriers_sample[i % len(carriers_sample)]
        dest = dests_sample[i % len(dests_sample)]
        dep_hour = 6 + i * 1.5
        dep_hour = int(min(23, dep_hour))

        features, _ = build_features(carrier, origin, dest, dep_hour, day_of_week, month)
        raw_prob = float(model.predict_proba(features)[0][1])
        origin_cong = AIRPORTS.get(origin, ('', 0.80))[1]
        prob = calibrate_probability(raw_prob, dep_hour, carrier, month, day_of_week, origin_cong)

        if prob >= 0.40:
            risk = 'HIGH'
        elif prob >= 0.20:
            risk = 'MEDIUM'
        else:
            risk = 'LOW'

        results.append({
            'flight_number': f"{carrier}{1000 + i * 111}",
            'carrier': carrier,
            'carrier_name': CARRIERS.get(carrier, carrier),
            'origin': origin,
            'dest': dest,
            'dest_city': AIRPORTS.get(dest, ('Unknown',))[0],
            'dep_time': f"{dep_hour:02d}:{(i * 15) % 60:02d}",
            'delay_probability': round(prob, 4),
            'risk_level': risk
        })

    results.sort(key=lambda x: x['delay_probability'], reverse=True)
    return jsonify({'flights': results, 'origin': origin})


@app.route('/api/propagation', methods=['GET'])
def get_propagation():
    """
    Demonstrate delay cascade propagation using the real ML model.
    Simulates one aircraft flying multiple legs throughout a day.
    Each leg's prediction uses the actual XGBoost model, and accumulated
    delay from prior legs feeds into subsequent predictions via the
    propagation risk multiplier — showing how a single initial delay
    compounds through connected flights.
    """
    now = datetime.now()
    month = now.month
    day_of_week = (now.weekday())  # 0=Mon

    # Scenario: pick a carrier and realistic multi-leg routing
    scenarios = [
        {'carrier': 'WN', 'legs': [('ATL', 'ORD', 8), ('ORD', 'DEN', 11), ('DEN', 'LAX', 14), ('LAX', 'SFO', 17), ('SFO', 'SEA', 20)]},
        {'carrier': 'DL', 'legs': [('ATL', 'JFK', 6), ('JFK', 'ORD', 9), ('ORD', 'DFW', 12), ('DFW', 'LAX', 15), ('LAX', 'SEA', 18)]},
        {'carrier': 'AA', 'legs': [('DFW', 'ORD', 7), ('ORD', 'JFK', 10), ('JFK', 'MIA', 13), ('MIA', 'ATL', 16), ('ATL', 'DEN', 19)]},
        {'carrier': 'UA', 'legs': [('EWR', 'ORD', 7), ('ORD', 'DEN', 10), ('DEN', 'SFO', 13), ('SFO', 'LAX', 16), ('LAX', 'PHX', 19)]},
    ]

    scenario = scenarios[now.minute % len(scenarios)]
    carrier = scenario['carrier']
    legs = scenario['legs']

    chain = []
    accumulated_delay = 0
    turnaround_time = 35  # minutes standard ground time

    for i, (orig, dest, dep_hour) in enumerate(legs):
        # Run real model prediction for this leg
        features, computed = build_features(carrier, orig, dest, dep_hour, day_of_week, month)
        raw_prob = float(model.predict_proba(features)[0][1])
        orig_cong = AIRPORTS.get(orig, ('', 0.80))[1]
        base_prob = calibrate_probability(raw_prob, dep_hour, carrier, month, day_of_week, orig_cong)

        # Apply cascade effect: accumulated delay from prior legs increases risk
        # This is the key insight — prior delays eat into turnaround time
        cascade_boost = 0
        if accumulated_delay > 0:
            # If prior delay > turnaround buffer, almost certain this leg delays too
            overflow = max(0, accumulated_delay - turnaround_time)
            if overflow > 0:
                cascade_boost = min(0.45, overflow / 60 * 0.50)
            else:
                # Partial recovery possible but still elevated risk
                cascade_boost = min(0.15, accumulated_delay / turnaround_time * 0.15)

        final_prob = min(0.92, base_prob + cascade_boost)

        # Estimate delay minutes from probability
        if final_prob >= 0.40:
            delay_minutes = int(15 + (final_prob - 0.40) * 80)
        elif final_prob >= 0.20:
            delay_minutes = int(5 + (final_prob - 0.20) * 50)
        else:
            delay_minutes = 0

        # Recovery: airlines can make up ~5-8 min per leg through faster taxi/flight
        recovery = min(accumulated_delay, 7) if accumulated_delay > 0 and delay_minutes == 0 else 0
        accumulated_delay = max(0, accumulated_delay - recovery + delay_minutes)

        chain.append({
            'leg': i + 1,
            'origin': orig,
            'dest': dest,
            'carrier': carrier,
            'carrier_name': CARRIERS[carrier],
            'dep_hour': f"{dep_hour}:00",
            'delay_probability': round(final_prob, 3),
            'delay_minutes': int(accumulated_delay),
            'cascade_boost': round(cascade_boost * 100, 1),
            'model_base_risk': round(base_prob * 100, 1),
            'status': 'DELAYED' if accumulated_delay >= 15 else 'ON TIME'
        })

    # Summary insight
    peak_delay = max(leg['delay_minutes'] for leg in chain)
    legs_delayed = sum(1 for leg in chain if leg['status'] == 'DELAYED')

    return jsonify({
        'chain': chain,
        'summary': {
            'aircraft_tail': f"N{100 + now.minute}{carrier}",
            'total_legs': len(chain),
            'legs_delayed': legs_delayed,
            'peak_delay_minutes': peak_delay,
            'cascade_amplification': round(peak_delay / max(chain[0]['delay_minutes'], 1), 1) if chain[0]['delay_minutes'] > 0 else 0,
            'insight': f"{'Delay propagated through ' + str(legs_delayed) + ' of ' + str(len(chain)) + ' legs' if legs_delayed > 1 else 'Delay contained — did not propagate' if legs_delayed == 1 else 'No delays in this chain — aircraft on schedule'}"
        }
    })


@app.route('/api/booking-advisor', methods=['POST'])
def booking_advisor():
    """Analyze best booking options for a future trip (weeks/months ahead)."""
    data = request.json
    origin = data.get('origin', 'JFK')
    dest = data.get('dest', 'LAX')
    month = int(data.get('month', 6))
    preferred_time = data.get('preferred_time', 'any')

    # Analyze all carriers on this route across all days and time slots
    time_slots = {
        'morning': list(range(5, 12)),
        'afternoon': list(range(12, 18)),
        'evening': list(range(18, 24)),
    }

    if preferred_time == 'any':
        hours_to_check = list(range(5, 24))
    else:
        hours_to_check = time_slots.get(preferred_time, list(range(5, 24)))

    carrier_results = []
    for carrier_code, carrier_name in CARRIERS.items():
        best_prob = 1.0
        best_day = 0
        best_hour = 12
        total_prob = 0
        count = 0

        for dow in range(7):
            for hour in hours_to_check[::3]:  # sample every 3 hours
                features, _ = build_features(carrier_code, origin, dest, hour, dow, month)
                raw_prob = float(model.predict_proba(features)[0][1])
                orig_cong = AIRPORTS.get(origin, ('', 0.80))[1]
                prob = calibrate_probability(raw_prob, hour, carrier_code, month, dow, orig_cong)
                total_prob += prob
                count += 1

                if prob < best_prob:
                    best_prob = prob
                    best_day = dow
                    best_hour = hour

        avg_prob = total_prob / max(count, 1)
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        # Star rating: 5 = very low risk, 1 = very high
        if avg_prob < 0.18:
            stars = 5
        elif avg_prob < 0.23:
            stars = 4
        elif avg_prob < 0.28:
            stars = 3
        elif avg_prob < 0.35:
            stars = 2
        else:
            stars = 1

        carrier_results.append({
            'carrier': carrier_code,
            'carrier_name': carrier_name,
            'best_day': days[best_day],
            'best_time': f"{best_hour:02d}:00",
            'delay_risk': round(best_prob * 100),
            'avg_risk': round(avg_prob * 100),
            'stars': stars,
        })

    carrier_results.sort(key=lambda x: x['delay_risk'])

    # Build heatmap: time slots x days
    heatmap = []
    slot_names = {'Morning (5-11)': range(5, 12), 'Afternoon (12-17)': range(12, 18), 'Evening (18-23)': range(18, 24)}
    for slot_name, hours in slot_names.items():
        row_days = []
        for dow in range(7):
            slot_probs = []
            for hour in hours:
                features, _ = build_features(carrier_results[0]['carrier'], origin, dest, hour, dow, month)
                raw_prob = float(model.predict_proba(features)[0][1])
                orig_cong = AIRPORTS.get(origin, ('', 0.80))[1]
                prob = calibrate_probability(raw_prob, hour, carrier_results[0]['carrier'], month, dow, orig_cong)
                slot_probs.append(prob)
            avg = sum(slot_probs) / len(slot_probs)
            row_days.append(round(avg * 100))
        heatmap.append({'time_slot': slot_name, 'days': row_days})

    # Best option
    best = carrier_results[0]

    # Generate tips
    tips = []
    is_winter = month in [12, 1, 2]
    is_summer = month in [6, 7, 8]

    tips.append(f"Book {best['carrier_name']} on {best['best_day']} at {best['best_time']} for lowest delay risk ({best['delay_risk']}%).")

    if is_winter:
        tips.append("Winter months have higher delay rates due to snow/ice. Morning flights have less cascading delays — book early.")
    elif is_summer:
        tips.append("Summer thunderstorms peak in afternoons. Morning departures avoid most weather-related delays.")
    else:
        tips.append("Spring/Fall have the lowest delay rates overall. Almost any time works well.")

    # Hub-specific tip
    origin_cong = AIRPORTS.get(origin, ('', 0.80))[1]
    if origin_cong >= 0.88:
        tips.append(f"{origin} is a highly congested hub. Avoid peak hours (4-7 PM) when delays cascade.")

    tips.append("Tuesday and Wednesday consistently have the lowest delay rates across all routes.")

    worst = carrier_results[-1]
    if worst['avg_risk'] > 50:
        tips.append(f"Avoid {worst['carrier_name']} on this route — historical delay rate is {worst['avg_risk']}%.")

    return jsonify({
        'best_option': {
            'carrier': best['carrier'],
            'carrier_name': best['carrier_name'],
            'best_day': best['best_day'],
            'best_time': best['best_time'],
            'delay_risk': best['delay_risk'],
            'tip': f"Historically, {best['carrier_name']} departing {origin} on {best['best_day']} mornings in {MONTHS_MAP.get(month, 'this month')} has the lowest delay probability on this route.",
        },
        'carriers': carrier_results,
        'heatmap': heatmap,
        'tips': tips,
        'route': {'origin': origin, 'dest': dest, 'month': month},
    })


MONTHS_MAP = {1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
              7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'}


@app.route('/api/weather/<airport>', methods=['GET'])
def get_airport_weather(airport):
    """Get real-time weather for an airport."""
    if not WEATHER_ENABLED:
        return jsonify({'error': 'Weather service not available'}), 503
    weather = get_weather(airport.upper())
    if weather:
        return jsonify(weather)
    return jsonify({'error': f'No weather data for {airport}'}), 404


@app.route('/api/weather/all', methods=['GET'])
def get_weather_all():
    """Get weather for all tracked airports."""
    if not WEATHER_ENABLED:
        return jsonify({'error': 'Weather service not available'}), 503
    return jsonify(get_all_weather())


def estimate_delay_duration(prob, dep_hour, carrier, month, origin):
    """Estimate delay duration range based on probability and flight context."""
    carrier_avg = {
        'NK': 55, 'F9': 52, 'G4': 50, 'B6': 45, 'OO': 48,
        'EV': 47, 'MQ': 44, 'UA': 40, 'AA': 38,
        'WN': 35, 'US': 35, 'AS': 32, 'VX': 30, 'HA': 28, 'DL': 33
    }
    base = carrier_avg.get(carrier, 40)
    if dep_hour >= 20:
        base = int(base * 1.4)
    elif dep_hour >= 17:
        base = int(base * 1.2)
    if month in [12, 1, 2]:
        base = int(base * 1.15)
    orig_cong = AIRPORTS.get(origin, ('', 0.80))[1]
    if orig_cong >= 0.88:
        base += 10

    if prob >= 0.40:
        return f"{max(15, int(base * 0.6))}-{int(base * 1.3)} min"
    elif prob >= 0.25:
        return f"15-{int(base * 0.7)} min"
    else:
        return "On time"


@app.route('/api/realtime-board', methods=['GET'])
def realtime_board():
    """Real-time departure board using LIVE flight data + weather + ML prediction."""
    now = datetime.now()
    origin = request.args.get('origin', 'ORD')
    month = now.month
    day_of_week = now.weekday()

    # Get live weather
    weather = None
    if WEATHER_ENABLED:
        weather = get_weather(origin)

    # Try to get REAL flights
    live_flights = None
    data_source = 'simulated'
    if FLIGHTS_ENABLED:
        live_flights = get_live_flights(origin)

    results = []

    if live_flights:
        data_source = live_flights[0].get('source', 'live')
        for flight in live_flights:
            carrier = flight['carrier']
            dest = flight['dest']
            dep_hour = flight.get('dep_hour', 12)

            # Run ML prediction on real flight
            features, computed = build_features(
                carrier, origin, dest, dep_hour, day_of_week, month
            )
            raw_prob = float(model.predict_proba(features)[0][1])
            orig_cong = AIRPORTS.get(origin, ('', 0.80))[1]
            prob = calibrate_probability(raw_prob, dep_hour, carrier, month, day_of_week, orig_cong)

            # Adjust with live weather
            if weather:
                prob = min(0.95, prob + weather['weather_risk_score'] * 0.15)

            # If actual delay reported, override model — real data trumps prediction
            actual_delay = flight.get('actual_delay', 0)
            if actual_delay > 60:
                prob = max(prob, 0.85)
            elif actual_delay > 30:
                prob = max(prob, 0.65)
            elif actual_delay > 15:
                prob = max(prob, 0.45)

            if prob >= 0.40:
                risk = 'HIGH'
            elif prob >= 0.25:
                risk = 'MEDIUM'
            else:
                risk = 'LOW'

            # Generate concise delay reason based on all BTS categories
            reasons = []
            if actual_delay > 15:
                reasons.append(f'Late aircraft: {actual_delay}min reported')
            elif dep_hour >= 18:
                reasons.append('Late aircraft cascade risk')
            if carrier in ('NK', 'F9', 'G4', 'OO', 'EV'):
                reasons.append('Airline ops: tight turnarounds')
            if computed['origin_congestion'] >= 0.88:
                reasons.append('ATC: high hub congestion')
            elif computed['origin_congestion'] >= 0.83:
                reasons.append('ATC: moderate congestion')
            if weather and weather.get('weather_risk_score', 0) > 0.15:
                reasons.append(f"Weather: {weather.get('weather_desc', 'adverse')}")
            elif month in [12, 1, 2]:
                reasons.append('Weather: winter season risk')
            elif month in [6, 7, 8] and dep_hour >= 14:
                reasons.append('Weather: afternoon storm risk')
            if not reasons:
                if dep_hour < 10:
                    reasons.append('Low risk: morning departure')
                else:
                    reasons.append('Normal operations')

            # Estimate delay duration
            delay_est = estimate_delay_duration(prob, dep_hour, carrier, month, origin)

            results.append({
                'flight_number': flight['flight_number'],
                'carrier': carrier,
                'carrier_name': flight.get('carrier_name', CARRIERS.get(carrier, carrier)),
                'origin': origin,
                'dest': dest,
                'dest_city': flight.get('dest_city', AIRPORTS.get(dest, ('Unknown',))[0]),
                'dep_time': flight.get('dep_time', f"{dep_hour:02d}:00"),
                'delay_probability': round(prob, 4),
                'risk_level': risk,
                'estimated_delay': delay_est,
                'delay_reason': ' | '.join(reasons[:2]),
                'gate': flight.get('gate', '-'),
                'terminal': flight.get('terminal', '-'),
                'actual_status': flight.get('status', 'SCHEDULED'),
            })
    else:
        # Fallback: generate realistic simulated flights using current time
        use_india_board = origin in INDIA_AIRPORTS
        if use_india_board:
            carriers_list = list(INDIA_CARRIERS.keys())
            dests_list = [a for a in list(INDIA_AIRPORTS.keys()) if a != origin]
        else:
            carriers_list = list(CARRIERS.keys())
            dests_list = [a for a in list(AIRPORTS.keys()) if a != origin]
        base_hour = now.hour

        for i in range(12):
            carrier = carriers_list[i % len(carriers_list)]
            dest = dests_list[i % len(dests_list)]
            dep_hour = min(23, max(5, base_hour + (i - 2)))

            if use_india_board and INDIA_MODEL_AVAILABLE:
                features, computed = build_features_india(carrier, origin, dest, dep_hour, day_of_week, month)
                raw_prob = float(india_model.predict_proba(features)[0][1])
                prob = calibrate_probability_india(raw_prob, dep_hour, carrier, month, day_of_week, origin)
            else:
                features, computed = build_features(carrier, origin, dest, dep_hour, day_of_week, month)
                raw_prob = float(model.predict_proba(features)[0][1])
                orig_cong = AIRPORTS.get(origin, ('', 0.80))[1]
                prob = calibrate_probability(raw_prob, dep_hour, carrier, month, day_of_week, orig_cong)

            if weather:
                prob = min(0.95, prob + weather['weather_risk_score'] * 0.15)

            if prob >= 0.40:
                risk = 'HIGH'
            elif prob >= 0.25:
                risk = 'MEDIUM'
            else:
                risk = 'LOW'

            reasons = []
            if dep_hour >= 18:
                reasons.append('Late aircraft cascade risk')
            if use_india_board:
                if carrier in ('G8', 'SG', 'I5'):
                    reasons.append('Airline ops: tight turnarounds')
                fog_airports = ['DEL', 'LKO', 'PAT', 'VNS', 'GAU', 'IXC', 'AMD']
                if month in [12, 1] and origin in fog_airports and dep_hour < 10:
                    reasons.append('Weather: dense fog')
                elif month in [6, 7, 8, 9]:
                    reasons.append('Weather: monsoon season')
            else:
                if carrier in ('NK', 'F9', 'G4', 'OO', 'EV'):
                    reasons.append('Airline ops: tight turnarounds')
                if month in [12, 1, 2]:
                    reasons.append('Weather: winter season risk')
                elif month in [6, 7, 8] and dep_hour >= 14:
                    reasons.append('Weather: afternoon storm risk')
            if computed['origin_congestion'] >= 0.85:
                reasons.append('ATC: high hub congestion')
            elif computed['origin_congestion'] >= 0.70:
                reasons.append('ATC: moderate congestion')
            if weather and weather.get('weather_risk_score', 0) > 0.15:
                reasons.append(f"Weather: {weather.get('weather_desc', 'adverse')}")
            if not reasons:
                if dep_hour < 10:
                    reasons.append('Low risk: morning departure')
                else:
                    reasons.append('Normal operations')

            delay_est = estimate_delay_duration(prob, dep_hour, carrier, month, origin)
            all_carriers_map = {**CARRIERS, **INDIA_CARRIERS}
            all_airports_map = {**AIRPORTS, **INDIA_AIRPORTS}

            results.append({
                'flight_number': f"{carrier}{1000 + i * 137}",
                'carrier': carrier,
                'carrier_name': all_carriers_map.get(carrier, carrier),
                'origin': origin,
                'dest': dest,
                'dest_city': all_airports_map.get(dest, ('Unknown',))[0],
                'dep_time': f"{dep_hour:02d}:{(i * 7 + 10) % 60:02d}",
                'delay_probability': round(prob, 4),
                'risk_level': risk,
                'estimated_delay': delay_est,
                'delay_reason': ' | '.join(reasons[:2]),
                'gate': '-',
                'terminal': '-',
                'actual_status': 'SCHEDULED',
            })

    results.sort(key=lambda x: x['dep_time'])
    all_airports_map = {**AIRPORTS, **INDIA_AIRPORTS}

    return jsonify({
        'flights': results,
        'origin': origin,
        'origin_city': all_airports_map.get(origin, ('Unknown',))[0],
        'timestamp': now.isoformat(),
        'weather': weather,
        'data_source': data_source,
    })


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': True,
        'weather_enabled': WEATHER_ENABLED,
        'timestamp': datetime.now().isoformat(),
    })


# Serve React frontend in production
STATIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')
if os.path.exists(STATIC_DIR):
    from flask import send_from_directory

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(STATIC_DIR, path)):
            return send_from_directory(STATIC_DIR, path)
        return send_from_directory(STATIC_DIR, 'index.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
