"""
MediQueue — Continuous ML Retraining & IQR Cleaning Pipeline
═════════════════════════════════════════════════════════════════════
Pulls completed doctor consultations from TiDB, cleans them using
pure statistical Interquartile Range (IQR) anomaly detection, refits
the Random Forest Regressor, and updates dynamic slot capacities in
both the TiDB database and model export files.

Usage:
    python retrain.py
"""

import os
import sys
import io
import json
import warnings
from datetime import datetime
import numpy as np
import pandas as pd
from dotenv import load_dotenv
import mysql.connector
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))
load_dotenv()

DB_HOST     = os.getenv('DB_HOST', 'localhost')
DB_PORT     = int(os.getenv('DB_PORT', 4000))
DB_USER     = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME     = os.getenv('DB_NAME', 'mediqueue')

SLOT_DURATION_MIN = 120  # MediQueue standard 2-hour slots

DEPARTMENT_NAMES = {
    1:  'Dentistry',
    2:  'Cardiology',
    3:  'Orthopedics',
    4:  'General Medicine',
    5:  'Neurology',
    6:  'Pediatrics',
    7:  'Dermatology',
    8:  'ENT',
    9:  'Ophthalmology',
    10: 'Gynecology',
    11: 'Radiology',
    12: 'Emergency'
}

def get_db_connection():
    """Establish connection to TiDB / MySQL database."""
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )

def ensure_clean_view(conn):
    """Ensure the privacy-preserving, zero-PII SQL view exists."""
    cursor = conn.cursor()
    create_view_sql = """
        CREATE OR REPLACE VIEW v_ml_clean_metrics AS
        SELECT 
            q.id AS queue_id,
            q.department_id,
            COALESCE(d.name, '') AS department_name,
            q.consultation_mins,
            TIMESTAMPDIFF(MINUTE, q.check_in_time, q.treatment_start_time) AS actual_wait_mins,
            HOUR(q.check_in_time) AS arrival_hour,
            DAYOFWEEK(q.check_in_time) AS day_of_week,
            MONTH(q.check_in_time) AS visit_month,
            a.age AS patient_age,
            a.gender,
            a.reason_for_visit,
            a.time_slot,
            q.check_in_time,
            q.treatment_start_time,
            q.completed_at,
            CASE WHEN q.department_id = 12 THEN 1 ELSE 0 END AS is_emergency
        FROM queue q
        JOIN appointments a ON q.appointment_id = a.id
        LEFT JOIN departments d ON q.department_id = d.id
        WHERE q.status = 'Completed' 
          AND q.consultation_mins IS NOT NULL
          AND q.treatment_start_time IS NOT NULL;
    """
    cursor.execute(create_view_sql)
    conn.commit()
    cursor.close()

def fetch_completed_consultations():
    """
    Extract strictly privacy-preserving de-identified operational metrics.
    Zero access to patient passwords, contact details, doctor or admin identities.
    """
    conn = get_db_connection()
    ensure_clean_view(conn)

    # Strictly query the privacy-preserving view (no raw tables queried directly)
    query = """
        SELECT 
            queue_id,
            department_id,
            department_name,
            consultation_mins,
            actual_wait_mins,
            arrival_hour,
            day_of_week,
            visit_month,
            patient_age,
            gender,
            reason_for_visit,
            time_slot,
            check_in_time,
            treatment_start_time,
            completed_at,
            is_emergency
        FROM v_ml_clean_metrics
        ORDER BY queue_id ASC
    """
    df = pd.read_sql(query, conn)
    conn.close()

    # Strict privacy safeguard: verify that zero sensitive columns ever enter ML memory
    FORBIDDEN_COLUMNS = {
        'password_hash', 'password', 'email', 'phone', 'first_name', 'last_name',
        'full_name', 'otp', 'otp_expiry', 'diagnosis', 'medicines', 'pdf_data',
        'qr_code_data', 'patient_id', 'doctor_id', 'username'
    }
    exposed = FORBIDDEN_COLUMNS.intersection(set(df.columns))
    if exposed:
        raise PermissionError(f"🔒 PRIVACY VIOLATION DETECTED: Sensitive columns {exposed} found in ML memory!")

    return df

