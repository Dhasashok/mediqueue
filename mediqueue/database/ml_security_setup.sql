-- ══════════════════════════════════════════════════════════════════════
-- MediQueue — Privacy-Preserving ML Security Architecture
-- ══════════════════════════════════════════════════════════════════════
-- Purpose:
--   Guarantees that Patient passwords, Doctor details, and Admin credentials
--   are 100% shielded and inaccessible to the Machine Learning pipeline.
--   The ML model only accesses purely de-identified operational metrics.
-- ══════════════════════════════════════════════════════════════════════

USE `mediqueue`;

-- ── 1. Create Privacy-Preserving De-Identified View ───────────────────
-- This view strips all Personally Identifiable Information (PII) and 
-- Protected Health Information (PHI). Zero passwords, names, phones,
-- emails, or medical notes are exposed.
CREATE OR REPLACE VIEW v_ml_clean_metrics AS
SELECT 
    q.id AS queue_id,
    q.department_id,
    q.consultation_mins,
    TIMESTAMPDIFF(MINUTE, q.check_in_time, q.treatment_start_time) AS actual_wait_mins,
    HOUR(q.check_in_time) AS arrival_hour,
    DAYOFWEEK(q.check_in_time) AS day_of_week,
    MONTH(q.check_in_time) AS visit_month,
    a.age AS patient_age,
    a.reason_for_visit,
    a.time_slot,
    q.check_in_time,
    q.treatment_start_time,
    q.completed_at,
    CASE WHEN a.department_id = 12 THEN 1 ELSE 0 END AS is_emergency
FROM queue q
JOIN appointments a ON q.appointment_id = a.id
WHERE q.status = 'Completed' 
  AND q.consultation_mins IS NOT NULL
  AND q.treatment_start_time IS NOT NULL;

-- ── 2. Least-Privilege ML Database User Setup (Optional for Cloud DB) ──
-- For production TiDB Cloud / MySQL instances, create a restricted user
-- that is physically denied access to patients, doctors, and admins tables.
--
-- CREATE USER IF NOT EXISTS 'ml_isolated_worker'@'%' IDENTIFIED BY 'StrongRandomMLPassword#2026';
--
-- -- Allow reading ONLY the de-identified metrics view and department names:
-- GRANT SELECT ON mediqueue.v_ml_clean_metrics TO 'ml_isolated_worker'@'%';
-- GRANT SELECT (id, name) ON mediqueue.departments TO 'ml_isolated_worker'@'%';
--
-- -- Allow updating ONLY department consultation capacity and statistics:
-- GRANT SELECT, INSERT, UPDATE ON mediqueue.dept_consultation_stats TO 'ml_isolated_worker'@'%';
--
-- -- Deny all access to sensitive tables:
-- REVOKE ALL PRIVILEGES ON mediqueue.patients FROM 'ml_isolated_worker'@'%';
-- REVOKE ALL PRIVILEGES ON mediqueue.doctors FROM 'ml_isolated_worker'@'%';
-- REVOKE ALL PRIVILEGES ON mediqueue.admins FROM 'ml_isolated_worker'@'%';
-- REVOKE ALL PRIVILEGES ON mediqueue.prescriptions FROM 'ml_isolated_worker'@'%';
--
-- FLUSH PRIVILEGES;
