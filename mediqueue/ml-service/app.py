"""
MediQueue ML Service — Flask API
Trained on real Hospital Wait Time Dataset (5000 records)

Start: python app.py
Endpoints:
  POST /predict-wait   → predict wait time for a patient
  POST /predict-batch  → predict for multiple departments
  GET  /health         → service status
  GET  /dept-stats     → average wait times per department
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import json
import os

app = Flask(__name__)
CORS(app)

# ─── Load models on startup ────────────────────────────────────
MODEL_PATH    = 'model/trained_model.pkl'
SCALER_PATH   = 'model/scaler.pkl'
FEATURES_PATH = 'model/features.pkl'
DEPT_MAP_PATH = 'model/dept_map.json'
DEPT_STATS_PATH = 'model/dept_stats.csv'

model, scaler, FEATURES, DEPT_MAP, dept_stats = None, None, None, {}, {}

def load_models():
    global model, scaler, FEATURES, DEPT_MAP, dept_stats
    if not os.path.exists(MODEL_PATH):
        print("⚠️  Model not found. Run: python train.py")
        return False
    model    = joblib.load(MODEL_PATH)
    scaler   = joblib.load(SCALER_PATH)
    FEATURES = joblib.load(FEATURES_PATH)
    if os.path.exists(DEPT_MAP_PATH):
        with open(DEPT_MAP_PATH) as f:
            DEPT_MAP = json.load(f)
    if os.path.exists(DEPT_STATS_PATH):
        dept_stats = pd.read_csv(DEPT_STATS_PATH, index_col=0).to_dict('index')
    print("✅ ML models loaded. Features:", FEATURES)
    return True

# ─── Helpers ───────────────────────────────────────────────────
# Department name → ID (matches mediqueue DB)
DEPT_NAME_TO_ID = {
    'Cardiology':        2,
    'Orthopedics':       3,
    'General Surgery':   4,
    'Emergency':         12,
    'Radiology':         11,
    'Neurology':         5,
    'Pediatrics':        6,
    'Internal Medicine': 1,
    'General Medicine':  1,
    'Dentistry':         7,
    'ENT':               8,
    'Ophthalmology':     9,
    'Gynecology':        10,
    'Dermatology':       7,
    'Oncology':          9,
    'Obstetrics':        10,
}

def get_load_level(wait_minutes):
    if wait_minutes <= 15: return 'Low'
    if wait_minutes <= 30: return 'Medium'
    if wait_minutes <= 60: return 'High'
    return 'Very High'

def get_load_color(load_level):
    return {
        'Low':      '#22c55e',
        'Medium':   '#f59e0b',
        'High':     '#ef4444',
        'Very High':'#7c3aed'
    }.get(load_level, '#64748b')

def get_time_slot(hour):
    if hour < 10: return 0
    if hour < 12: return 1
    if hour < 14: return 2
    if hour < 16: return 3
    if hour < 18: return 4
    return 5

def build_feature_vector(data):
    """Build feature vector matching training features exactly."""
    from datetime import datetime
    now = datetime.now()

    dept_id       = int(data.get('department_id', 1))
    hour          = int(data.get('arrival_hour', now.hour))
    day_of_week   = int(data.get('day_of_week', now.weekday()))
    month         = int(data.get('month', now.month))
    is_weekend    = int(day_of_week >= 5)
    queue_length  = int(data.get('current_queue_length', 3))
    providers     = int(data.get('providers_on_shift', 5))
    nurses        = int(data.get('nurses_on_shift', 8))
    staff_ratio   = float(data.get('staff_ratio', 0.3))
    is_emergency  = int(data.get('is_emergency', 0))
    patient_age   = int(data.get('patient_age', 35))
    complexity    = int(data.get('reason_complexity_score', 2))
    is_online     = int(data.get('is_online_booking', 1))
    occupancy     = float(data.get('occupancy_rate', 0.5))
    time_slot     = get_time_slot(hour)

    return np.array([[
        dept_id, time_slot, day_of_week, month, is_weekend,
        queue_length, providers, nurses, staff_ratio,
        is_emergency, patient_age, complexity, is_online, occupancy
    ]])

# ─── Main Predict Endpoint ─────────────────────────────────────
@app.route('/predict-wait', methods=['POST'])
def predict_wait():
    if model is None:
        return jsonify({'error': 'Model not loaded. Run python train.py first.'}), 503

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400

    try:
        feature_vector = build_feature_vector(data)
        scaled         = scaler.transform(feature_vector)
        raw            = model.predict(scaled)[0]
        wait_minutes   = max(5, int(round(raw / 5) * 5))  # round to nearest 5min

        load_level = get_load_level(wait_minutes)
        dept_id    = int(data.get('department_id', 1))

        # Get department name from reverse mapping
        dept_name = next(
            (k for k, v in DEPT_NAME_TO_ID.items() if v == dept_id),
            'Unknown'
        )

        # Get historical average for this dept (from training data)
        hist_avg = None
        if dept_name in dept_stats:
            hist_avg = round(dept_stats[dept_name].get('avg_wait', 0), 1)

        return jsonify({
            'success': True,
            'predicted_wait_minutes': wait_minutes,
            'load_level': load_level,
            'load_color': get_load_color(load_level),
            'department_id': dept_id,
            'department_name': dept_name,
            'historical_avg_minutes': hist_avg,
            'model': 'RandomForest (real hospital data)',
            'data_source': 'Hospital_Wait_Time_Data.csv (5000 records)'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# ─── Batch Predict (all departments) ──────────────────────────
@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503

    data    = request.get_json() or {}
    results = []

    for dept_id in range(1, 13):
        item = {**data, 'department_id': dept_id}
        vec    = build_feature_vector(item)
        scaled = scaler.transform(vec)
        wait   = max(5, int(round(model.predict(scaled)[0] / 5) * 5))
        dept_name = next(
            (k for k, v in DEPT_NAME_TO_ID.items() if v == dept_id), f'Dept {dept_id}'
        )
        results.append({
            'department_id':          dept_id,
            'department_name':        dept_name,
            'predicted_wait_minutes': wait,
            'load_level':             get_load_level(wait),
            'load_color':             get_load_color(wait)
        })

    return jsonify({'success': True, 'results': results})

# ─── Department Stats ──────────────────────────────────────────
@app.route('/dept-stats', methods=['GET'])
def get_dept_stats():
    """Return historical wait time averages per department from real data."""
    if not dept_stats:
        return jsonify({'error': 'Stats not loaded'}), 503

    stats_list = []
    for dept_name, stats in dept_stats.items():
        dept_id = DEPT_NAME_TO_ID.get(dept_name, 0)
        stats_list.append({
            'department_id':   dept_id,
            'department_name': dept_name,
            'avg_wait':        round(stats.get('avg_wait', 0), 1),
            'median_wait':     round(stats.get('median_wait', 0), 1),
            'load_level':      get_load_level(stats.get('avg_wait', 0))
        })

    stats_list.sort(key=lambda x: x['avg_wait'], reverse=True)
    return jsonify({'success': True, 'dept_stats': stats_list})

# ─── Health Check ──────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'OK',
        'model_loaded': model is not None,
        'service': 'MediQueue ML Service',
        'dataset': 'Hospital_Wait_Time_Data.csv',
        'features': FEATURES if FEATURES else []
    })

if __name__ == '__main__':
    load_models()
    print("🤖 MediQueue ML Service → http://localhost:5001")
    print("   POST /predict-wait  — predict wait time")
    print("   GET  /dept-stats    — dept historical averages")
    print("   GET  /health        — service status")
    app.run(host='0.0.0.0', port=5001, debug=False)