def clean_by_iqr(df):
    """
    Perform department-wise Statistical IQR outlier filtering.
    Identifies and discards quick clicks and forgotten open tabs.
    """
    cleaned_rows = []
    outlier_rows = []
    cleaning_summary = []

    for dept_id in range(1, 13):
        dept_name = DEPARTMENT_NAMES.get(dept_id, f"Dept {dept_id}")
        dept_group = df[df['department_id'] == dept_id].copy()

        if len(dept_group) == 0:
            cleaning_summary.append({
                'dept_id': dept_id,
                'name': dept_name,
                'raw_count': 0,
                'clean_count': 0,
                'outliers': 0,
                'lower_bound': 0,
                'upper_bound': 0,
                'avg_consult': 18.0,
                'slot_capacity': 6
            })
            continue

        consultations = dept_group['consultation_mins'].astype(float)
        
        # Calculate IQR boundaries
        q25 = consultations.quantile(0.25)
        q75 = consultations.quantile(0.75)
        iqr = q75 - q25

        lower_bound = max(3.0, round(q25 - 1.5 * iqr, 1))
        upper_bound = round(q75 + 1.5 * iqr, 1)

        # Filter clean records vs outliers
        is_clean = (consultations >= lower_bound) & (consultations <= upper_bound)
        clean_df = dept_group[is_clean]
        outliers_df = dept_group[~is_clean]

        cleaned_rows.append(clean_df)
        if len(outliers_df) > 0:
            outlier_rows.append(outliers_df)

        clean_avg = round(float(clean_df['consultation_mins'].mean()), 1) if len(clean_df) > 0 else 18.0
        slot_cap = max(1, int(SLOT_DURATION_MIN / clean_avg))

        cleaning_summary.append({
            'dept_id': dept_id,
            'name': dept_name,
            'raw_count': len(dept_group),
            'clean_count': len(clean_df),
            'outliers': len(outliers_df),
            'q25': round(q25, 1),
            'q75': round(q75, 1),
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'avg_consult': clean_avg,
            'slot_capacity': slot_cap
        })

    clean_all_df = pd.concat(cleaned_rows, ignore_index=True) if cleaned_rows else pd.DataFrame()
    outliers_all_df = pd.concat(outlier_rows, ignore_index=True) if outlier_rows else pd.DataFrame()

    return clean_all_df, outliers_all_df, cleaning_summary

def update_db_slot_capacities(cleaning_summary):
    """Upsert new empirical averages and slot capacities into dept_consultation_stats."""
    conn = get_db_connection()
    cursor = conn.cursor()

    upsert_sql = """
        INSERT INTO dept_consultation_stats 
          (department_id, avg_consultation_mins, slot_capacity, total_samples, last_updated)
        VALUES (%s, %s, %s, %s, NOW())
        ON DUPLICATE KEY UPDATE
          avg_consultation_mins = VALUES(avg_consultation_mins),
          slot_capacity = VALUES(slot_capacity),
          total_samples = VALUES(total_samples),
          last_updated = NOW()
    """

    for item in cleaning_summary:
        if item['clean_count'] > 0:
            cursor.execute(upsert_sql, (
                item['dept_id'],
                item['avg_consult'],
                item['slot_capacity'],
                item['clean_count']
            ))

    conn.commit()
    cursor.close()
    conn.close()

def export_json_and_stats(cleaning_summary, clean_df):
    """Export dept_consultation.json and dept_stats.csv for backend and ML service."""
    os.makedirs('model', exist_ok=True)
    export_dict = {}

    for item in cleaning_summary:
        dept_id_str = str(item['dept_id'])
        export_dict[dept_id_str] = {
            'department_name':       item['name'],
            'avg_consultation_min':  item['avg_consult'],
            'slot_duration_min':     SLOT_DURATION_MIN,
            'max_patients_per_slot': item['slot_capacity'],
            'total_samples':         item['clean_count'],
            'calculation':           f"floor(120 / {item['avg_consult']}) = {item['slot_capacity']}"
        }

    with open('model/dept_consultation.json', 'w') as f:
        json.dump(export_dict, f, indent=2)

    # Compute department wait stats if treatment start times exist
    clean_df['wait_target'] = (
        pd.to_datetime(clean_df['treatment_start_time']) - pd.to_datetime(clean_df['check_in_time'])
    ).dt.total_seconds() / 60.0

    clean_df['wait_target'] = clean_df['wait_target'].clip(lower=5.0, upper=120.0).fillna(25.0)

    dept_stats = clean_df.groupby('department_id')['wait_target'].agg(['mean', 'median', 'std']).round(1)
    dept_stats.columns = ['avg_wait', 'median_wait', 'std_wait']
    dept_stats.to_csv('model/dept_stats.csv')

