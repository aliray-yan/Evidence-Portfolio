-- Medical Diagnosis Assistant System
-- PostgreSQL Database Schema

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'patient', 'doctor');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Users table (base for all user types)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    date_of_birth DATE,
    gender gender_type,
    address TEXT,
    role user_role NOT NULL DEFAULT 'patient',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Patients table (extends users)
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    medical_history_notes TEXT,
    allergies TEXT,
    blood_group VARCHAR(10),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_user_id ON patients(user_id);

-- Doctors table (extends users)
CREATE TABLE doctors (
    doctor_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    specialty VARCHAR(100) NOT NULL,
    qualifications TEXT,
    experience_years INTEGER DEFAULT 0,
    consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
    availability_schedule JSONB,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialty ON doctors(specialty);

-- Disease predictions table
CREATE TABLE disease_predictions (
    prediction_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(patient_id) ON DELETE CASCADE,
    symptoms_selected JSONB NOT NULL,
    predicted_disease VARCHAR(255) NOT NULL,
    confidence_score DECIMAL(5, 4) NOT NULL,
    model_version VARCHAR(50) DEFAULT 'v1.0',
    recommended_specialist VARCHAR(100),
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_predictions_patient_id ON disease_predictions(patient_id);
CREATE INDEX idx_predictions_disease ON disease_predictions(predicted_disease);
CREATE INDEX idx_predictions_date ON disease_predictions(prediction_date);

-- Appointments table
CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status appointment_status DEFAULT 'pending',
    reason TEXT,
    notes TEXT,
    prediction_id INTEGER REFERENCES disease_predictions(prediction_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Doctor referrals table
CREATE TABLE doctor_referrals (
    referral_id SERIAL PRIMARY KEY,
    prediction_id INTEGER REFERENCES disease_predictions(prediction_id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(doctor_id),
    referral_reason TEXT,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrals_prediction_id ON doctor_referrals(prediction_id);
CREATE INDEX idx_referrals_patient_id ON doctor_referrals(patient_id);
CREATE INDEX idx_referrals_doctor_id ON doctor_referrals(doctor_id);

-- Function to update last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;