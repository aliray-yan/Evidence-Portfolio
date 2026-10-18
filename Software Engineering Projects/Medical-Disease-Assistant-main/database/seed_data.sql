-- Seed Data for Medical Diagnosis Assistant System

-- Insert default admin user (password: Admin@123)
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES (
    'admin@medical.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGRVxOGpRPG',
    'System Administrator',
    'admin',
    TRUE
);

-- Insert sample doctors (password: Doctor@123)
INSERT INTO users (email, password_hash, full_name, phone, role, is_active)
VALUES 
    ('dr.smith@medical.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGRVxOGpRPG', 'Dr. John Smith', '1234567890', 'doctor', TRUE),
    ('dr.johnson@medical.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGRVxOGpRPG', 'Dr. Emily Johnson', '1234567891', 'doctor', TRUE),
    ('dr.williams@medical.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGRVxOGpRPG', 'Dr. Michael Williams', '1234567892', 'doctor', TRUE),
    ('dr.brown@medical.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGRVxOGpRPG', 'Dr. Sarah Brown', '1234567893', 'doctor', TRUE),
    ('dr.davis@medical.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGRVxOGpRPG', 'Dr. Robert Davis', '1234567894', 'doctor', TRUE);

-- Insert doctor profiles
INSERT INTO doctors (user_id, specialty, qualifications, experience_years, consultation_fee, is_verified, rating, bio, availability_schedule)
SELECT 
    user_id,
    CASE 
        WHEN email = 'dr.smith@medical.com' THEN 'General Physician'
        WHEN email = 'dr.johnson@medical.com' THEN 'Cardiologist'
        WHEN email = 'dr.williams@medical.com' THEN 'Dermatologist'
        WHEN email = 'dr.brown@medical.com' THEN 'Neurologist'
        WHEN email = 'dr.davis@medical.com' THEN 'Gastroenterologist'
    END,
    CASE 
        WHEN email = 'dr.smith@medical.com' THEN 'MBBS, MD'
        WHEN email = 'dr.johnson@medical.com' THEN 'MBBS, MD, DM Cardiology'
        WHEN email = 'dr.williams@medical.com' THEN 'MBBS, MD Dermatology'
        WHEN email = 'dr.brown@medical.com' THEN 'MBBS, MD, DM Neurology'
        WHEN email = 'dr.davis@medical.com' THEN 'MBBS, MD, DM Gastroenterology'
    END,
    CASE 
        WHEN email = 'dr.smith@medical.com' THEN 10
        WHEN email = 'dr.johnson@medical.com' THEN 15
        WHEN email = 'dr.williams@medical.com' THEN 8
        WHEN email = 'dr.brown@medical.com' THEN 12
        WHEN email = 'dr.davis@medical.com' THEN 10
    END,
    CASE 
        WHEN email = 'dr.smith@medical.com' THEN 50.00
        WHEN email = 'dr.johnson@medical.com' THEN 100.00
        WHEN email = 'dr.williams@medical.com' THEN 75.00
        WHEN email = 'dr.brown@medical.com' THEN 120.00
        WHEN email = 'dr.davis@medical.com' THEN 90.00
    END,
    TRUE,
    4.5,
    CASE 
        WHEN email = 'dr.smith@medical.com' THEN 'Experienced general physician with expertise in primary care.'
        WHEN email = 'dr.johnson@medical.com' THEN 'Specialized in cardiovascular diseases and interventional cardiology.'
        WHEN email = 'dr.williams@medical.com' THEN 'Expert in skin disorders and cosmetic dermatology.'
        WHEN email = 'dr.brown@medical.com' THEN 'Specialized in neurological disorders and stroke management.'
        WHEN email = 'dr.davis@medical.com' THEN 'Expert in digestive system disorders and liver diseases.'
    END,
    '{"monday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "tuesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "wednesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "thursday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "friday": ["09:00", "10:00", "11:00", "14:00", "15:00"]}'::jsonb
FROM users
WHERE role = 'doctor';

-- Insert sample patient (password: Patient@123)
INSERT INTO users (email, password_hash, full_name, phone, date_of_birth, gender, address, role, is_active)
VALUES (
    'patient@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGRVxOGpRPG',
    'John Patient',
    '9876543210',
    '1990-05-15',
    'Male',
    '123 Patient Street, Medical City',
    'patient',
    TRUE
);

-- Insert patient profile
INSERT INTO patients (user_id, blood_group, allergies, emergency_contact_name, emergency_contact_phone)
SELECT user_id, 'O+', 'None', 'Jane Patient', '9876543211'
FROM users WHERE email = 'patient@example.com';