def retrain_random_forest(clean_df):
    """Refit Random Forest ML model on clean operational data."""
    df2 = clean_df.copy()

    # Feature Engineering
    SLOT_HOURS = {'8:00-10:00': 0, '10:00-12:00': 1, '12:00-14:00': 2,
                  '14:00-16:00': 3, '16:00-18:00': 4, '18:00-20:00': 5}
    df2['time_slot_num'] = df2['time_slot'].map(SLOT_HOURS).fillna(1).astype(int)

    check_in_dt = pd.to_datetime(df2['check_in_time'])
    df2['day_of_week'] = check_in_dt.dt.dayofweek.fillna(0).astype(int)
    df2['month']       = check_in_dt.dt.month.fillna(6).astype(int)
    df2['is_weekend']  = df2['day_of_week'].apply(lambda d: 1 if d >= 5 else 0)

    REASON_MAP = {
        'Vaccination': 1, 'Routine checkup': 1, 'Prescription renewal': 1,
        'Follow-up procedure': 2, 'Consultation': 2, 'Chronic condition': 2,
        'Acute illness': 2, 'Post-operative': 2, 'Injury': 2,
        'Biopsy': 3, 'MRI': 3, 'CT scan': 3, 'X-ray': 2,
    }
    df2['complexity']   = df2['reason_for_visit'].map(REASON_MAP).fillna(2)
    df2['patient_age']  = pd.to_numeric(df2['patient_age'], errors='coerce').fillna(35)
    df2['is_emergency'] = df2['department_id'].apply(lambda d: 1 if d == 12 else 0)

    # Operational features
    df2['current_queue_length'] = 5
    df2['providers_on_shift']   = 4
    df2['nurses_on_shift']      = 6
    df2['staff_ratio']          = 0.35
    df2['is_online_booking']    = 1
    df2['occupancy_rate']       = 0.60

    # Wait target
    df2['wait_target'] = (
        pd.to_datetime(df2['treatment_start_time']) - pd.to_datetime(df2['check_in_time'])
    ).dt.total_seconds() / 60.0
    df2['wait_target'] = df2['wait_target'].clip(lower=5.0, upper=120.0).fillna(25.0)

    features = [
        'department_id',
        'time_slot_num',
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

    # Map time_slot_num to time_slot for feature alignment with app.py
    df2['time_slot'] = df2['time_slot_num']
    features_aligned = [f if f != 'time_slot_num' else 'time_slot' for f in features]

    X = df2[features_aligned]
    y = df2['wait_target']

    if len(X) < 10:
        print("⚠️ Insufficient data for Random Forest training (minimum 10 rows).")
        return None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = MinMaxScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    rf = RandomForestRegressor(
        n_estimators=150,
        max_depth=15,
        min_samples_split=4,
        min_samples_leaf=2,
        n_jobs=-1,
        random_state=42
    )
    rf.fit(X_train_scaled, y_train)

    y_pred = rf.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    import joblib
    joblib.dump(rf,               'model/trained_model.pkl')
    joblib.dump(scaler,           'model/scaler.pkl')
    joblib.dump(features_aligned, 'model/features.pkl')

    return {'mae': round(mae, 2), 'r2': round(r2, 4)}

def run_pipeline():
    """Main execution function for automated retraining."""
    print("=" * 72)
    print("  MediQueue Continuous Retraining & Statistical IQR Cleaning Pipeline")
    print("=" * 72)

    # 1. Fetch data
    print(f"\n📡 Connecting to TiDB ({DB_HOST}:{DB_PORT}/{DB_NAME})...")
    df = fetch_completed_consultations()
    raw_total = len(df)
    print(f"✅ Extracted {raw_total} raw completed consultation records.")

    if raw_total == 0:
        print("❌ No completed records found. Seed records first: node backend/scripts/seedClinicalTrainingData.js")
        return False

    # 2. IQR Anomaly Cleaning
    print("\n🧹 Executing Department-wise Statistical IQR Outlier Filtering...")
    clean_df, outliers_df, summary = clean_by_iqr(df)
    clean_total = len(clean_df)
    outliers_total = len(outliers_df)

    print(f"   Raw Records     : {raw_total}")
    print(f"   Clean Records   : {clean_total} ({clean_total/raw_total*100:.1f}%)")
    print(f"   Outliers Purged : {outliers_total} ({outliers_total/raw_total*100:.1f}%)")

    # 3. Print Detailed IQR Cleaning Table
    print("\n📊 Department Statistical Breakdown & Dynamic Slot Capacity:")
    header = f"  {'Dept':<18} {'Raw':>5} {'Clean':>6} {'Outliers':>8} {'IQR Bounds':>15} {'Avg Consult':>12} {'Slot Cap':>9}"
    print(header)
    print("  " + "─" * (len(header) - 2))

    for s in summary:
        iqr_str = f"[{s['lower_bound']}m - {s['upper_bound']}m]"
        print(f"  {s['name']:<18} {s['raw_count']:>5} {s['clean_count']:>6} {s['outliers']:>8} "
              f"{iqr_str:>15} {s['avg_consult']:>10.1f}m {s['slot_capacity']:>7} slots")

    # 4. Synchronize TiDB Database
    print("\n💾 Updating TiDB table 'dept_consultation_stats' with empirical capacities...")
    update_db_slot_capacities(summary)
    print("✅ TiDB slot capacities and consultation statistics successfully updated!")

    # 5. Export JSON & CSV files
    print("\n📁 Exporting model/dept_consultation.json and model/dept_stats.csv...")
    export_json_and_stats(summary, clean_df)
    print("✅ Model consultation parameters exported.")

    # 6. Retrain Random Forest Regressor
    print("\n🌲 Refitting Random Forest Regressor on clean operational dataset...")
    metrics = retrain_random_forest(clean_df)
    if metrics:
        print(f"✅ Random Forest refitted successfully! (MAE: {metrics['mae']}m, R²: {metrics['r2']})")
        print("   Saved to model/trained_model.pkl, model/scaler.pkl, model/features.pkl")

    print("\n" + "=" * 72)
    print("  🎉 Automated Cleaning & Continuous Retraining Pipeline Completed!")
    print("=" * 72)
    return True

if __name__ == '__main__':
    run_pipeline()
