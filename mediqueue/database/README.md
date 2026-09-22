# 🗄️ MediQueue Database Guide

This directory contains the database schema definitions and seed data for the **MediQueue** platform.

---

## 📋 Schema Files

| File | Character Set & Collation | Intended Environment | Description |
| :--- | :--- | :--- | :--- |
| [`schema.sql`](file:///d:/Anti_Gravity_Workspace/mediqueue/database/schema.sql) | `utf8mb4_general_ci` | Standard MySQL 5.7+ / MariaDB / Clever Cloud / Railway | Full schema including initial tables, views, and seed data. |
| [`schema_fixed.sql`](file:///d:/Anti_Gravity_Workspace/mediqueue/database/schema_fixed.sql) | `utf8mb4_0900_ai_ci` | MySQL 8.0+ / TiDB Cloud / AWS RDS | Standardized for modern MySQL 8.0+ collation and GTID replication. |

---

## 🏛️ Core Relational Entities

- **`admins`**: Administrative accounts with permissions to approve doctors, monitor hospital-wide queues, and manage analytics.
- **`departments`**: Hospital departments (Cardiology, Orthopedics, General Surgery, Pediatrics, Emergency, etc.).
- **`doctors`**: Registered practitioners associated with departments, pending approval flags, and daily schedules.
- **`doctor_leaves`**: Self-service and administrator-assigned leave schedules.
- **`patients`**: Registered users with verified email/phone and medical history profiles.
- **`appointments`**: Patient bookings containing date, 2-hour slot, token number, unique booking ID (`MQ-XXXXXX-XXXX`), calculated arrival window, QR code payload, and ML wait time prediction.
- **`queue`**: Real-time status tracker (`Waiting`, `In-Progress`, `Completed`, `No-Show`), timestamping check-in, treatment start, and completion.
- **`dept_consultation_stats`**: Department-level machine learning dynamic averages and capacity metrics:
  - `avg_consultation_mins`: Historical moving average.
  - `slot_capacity`: Maximum patients per 2-hour slot ($\lfloor 120 / \text{avg\_consultation\_mins} \rfloor$).
- **`prescriptions`**: Digital e-prescriptions with diagnostic notes, medicines, dosage, and doctor sign-off.
- **`v_ml_clean_metrics`** *(SQL View)*: Privacy-preserving, zero-PII SQL abstraction view generated for the continuous ML retraining pipeline (`retrain.py`). Strips all patient names, passwords, emails, and diagnosis notes, exposing only anonymized clinical timestamps, queue lengths, and department metrics.

---

## 🚀 Setup & Import Instructions

### Option 1: Using MySQL Command Line

```bash
# For standard MySQL / MariaDB
mysql -h <host> -P <port> -u <username> -p <database_name> < schema.sql

# For MySQL 8.0+ / TiDB Cloud
mysql -h <host> -P <port> -u <username> -p <database_name> < schema_fixed.sql
```

### Option 2: Using GUI Clients (DBeaver, phpMyAdmin, MySQL Workbench)

1. Connect to your database instance.
2. Open SQL Editor.
3. Paste the contents of `schema.sql` (or `schema_fixed.sql`).
4. Execute script to build tables and insert seed data.

### Option 3: Verifying Database Connection

Once imported, test the connection via the backend:
```bash
cd ../backend
npm start
```
A successful startup will display:
```text
🏥 MediQueue Backend — port 5000
🌐 NODE_ENV: development
📡 Socket.io ready
✅ Database connected
```
