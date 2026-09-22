<div align="center">

# 🏥 MediQueue
### Smart AI-Powered Hospital Queue Optimization & Appointment Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.6-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://frontend-phi-ruby-62.vercel.app)

*An intelligent multi-tier healthcare orchestration platform that eliminates waiting room congestion, reduces patient waiting times, prevents physician burnout, and delivers live digital queue tracking.*

[Features](#-key-features) • [Architecture](#-system-architecture) • [Workflow](#-end-to-end-workflow) • [Machine Learning](#-machine-learning--smart-queue-engine) • [Installation](#-getting-started) • [API Reference](#-api-endpoints) • [Deployment](#-deployment)

</div>

---

## 📖 Overview

Traditional hospital outpatient workflows suffer from unpredictable arrival surges, static slot allocations, and crowded waiting rooms. **MediQueue** solves this through:

1. **AI-Driven Wait Time Forecasting**: A Random Forest regression model trained on real-world clinical wait-time records estimates dynamic wait periods before arrival.
2. **Dynamic Slot Capacities & Staggered Arrival Windows**: Automatically sizes 2-hour consultation slots based on empirical doctor consultation times and gives each patient a customized arrival window (~30 minutes before expected turn), preventing peak-hour waiting room overcrowding.
3. **Live Digital Queue Synchronization**: Real-time WebSockets (Socket.io) propagate queue progression instantly to waiting area screens and patient mobile devices.
4. **Touchless QR Check-Ins**: Instant contactless arrival verification upon entering the hospital premises.
5. **Integrated Clinical Suite**: End-to-end management for e-prescriptions, doctor leaves, role-based dashboards, and hospital analytics.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["🖥️ Frontend Tier (React 18 SPA)"]
        P_UI["Patient Portal<br/>• Booking & QR Pass<br/>• Live Queue Tracking<br/>• E-Prescriptions"]
        D_UI["Doctor Dashboard<br/>• Real-time Consultation Queue<br/>• Status Controller (Start/Complete/No-Show)<br/>• Prescription Generator"]
        A_UI["Admin Dashboard<br/>• Doctor Approvals & Leave Manager<br/>• Department Queues & Wait Stats<br/>• Real-time System Analytics"]
    end

    subgraph BackendLayer["⚙️ Backend Tier (Node.js Express + Socket.io)"]
        AUTH["Auth & Security Controller<br/>• JWT Authentication<br/>• Rate Limiting & OTP Dispatch"]
        APPT["Appointment Controller<br/>• Staggered Arrival Windows<br/>• Dynamic Slot Capacities<br/>• QR Code Generation"]
        QUEUE["Queue Engine<br/>• Live Status Transitions<br/>• Real Consultation Duration Tracking<br/>• 23:59 IST Nightly Recalculation Cron"]
        SOCKET["Socket.io Hub<br/>• Live Queue Broadcasts<br/>• Instant Status Push"]
    end

    subgraph MLLayer["🧠 ML Intelligence Tier (Python Flask)"]
        FLASK_API["REST Prediction Endpoints<br/>/predict-wait & /predict-batch"]
        RF_MODEL["Random Forest Model<br/>(Hospital_Wait_Time_Data.csv)"]
    end

    subgraph DataLayer["🗄️ Persistence Tier (MySQL / TiDB)"]
        DB[("MySQL Database<br/>• users, doctors, departments<br/>• appointments, queue, prescriptions<br/>• dept_consultation_stats, doctor_leaves")]
    end

    subgraph NotificationLayer["📧 Notification Tier"]
        SMTP["Gmail SMTP / Nodemailer<br/>• Verification OTPs<br/>• Booking Passes & Reminders"]
    end

    ClientLayer <-->|REST API & WebSockets| BackendLayer
    BackendLayer <-->|Connection Pool / SQL| DataLayer
    BackendLayer -->|HTTP Wait Prediction| MLLayer
    MLLayer --> RF_MODEL
    BackendLayer -->|Non-blocking Dispatch| NotificationLayer
```

---

## 🔄 End-to-End Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant Frontend as React Frontend
    participant Backend as Express Backend
    participant ML as Flask ML Service
    participant DB as MySQL Database
    actor Doctor
    actor Admin

    Patient->>Frontend: Select Department, Doctor & Time Slot
    Frontend->>Backend: Request Booking + Patient Details
    Backend->>DB: Fetch Dynamic Slot Capacity & Queue Count
    Backend->>ML: POST /predict-wait (Queue Depth, Age, Slot, Dept)
    ML-->>Backend: Return Predicted Wait (mins)
    Backend->>Backend: Compute Staggered Arrival Window & QR Code
    Backend->>DB: Save Appointment Record
    Backend-->>Patient: Send Confirmation Email with QR Code & Arrival Window
    
    Note over Patient,Frontend: On Day of Consultation
    Patient->>Admin: Arrives at Hospital during Arrival Window
    Admin->>Backend: Scans Patient QR Code (POST /queue/checkin)
    Backend->>DB: Transition Queue Status to 'Waiting'
    Backend->>Frontend: Broadcast Socket 'queue_updated'

    Doctor->>Frontend: Clicks ▶ Start Treatment
    Frontend->>Backend: PUT /queue/:id/start
    Backend->>DB: Set status='In-Progress', treatment_start_time=NOW()
    Backend->>Frontend: Broadcast Socket 'queue_updated'

    Doctor->>Frontend: Clicks ✓ Complete + Generates E-Prescription
    Frontend->>Backend: PUT /queue/:id/complete (save prescription)
    Backend->>DB: Record completed_at, calculate consultation duration
    Backend->>Frontend: Broadcast Socket 'queue_updated'
    Backend-->>Patient: Email Consultation Completion & Prescription Access

    Note over Backend,DB: Nightly at 23:59 IST
    Backend->>DB: Recalculate 20-day moving avg consultation time per dept
    Backend->>DB: Update dept_consultation_stats & slot_capacity
```

---

## ✨ Key Features

### 👤 Patient Experience
- **Frictionless Booking**: Browse hospital departments, doctor profiles, availability schedules, and available 2-hour slots.
- **Staggered Arrival Windows**: Personalized arrival recommendations (~30 minutes before appointment) to eliminate physical waiting room crowds.
- **Digital Health Pass**: Instant generation of QR codes containing verified booking tokens.
- **Real-Time Token Tracking**: Watch your token position update live without refreshing the browser.
- **E-Prescriptions**: Directly view and store digital prescriptions issued by consulting physicians.
- **Automated Alerts**: Email notifications for registration OTP, appointment confirmation, check-in, and completion.

### 📱 Mobile-First Healthcare Experience
- **2x2 Quick Access Matrix**: Clean, clinical mobile home screen with dedicated cards for **Book Doctor**, **Live Queue**, **My QR Pass**, and **24/7 Emergency Care (108)**.
- **Live OPD Wait Ticker**: Pulsing status bar showing average OPD wait times and active specialties.
- **Mobile Bottom Navigation Dock (`BottomNav`)**: Fixed dock for rapid single-tap navigation between Home, Find Hospital, Live Queue, and Profile.
- **Touch & Viewport Optimization**: Responsive engine preventing horizontal overflow, left-edge text clipping, and card squishing on small mobile viewports (360px–430px).

### 🩺 Doctor Suite
- **Interactive Live Queue**: Clean, synchronized dashboard showing all checked-in patients in order of arrival.
- **Action Controls**: Simple one-click progression (`▶ Start`, `✓ Complete`, `✕ Mark No-Show`).
- **Precision Duration Tracking**: System captures true patient interaction duration (`completed_at - treatment_start_time`), filtering out idle queue time.
- **E-Prescription Builder**: Built-in modal to prescribe medications, dosage instructions, and diagnostic notes.
- **Leave Management**: Self-service time-off requests automatically blocking patient booking slots for affected dates.

### 🛡️ Hospital Administration & Operations
- **Doctor Approval Pipeline**: Review newly registered practitioners before granting clinical access.
- **Interactive ML Calibrator**: Real-time admin control to inspect department consultation moving averages, preview next-day slot capacities, and trigger dynamic capacity recalibration.
- **7-Day Wait Trends & Peak Hours Visualizer**: Analytics dashboard tracking hourly congestion patterns, weekly patient volume, and department queue velocities.
- **Multi-Status Appointment Filtering**: Filter appointments by status pill tabs (*All, Waiting, In-Progress, Completed, No-Show*), doctor search, and date-range pickers.
- **Master Scheduling**: Full visibility over today's appointments, upcoming schedules, and manual doctor leave overrides.
- **Contactless Reception Scanning**: QR scanner to check-in arriving patients instantly.

---

## 🧠 Machine Learning & Smart Queue Engine

MediQueue deploys a dedicated Python Flask machine learning microservice (`ml-service/`) that transforms static scheduling into an adaptive, data-driven queue orchestration engine.

### 1. Model Architecture & Training
- **Algorithm**: **Random Forest Regressor** (`n_estimators=100`, `random_state=42`) trained on real-world outpatient consultation datasets (`Hospital_Wait_Time_Data.csv`, 5,000+ records).
- **Preprocessing**: `MinMaxScaler` normalization across operational and patient features to handle differing scales uniformly.
- **Inference Latency**: Sub-15ms prediction response times under concurrent load.
- **Output Bucketing**: Predictions are floored at 5 minutes and rounded to the nearest 5-minute increment to provide clean, patient-friendly arrival estimates.

### 2. The 14-Feature Input Dimension Vector
The model ingests 14 dynamic operational and clinical variables for every prediction request:

| # | Feature | Type | Range / Format | Description |
| :-: | :--- | :---: | :---: | :--- |
| **1** | `department_id` | Integer | `1 - 12` | Mapped hospital specialty (Cardiology, Orthopedics, Neurology, etc.). |
| **2** | `time_slot` | Categorical | `0 - 5` | 2-hour interval index (0: <10 AM, 1: 10-12, 2: 12-2, 3: 2-4, 4: 4-6, 5: 6+). |
| **3** | `day_of_week` | Integer | `0 - 6` | Day index (0 = Monday, 6 = Sunday) capturing weekly rush patterns. |
| **4** | `month` | Integer | `1 - 12` | Month of the year capturing seasonal disease and consultation variations. |
| **5** | `is_weekend` | Binary | `0` or `1` | Weekend flag accounting for reduced clinic staffing and emergency shifts. |
| **6** | `current_queue_length` | Integer | `0 - 50+` | Real-time count of checked-in patients currently waiting in the department. |
| **7** | `providers_on_shift` | Integer | `1 - 20` | Number of active, approved doctors currently seeing patients in the department. |
| **8** | `nurses_on_shift` | Integer | `1 - 30` | Triage and clinical nursing staff assisting in the department. |
| **9** | `staff_ratio` | Float | `0.0 - 1.0` | Proportion of active medical staff relative to current waiting room load. |
| **10** | `is_emergency` | Binary | `0` or `1` | Priority bypass flag (Emergency department or critical triage cases). |
| **11** | `patient_age` | Integer | `1 - 100` | Patient age demographic weighting consultation complexity. |
| **12** | `reason_complexity_score` | Integer | `1 - 3` | Consultation complexity score (1 = Routine checkup, 2 = Moderate, 3 = Complex). |
| **13** | `is_online_booking` | Binary | `0` or `1` | Whether the patient booked online with QR pass or registered as walk-in. |
| **14** | `occupancy_rate` | Float | `0.0 - 1.0` | Overall hospital bed and consultation room utilization rate. |

### 3. Queue Load Level Categorization
Predicted wait times are automatically categorized into intuitive color-coded operational tiers:

| Wait Time | Load Level | Badge Color | Clinical Action / Patient Advice |
| :--- | :---: | :---: | :--- |
| **$\le$ 15 minutes** | **Low** | `#22c55e` (Green) | Minimal delay. Arrive during your standard 30-min window. |
| **16 – 30 minutes** | **Medium** | `#f59e0b` (Amber) | Normal operational pace. Queue progressing steadily. |
| **31 – 60 minutes** | **High** | `#ef4444` (Red) | High congestion. Staggered arrival window strongly advised. |
| **> 60 minutes** | **Very High** | `#7c3aed` (Purple) | Severe backlog. Hospital auto-deploys additional consultation support. |

### 4. Dynamic Slot Capacity Formulation
Rather than relying on arbitrary, static appointment caps, MediQueue dynamically calibrates booking limits for every 2-hour window:

$$\text{Slot Capacity} = \left\lfloor \frac{120 \text{ minutes}}{\text{avg\_consultation\_mins}} \right\rfloor$$

- **Cardiology** ($\text{avg} = 24\text{ mins}$): Capped at $\lfloor 120 / 24 \rfloor = \mathbf{5 \text{ patients/slot}}$.
- **Pediatrics** ($\text{avg} = 15\text{ mins}$): Expands to $\lfloor 120 / 15 \rfloor = \mathbf{8 \text{ patients/slot}}$.
- **General Medicine** ($\text{avg} = 12\text{ mins}$): Expands to $\lfloor 120 / 12 \rfloor = \mathbf{10 \text{ patients/slot}}$.

### 5. Continuous Retraining Pipeline (`retrain.py`)
To prevent model drift and adapt to evolving hospital throughput, MediQueue includes a continuous learning pipeline:

- **Automated Execution**: Runs nightly at **23:59 IST** or on-demand via the Admin Dashboard.
- **Strict Zero-PII Privacy Safeguard**:
  - The pipeline accesses completed clinical encounters strictly through a dedicated database abstraction view (`v_ml_clean_metrics`).
  - An automated enforcement check scans feature dataframes against a hardcoded blacklist (`FORBIDDEN_COLUMNS`: names, emails, phones, passwords, medical diagnoses, prescriptions, QR codes). If any sensitive column is present, the pipeline immediately raises a `PermissionError` and halts. Zero patient PII ever enters the ML model or memory.
- **Statistical IQR Outlier Cleaning**:
  - Applies department-wise Interquartile Range ($Q1 - 1.5 \times \text{IQR}$ to $Q3 + 1.5 \times \text{IQR}$) anomaly filtering.
  - Automatically eliminates false data: doctor accidental double-clicks ($< 3$ minutes) and forgotten open browser tabs ($> 90$ minutes).
- **Token-Secured REST Retraining Endpoint**:
  - `POST /retrain` is protected with cryptographic constant-time comparison (`secrets.compare_digest`) requiring a valid Bearer token (`ML_INTERNAL_SECRET`).

### 6. High-Availability Resilient Fallback Engine
If the Flask ML service is temporarily restarting or unreachable over the network, MediQueue guarantees **zero booking failures**:
- The Node.js backend automatically detects ML service downtime and gracefully transitions to an internal statistical fallback.
- Wait times and arrival windows are calculated in real time using moving averages stored in `dept_consultation_stats` without interrupting the patient's checkout or booking confirmation.

---

## 🗂️ Standard Repository Structure

```
mediqueue/
├── backend/                           # Node.js Express REST API & Socket.io Server
│   ├── controllers/                   # Route business logic (Auth, Queue, Appt, Admin)
│   ├── middleware/                    # JWT Auth & Role Verification
│   ├── models/                        # MySQL connection pool configuration
│   ├── routes/                        # Unified API route declarations
│   ├── socket/                        # Socket.io event handlers & real-time rooms
│   ├── utils/                         # Email dispatcher & ML client
│   ├── .env.example                   # Backend environment configuration template
│   ├── .gitignore                     # Backend-specific ignore rules
│   ├── package.json                   # Dependencies and scripts
│   ├── server.js                      # Server entry point & startup diagnostics
│   └── testEmail.js                   # SMTP diagnostic utility
├── database/                          # Relational Database Schema & Migrations
│   ├── schema.sql                     # Full MySQL schema & initial seed data
│   ├── schema_fixed.sql               # MySQL 8.0+ / TiDB collation compatible schema
│   └── README.md                      # Database setup & schema documentation
├── frontend/                          # React 18 Single Page Application
│   ├── public/                        # Static HTML index & icons
│   ├── src/
│   │   ├── components/                # Reusable UI components (Navbar, BottomNav, Footer)
│   │   │   ├── BottomNav.js           # Mobile bottom navigation dock
│   │   │   ├── BottomNav.css          # Bottom dock responsive styling
│   │   │   ├── Navbar.js              # Desktop & mobile responsive header
│   │   │   └── Footer.js              # Standardized footer
│   │   ├── context/                   # Global state (AuthContext)
│   │   ├── dashboards/                # Role dashboards (Patient, Doctor, Admin)
│   │   ├── pages/                     # Routed pages (Home, Book, Login, Register, etc.)
│   │   ├── services/                  # Axios API communication layer
│   │   ├── App.js                     # Root routing & layout
│   │   ├── App.css                    # Base styling & animations
│   │   └── Mobile.css                 # Responsive viewport overrides
│   ├── .env.example                   # Frontend environment configuration template
│   ├── .gitignore                     # Frontend-specific ignore rules
│   ├── package.json                   # Dependencies and scripts
│   └── vercel.json                    # Single-page-app rewrite rules for Vercel
├── ml-service/                        # Python Flask Machine Learning Service
│   ├── model/                         # Serialized models (.pkl, .json, .csv)
│   │   ├── trained_model.pkl          # Trained Random Forest model
│   │   ├── scaler.pkl                 # Feature normalizer
│   │   ├── features.pkl               # Model feature list
│   │   ├── dept_map.json              # Department ID to label mappings
│   │   └── dept_stats.csv             # Baseline dataset statistics
│   ├── app.py                         # Flask prediction API (Inference & Health)
│   ├── train.py                       # Baseline training and artifact generation pipeline
│   ├── retrain.py                     # Continuous retraining & IQR anomaly detection pipeline
│   ├── Dockerfile                     # Docker container specification
│   ├── requirements.txt               # Python package dependencies (NumPy, Scikit-learn, Pandas)
│   ├── runtime.txt                    # Target Python runtime version
│   └── Hospital_Wait__TIme_Data.csv   # Historical wait time dataset
├── .gitignore                         # Comprehensive repository-level gitignore
├── DEPLOYMENT.md                      # Detailed cloud deployment guide
└── README.md                          # Project documentation
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, React Router v6, Axios, Socket.io-client, HTML5-QRCode, React-Toastify, Vanilla CSS |
| **Backend** | Node.js, Express.js, Socket.io, MySQL2 (Promises), JSON Web Tokens (JWT), Bcrypt.js, Nodemailer, QRCode, Express-Rate-Limit |
| **Machine Learning** | Python 3.11, Flask, Flask-CORS, Scikit-Learn, Pandas, NumPy, Joblib, Gunicorn |
| **Database** | MySQL 8.0 / TiDB Cloud (Serverless distributed MySQL compatible) |
| **Deployment** | Vercel (Frontend), Render / Railway (Backend & ML Service), Docker |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.x or higher)
- **Python** (v3.10 or v3.11)
- **MySQL** instance (local MySQL 8.0 or cloud instance like TiDB / Aiven / Clever Cloud)
- **Git**

---

### Step 1: Database Setup
1. Create a MySQL database named `mediqueue`:
   ```sql
   CREATE DATABASE mediqueue CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Import the schema and seed data:
   ```bash
   cd database
   mysql -u <username> -p -h <host> mediqueue < schema.sql
   ```
   *(For MySQL 8.0+ or TiDB, use `schema_fixed.sql`)*

---

### Step 2: Machine Learning Service Setup
1. Navigate to `ml-service`:
   ```bash
   cd ml-service
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. (Optional) Re-train the model from dataset:
   ```bash
   python train.py
   ```
5. Launch the ML prediction server:
   ```bash
   python app.py
   ```
   *The service starts at `http://localhost:5001`.*

---

### Step 3: Backend API Setup
1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your MySQL database credentials and Gmail App Password.
4. (Optional) Validate email configuration:
   ```bash
   node testEmail.js
   ```
5. Start the development server:
   ```bash
   npm run dev
   # Or standard start:
   npm start
   ```
   *The backend starts at `http://localhost:5000`.*

---

### Step 4: Frontend Client Setup
1. Navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
4. Launch the React development server:
   ```bash
   npm start
   ```
   *The client will open in your browser at `http://localhost:3000`.*

---

## 🔐 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5000` | Port for the Express server to listen on. |
| `NODE_ENV` | No | `development` | Runtime environment (`development` or `production`). |
| `DB_HOST` | **Yes** | `localhost` | MySQL host address. |
| `DB_PORT` | No | `3306` | MySQL port. |
| `DB_USER` | **Yes** | `root` | Database username. |
| `DB_PASSWORD` | **Yes** | - | Database password. |
| `DB_NAME` | **Yes** | `mediqueue` | Target database name. |
| `DB_SSL` | No | `false` | Set to `true` for cloud databases requiring TLS. |
| `ML_SERVICE_URL` | **Yes** | `http://localhost:5001` | URL of the Flask ML service. |
| `FRONTEND_URL` | No | `http://localhost:3000` | Allowed client origin for CORS. |
| `JWT_SECRET` | **Yes** | - | Cryptographic secret for signing JWT tokens. |
| `EMAIL_USER` | **Yes** | - | Gmail account for sending transactional emails. |
| `EMAIL_PASS` | **Yes** | - | 16-character Google App Password. |
| `ML_INTERNAL_SECRET` | No | - | Shared secret token for triggering protected ML retraining requests. |

### Machine Learning Service (`ml-service/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5001` | Port for the Flask ML prediction server. |
| `DB_HOST` | **Yes** | `localhost` | MySQL / TiDB host for loading consultation records. |
| `DB_PORT` | No | `3306` | Database port (use `4000` for TiDB Cloud). |
| `DB_USER` | **Yes** | `root` | Database username. |
| `DB_PASSWORD` | **Yes** | - | Database password. |
| `DB_NAME` | **Yes** | `mediqueue` | Target database name. |
| `ML_INTERNAL_SECRET` | No | - | Cryptographic bearer token required for `POST /retrain`. |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `REACT_APP_API_URL` | **Yes** | `http://localhost:5000/api` | Base URL of the backend REST API. |

---

## 📡 API Endpoints

### Machine Learning Service (`:5001`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/predict-wait` | Internal / Service | Ingests 14-feature vector; returns predicted wait minutes, load tier, and historical averages. |
| `POST` | `/predict-batch` | Internal / Service | Computes concurrent wait times and load levels across all 12 hospital departments. |
| `GET` | `/dept-stats` | Public | Returns historical average and median wait times derived from clinical dataset. |
| `GET` | `/health` | Public | Service heartbeat, verifies active model weight status and feature list. |
| `POST` | `/retrain` | Protected (Token) | Triggers the continuous retraining pipeline and IQR cleaning over database records. |

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register/patient` | Public | Register a new patient account (triggers OTP). |
| `POST` | `/auth/register/doctor` | Public | Register a doctor account (awaits Admin approval). |
| `POST` | `/auth/verify-otp` | Public | Verify 6-digit OTP sent to email. |
| `POST` | `/auth/resend-otp` | Public | Request a fresh verification OTP. |
| `POST` | `/auth/login` | Public | Authenticate user and receive JWT. |
| `POST` | `/auth/logout` | Public | Invalidate current user session. |
| `GET` | `/auth/me` | Authenticated | Retrieve profile details of active user. |
| `POST` | `/auth/forgot-password` | Public | Request password reset code via email. |
| `POST` | `/auth/reset-password` | Public | Complete password reset with verification code. |

### Clinical Operations & Appointments (`/api`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/departments` | Public | List hospital departments. |
| `GET` | `/departments/:id/doctors` | Public | List approved doctors in a department. |
| `GET` | `/doctors/:id` | Public | Get doctor profile and bio. |
| `GET` | `/doctors/:id/slots` | Public | Query available slots for a specific date. |
| `POST` | `/appointments` | Patient | Book appointment with ML arrival window & QR pass. |
| `GET` | `/appointments/my` | Patient | View active and historical patient appointments. |
| `GET` | `/appointments/doctor` | Doctor | Retrieve doctor's scheduled appointments. |
| `PUT` | `/appointments/:id/cancel` | Patient | Cancel an existing appointment. |

### Real-Time Queue (`/api/queue`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/queue/:departmentId` | Public | Fetch live queue status for a department. |
| `GET` | `/queue/position/:appointmentId`| Authenticated | Get personalized queue number & wait time. |
| `POST` | `/queue/checkin` | Admin | Check-in patient upon hospital arrival. |
| `PUT` | `/queue/:appointmentId/start` | Doctor | Mark patient consultation as In-Progress. |
| `PUT` | `/queue/:appointmentId/complete`| Doctor | Mark consultation Complete and record metrics. |
| `PUT` | `/queue/:appointmentId/noshow` | Doctor/Admin | Mark appointment as No-Show. |
| `GET` | `/queue/dept-stats` | Admin | Inspect live department consultation averages. |

### Prescriptions & Leaves (`/api`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/prescriptions` | Doctor | Save clinical e-prescription for an appointment. |
| `GET` | `/prescriptions/my` | Patient | Retrieve all prescriptions for active patient. |
| `GET` | `/prescriptions/appointment/:id`| Authenticated | View prescription linked to an appointment. |
| `POST` | `/doctor/my-leave` | Doctor | Self-service leave application. |
| `GET` | `/doctor/my-leaves` | Doctor | View personal leave schedule. |
| `POST` | `/admin/doctor-leave` | Admin | Assign administrative leave to any physician. |

---

## 🌐 Real-Time Socket.io Events

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_department` | Client $\rightarrow$ Server | `{ department_id }` | Joins a room to receive real-time department queue updates. |
| `queue_updated` | Server $\rightarrow$ Client | `{ department_id, queue }` | Emitted when patient status changes (`Waiting`, `In-Progress`, etc.). |
| `patient_called` | Server $\rightarrow$ Client | `{ appointment_id, token, doctor_name }` | Alerts patient that doctor is ready for consultation. |

---

## 🚢 Deployment

For complete, step-by-step production deployment on cloud platforms (**Render**, **Vercel**, **Railway**, and **Clever Cloud**), please refer to the dedicated deployment documentation:

👉 **[Complete Deployment Guide (DEPLOYMENT.md)](DEPLOYMENT.md)**

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Developed with ❤️ for streamlined patient care and smarter hospitals.</sub>
</div>
