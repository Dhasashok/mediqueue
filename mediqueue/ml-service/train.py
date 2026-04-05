"""
MediQueue ML Training Script — Using Real Hospital Dataset
═══════════════════════════════════════════════════════════════════

Dataset : Hospital_Wait__TIme_Data.csv
Records : 5,000 real hospital patient records
Target  : TriageToProviderStartTime — actual queue wait time (minutes)
Model   : Random Forest Regressor

─── How Slot Capacity Was Decided (from real data) ─────────────
Each appointment slot at MediQueue is 2 hours (120 minutes).
The dataset gives us the real average consultation time per department.
We divide: slot_capacity = floor(120 / avg_consultation_minutes)

Department          Avg Consultation   2hr Slot Capacity
─────────────────   ────────────────   ─────────────────
Radiology           18.2 min           6 patients
Pediatrics          18.5 min           6 patients
Internal Medicine   18.6 min           6 patients
Emergency           18.6 min           6 patients
Neurology           18.7 min           6 patients
Oncology            18.7 min           6 patients
Cardiology          18.8 min           6 patients
Orthopedics         18.8 min           6 patients
Obstetrics          18.9 min           6 patients
General Surgery     19.2 min           6 patients

All departments → max 6 patients per 2-hour slot (data-driven decision).

─── Real Wait Time by Department (from 5000 records) ───────────
Department          Avg Queue Wait     Sample Size
─────────────────   ──────────────     ───────────
Neurology           64.0 min           499 patients
Internal Medicine   61.2 min           505 patients
Orthopedics         57.6 min           492 patients
General Surgery     55.4 min           506 patients
Cardiology          53.7 min           485 patients
Oncology            50.2 min           530 patients
Emergency           47.6 min           486 patients
Pediatrics          44.3 min           527 patients
Obstetrics          41.9 min           481 patients
Radiology           41.1 min           489 patients

These real averages are what the ML model learns to predict.

Usage: python train.py
Output: model/trained_model.pkl
        model/scaler.pkl
        model/features.pkl
        model/dept_map.json
        model/dept_stats.csv
        model/dept_consultation.json  ← NEW: used by appointmentController
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import joblib
import os
import json
import warnings
warnings.filterwarnings('ignore')

print("=" * 65)
print("  MediQueue ML Training — Real Hospital Dataset (5000 records)")
print("=" * 65)

# ─── Load Dataset ──────────────────────────────────────────────
CSV_PATH = 'Hospital_Wait__TIme_Data.csv'
print(f"\n📂 Loading: {CSV_PATH}")
df = pd.read_csv(CSV_PATH)
print(f"✅ Loaded {len(df)} records, {len(df.columns)} columns")

# ─── Department Mapping (name → mediqueue DB id) ───────────────
DEPT_MAP = {
    'Internal Medicine': 1,
    'Cardiology':        2,
    'Orthopedics':       3,
    'General Surgery':   4,
    'Neurology':         5,
    'Pediatrics':        6,
    'Oncology':          7,
    'Emergency':         8,
    'Obstetrics':        9,
    'Radiology':         10,
}

# ─── Slot Capacity from Real Data ─────────────────────────────
# Calculated as: floor(120 min slot / avg consultation time per dept)
# This is the authoritative source — appointmentController reads this file
print("\n📊 Computing slot capacity from real consultation times...")

dept_consult_raw = df.groupby('Department')['ConsultationDurationTime'].mean().round(1)

SLOT_CAPACITY = {}       # dept_id → max patients per 2hr slot
CONSULT_TIMES = {}       # dept_id → avg consultation minutes
DEPT_CONSULT_EXPORT = {} # for JSON export (used by backend)

for dept_name, avg_consult in dept_consult_raw.items():
    dept_id = DEPT_MAP.get(dept_name)
    if dept_id is None:
        continue
    capacity = int(120 / avg_consult)  # floor division
    SLOT_CAPACITY[dept_id]  = capacity
    CONSULT_TIMES[dept_id]  = float(round(avg_consult, 1))
    DEPT_CONSULT_EXPORT[str(dept_id)] = {
        'department_name':        dept_name,
        'avg_consultation_min':   float(round(avg_consult, 1)),
        'slot_duration_min':      120,
        'max_patients_per_slot':  capacity,
        'calculation':            f"floor(120 / {round(avg_consult,1)}) = {capacity}"
    }

print("\n  Department              Avg Consult   2hr Capacity   Calculation")
print("  " + "─" * 63)
for dept_name in sorted(DEPT_CONSULT_EXPORT, key=lambda k: int(k)):
    d = DEPT_CONSULT_EXPORT[dept_name]
    print(f"  {d['department_name']:<22} {d['avg_consultation_min']:>6.1f} min   "
          f"{d['max_patients_per_slot']:>4} patients    {d['calculation']}")

# ─── Feature Engineering ───────────────────────────────────────
print("\n🔧 Engineering features...")
df2 = df.copy()

df2['department_id'] = df2['Department'].map(DEPT_MAP).fillna(1).astype(int)

AGE_MAP = {
    'Pediatric (0-17)':    8,
    'Young Adult (18-35)': 25,
    'Adult (36-60)':       48,
    'Senior (61+)':        70
}
df2['patient_age'] = df2['AgeGroup'].map(AGE_MAP).fillna(30)

DAY_MAP = {'Mon':0,'Tue':1,'Wed':2,'Thu':3,'Fri':4,'Sat':5,'Sun':6}
df2['day_of_week'] = df2['DayOfWeek'].map(DAY_MAP).fillna(0)

MONTH_MAP = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
             'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}
df2['month']      = df2['Month'].map(MONTH_MAP).fillna(6)
df2['is_weekend'] = df2['IsWeekend'].apply(lambda x: 1 if str(x).upper() == 'TRUE' else 0)
df2['is_emergency'] = df2['TriageCategory'].apply(
    lambda x: 1 if str(x).lower() in ['urgent', 'emergency'] else 0
)

df2['arrival_hour'] = pd.to_numeric(df2['ArrivalHour'], errors='coerce').fillna(10)
df2['time_slot']    = df2['arrival_hour'].apply(
    lambda h: 0 if h < 10 else (1 if h < 12 else (2 if h < 14 else (3 if h < 16 else (4 if h < 18 else 5))))
)

df2['occupancy_rate']       = pd.to_numeric(df2['FacilityOccupancyRate'], errors='coerce').fillna(0.5)
df2['current_queue_length'] = (df2['occupancy_rate'] * 15).astype(int)
df2['providers_on_shift']   = pd.to_numeric(df2['ProvidersOnShift'], errors='coerce').fillna(5)
df2['nurses_on_shift']      = pd.to_numeric(df2['NursesOnShift'], errors='coerce').fillna(8)
df2['staff_ratio']          = pd.to_numeric(df2['StaffToPatientRatio'], errors='coerce').fillna(0.3)
df2['is_online_booking']    = pd.to_numeric(df2['IsOnlineBooking'], errors='coerce').fillna(0).astype(int)

REASON_MAP = {
    'Vaccination': 1, 'Routine checkup': 1, 'Prescription renewal': 1,
    'Follow-up procedure': 2, 'Consultation': 2, 'Chronic condition': 2,
    'Acute illness': 2, 'Post-operative': 2, 'Injury': 2,
    'Biopsy': 3, 'MRI': 3, 'CT scan': 3, 'X-ray': 2,
}
df2['complexity'] = df2['ReasonForVisit'].map(REASON_MAP).fillna(2)

# Target: actual queue wait time from real data
df2['wait_target'] = pd.to_numeric(df2['TriageToProviderStartTime'], errors='coerce')
df2 = df2.dropna(subset=['wait_target'])
df2 = df2[(df2['wait_target'] >= 0) & (df2['wait_target'] <= 300)]

print(f"✅ Clean records: {len(df2)}")
print(f"   Wait time mean: {df2['wait_target'].mean():.1f} min")
print(f"   Wait time range: {df2['wait_target'].min():.0f} – {df2['wait_target'].max():.0f} min")

# ─── Per-Department Wait Stats ─────────────────────────────────
dept_stats = df2.groupby('Department')['wait_target'].agg(['mean','median','std']).round(1)
dept_stats.columns = ['avg_wait', 'median_wait', 'std_wait']

print("\n📊 Real wait time per department (what ML learns to predict):")
print(f"  {'Department':<22} {'Avg Wait':>10} {'Median':>8} {'Std':>6}  {'Records':>7}")
print("  " + "─" * 57)
for dept, row in dept_stats.sort_values('avg_wait', ascending=False).iterrows():
    n = len(df2[df2['Department'] == dept])
    print(f"  {dept:<22} {row['avg_wait']:>8.1f}m {row['median_wait']:>6.1f}m {row['std_wait']:>5.1f}  {n:>7}")

os.makedirs('model', exist_ok=True)
dept_stats.to_csv('model/dept_stats.csv')

# ─── Features ─────────────────────────────────────────────────
FEATURES = [
    'department_id',
    'time_slot',
    'day_of_week',
    'month',
    'is_weekend',
    'current_queue_length',
    'providers_on_shift',
    'nurses_on_shift',
    'staff_ratio',
    'is_emergency',
    'patient_age',
    'complexity',
    'is_online_booking',
    'occupancy_rate'
]

X = df2[FEATURES]
y = df2['wait_target']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

scaler         = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ─── Train Random Forest ───────────────────────────────────────
print("\n🌲 Training Random Forest on 5000 real hospital records...")
rf = RandomForestRegressor(
    n_estimators=300,
    max_depth=25,
    min_samples_split=4,
    min_samples_leaf=2,
    max_features='sqrt',
    n_jobs=-1,
    random_state=42
)
rf.fit(X_train_scaled, y_train)

# ─── Evaluate ─────────────────────────────────────────────────
y_pred = rf.predict(X_test_scaled)
mae    = mean_absolute_error(y_test, y_pred)
rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
r2     = r2_score(y_test, y_pred)

print(f"\n📊 Overall Model Performance:")
print(f"   MAE  : {mae:.1f} min  ← average prediction error")
print(f"   RMSE : {rmse:.1f} min")
print(f"   R²   : {r2:.4f}  (1.0 = perfect)")

# ─── Per-Department Accuracy ──────────────────────────────────
test_df              = X_test.copy()
test_df['actual']    = y_test.values
test_df['predicted'] = y_pred
test_df['dept_name'] = df2.loc[X_test.index, 'Department'].values
test_df['dept_avg']  = df2.loc[X_test.index, 'Department'].map(
    dept_stats['avg_wait'].to_dict()
).values

print(f"\n📊 Per-Department Accuracy (MAE = avg error in minutes):")
print(f"  {'Department':<22} {'Actual Avg':>11} {'Predicted Avg':>14} {'MAE':>8}")
print("  " + "─" * 58)
for dept in sorted(test_df['dept_name'].unique()):
    sub       = test_df[test_df['dept_name'] == dept]
    dept_mae  = mean_absolute_error(sub['actual'], sub['predicted'])
    act_avg   = sub['actual'].mean()
    pred_avg  = sub['predicted'].mean()
    print(f"  {dept:<22} {act_avg:>9.1f}m {pred_avg:>12.1f}m {dept_mae:>7.1f}m")

# ─── Feature Importance ───────────────────────────────────────
imp = pd.Series(rf.feature_importances_, index=FEATURES).sort_values(ascending=False)
print("\n🔍 Top Features (what drives wait time predictions):")
for feat, score in imp.head(6).items():
    bar = '█' * int(score * 50)
    print(f"  {feat:<28} {score:.4f}  {bar}")

# ─── Save All Model Files ─────────────────────────────────────
joblib.dump(rf,       'model/trained_model.pkl')
joblib.dump(scaler,   'model/scaler.pkl')
joblib.dump(FEATURES, 'model/features.pkl')

with open('model/dept_map.json', 'w') as f:
    json.dump(DEPT_MAP, f, indent=2)

# ← NEW: save slot capacity + consultation times for backend use
with open('model/dept_consultation.json', 'w') as f:
    json.dump(DEPT_CONSULT_EXPORT, f, indent=2)

print("\n" + "=" * 65)
print("  ✅ Training Complete!")
print("=" * 65)
print(f"  model/trained_model.pkl   ← Random Forest model")
print(f"  model/scaler.pkl          ← MinMaxScaler")
print(f"  model/features.pkl        ← feature list")
print(f"  model/dept_map.json       ← dept name → DB id mapping")
print(f"  model/dept_stats.csv      ← real avg wait per dept")
print(f"  model/dept_consultation.json ← slot capacity per dept")
print(f"\n  MAE: {mae:.1f} min | R²: {r2:.4f}")
print(f"\n  Slot capacity (all depts): 6 patients per 2hr slot")
print(f"  Reason: avg consultation ≈ 18–19 min → 120/19 = 6 patients")
print(f"\n🚀 Now run: python app.py")
print("=" * 65)