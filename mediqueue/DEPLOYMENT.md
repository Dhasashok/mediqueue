# MediQueue Deployment Guide

This guide describes how to deploy the entire MediQueue Hospital Queue Optimization system, which consists of:
1. **Database**: MySQL database (stores appointments, check-ins, users).
2. **ML Service**: Python Flask API (predicts wait times using a Random Forest model).
3. **Backend**: Node.js Express Server (manages authentication, queue state, bookings, and emails).
4. **Frontend**: React SPA (user and staff dashboard interfaces).

---

## 🏛️ System Architecture

```mermaid
graph TD
    User([Patient / Doctor / Admin]) -->|Interacts| Frontend[React Client]
    Frontend -->|API Requests| Backend[Node.js Express]
    Backend -->|Queries / Updates| DB[(MySQL Database)]
    Backend -->|Predict Requests| ML[Flask ML Service]
    ML -->|Loads Model| Model[trained_model.pkl]
```

---

## 1. Database Setup (MySQL)

You need a MySQL database instance. You can host this using services like **Clever Cloud**, **Aiven**, **Railway**, or any standard VPS.

1. Create a MySQL database and retrieve your connection details:
   - **Host**
   - **Port** (usually `3306` or `3307`)
   - **User**
   - **Password**
   - **Database Name**
2. Import the schema file `mediqueue/database/schema.sql` to initialize the database tables and default admin user.
   - Run via MySQL CLI:
     ```bash
     mysql -u <user> -p -h <host> -P <port> <database_name> < database/schema.sql
     ```
   - Alternatively, copy and paste the contents of `schema.sql` into your database administration tool (e.g. phpMyAdmin, DBeaver, or Clever Cloud console).

---

## 2. ML Service Deployment (Python Flask)

The Machine Learning service loads the pre-trained `trained_model.pkl` to predict queue waiting times. 

* **Hosting Recommendations**: Render (Web Service), Railway, or PythonAnywhere.
* **Build Command**: `pip install -r requirements.txt`
* **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
* **Port**: Automatically bound by the platform via the `PORT` environment variable (defaults to `5001` if run locally).

### Deployment on Render:
1. Create a new **Web Service** on Render.
2. Select your repository and set the **Root Directory** to `mediqueue/ml-service`.
3. Set **Runtime** to `Python 3`.
4. Set the **Build Command** to:
   ```bash
   pip install -r requirements.txt
   ```
5. Set the **Start Command** to:
   ```bash
   gunicorn app:app
   ```
6. Render will assign you a public URL (e.g., `https://mediqueue-ml.onrender.com`). **Save this URL** for the backend setup.

---

## 3. Backend Deployment (Node.js Express)

The backend acts as the central coordinator and handles web sockets (Socket.io) for real-time queue updates.

* **Hosting Recommendations**: Render (Web Service), Railway, or any Node.js host.
* **Root Directory**: `mediqueue/backend`
* **Build Command**: `npm install`
* **Start Command**: `node server.js` or `npm start`
* **Port**: Render/Railway will inject a dynamic `PORT` environment variable (defaults to `5000` if local).

### Environment Variables:
Configure the following environment variables in your backend service:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment level | `production` |
| `PORT` | Listening Port | `5000` |
| `DB_HOST` | MySQL Hostname | `kx1s-e.h.filess.io` |
| `DB_PORT` | MySQL Port | `3307` |
| `DB_USER` | MySQL Username | `mediqueue_worejoined` |
| `DB_PASSWORD` | MySQL Password | `<your_db_password>` |
| `DB_NAME` | MySQL Database Name | `mediqueue_worejoined` |
| `DB_SSL` | Enable SSL for DB (Required for secure hosts) | `true` (set to `true` if your DB requires SSL) |
| `ML_SERVICE_URL` | Deployed ML Flask URL | `https://mediqueue-ml.onrender.com` |
| `FRONTEND_URL` | Deployed React Frontend URL (for CORS) | `https://mediqueue.vercel.app` |
| `EMAIL_USER` | Gmail address for sending OTP emails | `your-email@gmail.com` |
| `EMAIL_PASS` | Gmail App Password (not standard pass) | `xxxx xxxx xxxx xxxx` |
| `JWT_SECRET` | Secret key for signing authorization tokens | `any-random-long-string` |

---

## 4. Frontend Deployment (React)

The frontend is built as a static application and can be hosted for free.

* **Hosting Recommendations**: Vercel, Netlify, or GitHub Pages.
* **Root Directory**: `mediqueue/frontend`
* **Build Command**: `npm run build`
* **Output Directory**: `build`

### Setup:
During deployment, you **MUST** specify the environment variables at build-time so they are compiled into the static JS files.

1. **Environment Variables**:
   - `REACT_APP_API_URL`: Set this to your deployed Backend URL (e.g., `https://mediqueue-backend.onrender.com/api`).
2. **On Vercel**:
   - Import your repo.
   - Set **Root Directory** to `mediqueue/frontend`.
   - Under **Framework Preset**, select **Create React App**.
   - Add the Environment Variable `REACT_APP_API_URL` with your backend endpoint.
   - Click **Deploy**.

---

## ⚡ Verifying Your Deployment

1. **ML Service**: Visit `https://your-ml-service.onrender.com/health` in your browser. It should return:
   ```json
   {
     "status": "OK",
     "model_loaded": true,
     "service": "MediQueue ML Service",
     "dataset": "Hospital_Wait_Time_Data.csv"
   }
   ```
2. **Backend**: Visit `https://your-backend.onrender.com/health`. It should return:
   ```json
   {
     "status": "OK",
     "env": "production"
   }
   ```
3. **Database connection**: Check your backend deployment logs. On startup, it will run a test query. You should see:
   ```text
   🏥 MediQueue Backend — port 5000
   🌐 NODE_ENV: production
   📡 Socket.io ready
   ✅ Database connected
   ```
