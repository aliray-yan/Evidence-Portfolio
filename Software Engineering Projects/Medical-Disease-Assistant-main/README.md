# Medical Diagnosis Assistant System

A full-stack healthcare web application that uses a machine learning model to predict likely diseases from patient-selected symptoms. The system supports Admin, Patient, and Doctor portals with role-based access control, appointment booking, prediction history, referrals, and dashboard analytics.

## Features

- AI disease prediction using a Random Forest classifier
- 41 supported diseases and 132 supported symptoms
- JWT-based authentication for Admin, Patient, and Doctor roles
- Patient symptom checker, prediction history, doctor browsing, and appointment booking
- Doctor appointment management and patient history view
- Admin analytics dashboard, patient management, doctor management, predictions, and referrals

## Technology Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy, Pydantic, Uvicorn
- Database: PostgreSQL
- Machine Learning: scikit-learn, pandas, numpy, joblib
- Frontend: HTML5, Tailwind CSS, Vanilla JavaScript, Chart.js, Font Awesome
- Version Control: Git and GitHub

## Project Structure

```text
medical-diagnosis-system/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── routers/
│   │   └── ml/
│   ├── data/
│   └── requirements.txt
├── database/
│   ├── schema.sql
│   └── seed_data.sql
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── admin/
│   ├── doctor/
│   ├── patient/
│   ├── css/
│   └── js/
└── README.md
```

## Setup Instructions

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Update `.env` with your PostgreSQL database credentials.

### 2. Database

Create a PostgreSQL database named `medical_assistant`, then run the schema and seed files if needed:

```bash
psql -U medical_user -d medical_assistant -f ../database/schema.sql
psql -U medical_user -d medical_assistant -f ../database/seed_data.sql
```

### 3. Train Or Restore ML Model

Generated model files are ignored in Git. Train the model locally when needed:

```bash
python -m app.ml.train_model
```

### 4. Start Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Backend API: `http://localhost:8000`

Swagger UI: `http://localhost:8000/docs`

### 5. Start Frontend

Open a second terminal:

```bash
cd frontend
python -m http.server 3000
```

Frontend: `http://localhost:3000`

## Demo Accounts

- Admin: `admin@medical.com`
- Doctor: `dr.smith@medical.com`

Passwords should be configured in `.env` or generated seed data. Do not commit real credentials.

## Notes

This project is an academic Software Construction and Development project. Medical predictions are for educational demonstration only and must not be used as professional medical advice.
