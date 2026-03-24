"""
MediQueue ML Service — Flask API
Serves wait-time predictions and load classification.

Start: python app.py
Endpoint: POST http://localhost:5001/predict-wait
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# ─── Load model on startup ─────────────────────────────────────────────────────
MODEL_PATH   = 'model/trained_model.pkl'
SCALER_PATH  = 'model/scaler.pkl'
FEATURES_PATH = 'model/features.pkl'

model, scaler, FEATURES = None, None, None

def load_models():
    global model, scaler, FEATURES
    if not os.path.exists(MODEL_PATH):
        print("⚠️  Model not found. Run: python train.py")
        return False
    model    = joblib.load(MODEL_PATH)
    scaler   = joblib.load(SCALER_PATH)
    FEATURES = joblib.load(FEATURES_PATH)
    print("✅ ML models loaded successfully.")
    return True

DEPT_BASE_CONSULT = {1:20,2:30,3:25,4:15,5:35,6:20,7:25,8:20,9:25,10:30,11:40,12:10}
SLOT_MAP = {'8:00-10:00':0,'10:00-12:00':1,'12:00-14:00':2,'14:00-16:00':3,'16:00-18:00':4,'18:00-20:00':5}

def get_load_level(wait_minutes):
    if wait_minutes <= 20: return 'Low'
    if wait_minutes <= 45: return 'Medium'
    return 'High'

def get_confidence(n_estimators=200):
    # Simulated confidence; in production compute from prediction std
    return round(0.75 + np.random.uniform(0, 0.15), 2)

# ─── Predict endpoint ──────────────────────────────────────────────────────────
@app.route('/predict-wait', methods=['POST'])
def predict_wait():
    if model is None:
        return jsonify({'error': 'Model not loaded. Run python train.py first.'}), 503

    data = request.get_json()

    try:
        dept_id       = int(data.get('department_id', 4))
        doctor_id     = int(data.get('doctor_id', dept_id))
        time_slot_str = data.get('time_slot', '10:00-12:00')
        day_of_week   = int(data.get('day_of_week', 1))
        month         = int(data.get('month', 6))
        queue_length  = int(data.get('current_queue_length', 0))
        booked_slots  = int(data.get('booked_slots_in_slot', 3))
        experience    = int(data.get('doctor_experience_years', 10))
        is_emergency  = int(data.get('is_emergency', 0))
        patient_age   = int(data.get('patient_age', 30))
        complexity    = int(data.get('reason_complexity_score', 1))

        time_slot_num = SLOT_MAP.get(time_slot_str, 1)
        avg_consult   = DEPT_BASE_CONSULT.get(dept_id, 20)

        feature_vector = np.array([[
            dept_id, doctor_id, time_slot_num, day_of_week, month,
            queue_length, booked_slots, avg_consult,
            experience, is_emergency, patient_age, complexity
        ]])

        scaled = scaler.transform(feature_vector)
        raw_prediction = model.predict(scaled)[0]
        wait_minutes = max(5, int(round(raw_prediction / 5) * 5))  # round to nearest 5

        return jsonify({
            'success': True,
            'predicted_wait_minutes': wait_minutes,
            'load_level': get_load_level(wait_minutes),
            'confidence': get_confidence(),
            'department_id': dept_id,
            'time_slot': time_slot_str
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# ─── Health check ──────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'OK',
        'model_loaded': model is not None,
        'service': 'MediQueue ML Service'
    })

# ─── Batch predict (for admin analytics) ──────────────────────────────────────
@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503
    data = request.get_json()
    results = []
    for item in data.get('items', []):
        dept_id = int(item.get('department_id', 4))
        queue_length = int(item.get('current_queue_length', 0))
        avg_consult = DEPT_BASE_CONSULT.get(dept_id, 20)
        vec = np.array([[
            dept_id, dept_id, 1, 1, 6, queue_length, 5,
            avg_consult, 10, 0, 30, 1
        ]])
        scaled = scaler.transform(vec)
        wait = max(5, int(round(model.predict(scaled)[0] / 5) * 5))
        results.append({'department_id': dept_id, 'predicted_wait_minutes': wait, 'load_level': get_load_level(wait)})
    return jsonify({'success': True, 'results': results})

if __name__ == '__main__':
    load_models()
    print("🤖 MediQueue ML Service starting on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=False)
