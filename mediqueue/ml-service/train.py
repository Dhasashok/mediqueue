"""
MediQueue ML Training Script
Trains a Random Forest Regressor to predict patient wait times.
Run this once to generate model.pkl and scaler.pkl
Usage: python train.py
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

# ─── Synthetic Training Data Generation ────────────────────────────────────────
# In production, replace this with your real hospital dataset CSV:
#   df = pd.read_csv('hospital_data.csv')

np.random.seed(42)
N = 15000  # number of training records

# Department base consultation times (minutes)
DEPT_BASE = {1:20, 2:30, 3:25, 4:15, 5:35, 6:20, 7:25, 8:20, 9:25, 10:30, 11:40, 12:10}

def generate_data(n):
    records = []
    for _ in range(n):
        dept_id         = np.random.randint(1, 13)
        doctor_id       = dept_id                        # one doctor per dept in demo
        time_slot       = np.random.randint(0, 6)        # 0=8-10, 1=10-12, ... 5=18-20
        day_of_week     = np.random.randint(0, 7)
        month           = np.random.randint(1, 13)
        queue_length    = np.random.randint(0, 15)
        booked_in_slot  = np.random.randint(1, 11)
        avg_consult_min = DEPT_BASE[dept_id] + np.random.uniform(-5, 5)
        experience_yrs  = np.random.randint(5, 25)
        is_emergency    = int(dept_id == 12)
        patient_age     = np.random.randint(1, 90)
        complexity      = np.random.randint(1, 4)        # 1=simple, 3=complex

        # Target: wait time in minutes
        wait = (
            avg_consult_min * queue_length * 0.8        # main driver
            + booked_in_slot * 3
            + complexity * 8
            + (5 if day_of_week in [5, 6] else 0)       # weekends busier
            + (10 if time_slot in [1, 2] else 0)        # morning peak
            - experience_yrs * 0.4                       # experienced = faster
            + np.random.normal(0, 5)                     # noise
        )
        wait = max(5, min(180, wait))                    # clamp 5–180 min

        records.append([
            dept_id, doctor_id, time_slot, day_of_week, month,
            queue_length, booked_in_slot, avg_consult_min,
            experience_yrs, is_emergency, patient_age, complexity, wait
        ])
    return records

print("🔧 Generating synthetic training data...")
data = generate_data(N)
columns = [
    'department_id', 'doctor_id', 'time_slot', 'day_of_week', 'month',
    'current_queue_length', 'booked_slots_in_slot', 'avg_consultation_time',
    'doctor_experience_years', 'is_emergency', 'patient_age',
    'reason_complexity_score', 'wait_time_minutes'
]
df = pd.DataFrame(data, columns=columns)

print(f"✅ Dataset: {len(df)} records")
print(df[['department_id','current_queue_length','wait_time_minutes']].describe().round(1))

# ─── Features & Target ─────────────────────────────────────────────────────────
FEATURES = [
    'department_id', 'doctor_id', 'time_slot', 'day_of_week', 'month',
    'current_queue_length', 'booked_slots_in_slot', 'avg_consultation_time',
    'doctor_experience_years', 'is_emergency', 'patient_age', 'reason_complexity_score'
]
X = df[FEATURES]
y = df['wait_time_minutes']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ─── Scale ─────────────────────────────────────────────────────────────────────
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ─── Train Random Forest ────────────────────────────────────────────────────────
print("\n🌲 Training Random Forest Regressor...")
rf = RandomForestRegressor(
    n_estimators=200,
    max_depth=20,
    min_samples_split=5,
    min_samples_leaf=2,
    n_jobs=-1,
    random_state=42
)
rf.fit(X_train_scaled, y_train)

# ─── Evaluate ─────────────────────────────────────────────────────────────────
y_pred = rf.predict(X_test_scaled)
mae = mean_absolute_error(y_test, y_pred)
r2  = r2_score(y_test, y_pred)
print(f"📊 MAE: {mae:.2f} minutes | R²: {r2:.4f}")

# ─── Feature Importance ────────────────────────────────────────────────────────
importances = pd.Series(rf.feature_importances_, index=FEATURES).sort_values(ascending=False)
print("\n🔍 Top Feature Importances:")
print(importances.head(6).round(4))

# ─── Save Model ────────────────────────────────────────────────────────────────
os.makedirs('model', exist_ok=True)
joblib.dump(rf,     'model/trained_model.pkl')
joblib.dump(scaler, 'model/scaler.pkl')
joblib.dump(FEATURES, 'model/features.pkl')
print("\n✅ Model saved to model/trained_model.pkl")
print("✅ Scaler saved to model/scaler.pkl")
print("✅ Features saved to model/features.pkl")
print("\n🚀 You can now start the Flask API: python app.py")
