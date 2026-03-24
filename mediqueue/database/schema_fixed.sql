-- MediQueue Database Schema
-- Run this file to set up the complete database

-- DATABASE ALREADY EXISTS
USE mediqueue_worejoined;

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  doctor_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  blood_group VARCHAR(5),
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  years_of_experience INT NOT NULL,
  medical_license_no VARCHAR(50) UNIQUE NOT NULL,
  languages_known VARCHAR(255),
  consultation_fee DECIMAL(8,2) NOT NULL DEFAULT 500.00,
  password_hash VARCHAR(255) NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  profile_image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id VARCHAR(20) UNIQUE NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  department_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  age INT NOT NULL,
  gender ENUM('Male', 'Female', 'Other'),
  reason_for_visit TEXT,
  predicted_wait_time INT DEFAULT 30,
  qr_code_data TEXT,
  status ENUM('Booked','Checked-In','In-Progress','Completed','No-Show','Cancelled') DEFAULT 'Booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Queue Table
CREATE TABLE IF NOT EXISTS queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT UNIQUE NOT NULL,
  department_id INT NOT NULL,
  doctor_id INT NOT NULL,
  queue_position INT NOT NULL,
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estimated_call_time TIMESTAMP NULL DEFAULT NULL,
  status ENUM('Waiting','In-Progress','Completed','No-Show') DEFAULT 'Waiting',
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Seed Departments
INSERT IGNORE INTO departments (id, name, description, icon, doctor_count) VALUES
(1, 'Dentistry', 'Dental care & oral health', '🦷', 1),
(2, 'Cardiology', 'Heart & vascular care', '❤️', 1),
(3, 'Orthopedics', 'Bones, joints & muscles', '🦴', 1),
(4, 'General Medicine', 'Primary healthcare', '🩺', 1),
(5, 'Neurology', 'Brain & nervous system', '🧠', 1),
(6, 'Pediatrics', 'Children\'s health', '👶', 1),
(7, 'Dermatology', 'Skin care & treatment', '🔬', 1),
(8, 'ENT', 'Ear, Nose & Throat', '👂', 1),
(9, 'Ophthalmology', 'Eye care & surgery', '👁️', 1),
(10, 'Gynecology', 'Women\'s health', '🌸', 1),
(11, 'Radiology', 'Imaging & diagnostics', '📡', 1),
(12, 'Emergency', 'Critical & emergency care', '🚨', 1);

-- Seed Admin (password: Admin@123)
INSERT IGNORE INTO admins (username, email, password_hash) VALUES
('admin', 'admin@mediqueue.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi');

-- Seed Demo Doctors (password: Doctor@123 for all)
INSERT IGNORE INTO doctors (id, first_name, last_name, email, phone, date_of_birth, gender, specialization, department_id, years_of_experience, medical_license_no, languages_known, consultation_fee, password_hash, is_approved) VALUES
(1, 'Rajesh', 'Sharma', 'rajesh.sharma@mediqueue.com', '9876543210', '1980-05-15', 'Male', 'Dentistry', 1, 12, 'MCI-D1001', 'English, Hindi, Marathi', 600.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(2, 'Priya', 'Mehta', 'priya.mehta@mediqueue.com', '9876543211', '1982-08-22', 'Female', 'Cardiology', 2, 15, 'MCI-C2001', 'English, Hindi', 1200.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(3, 'Amit', 'Patel', 'amit.patel@mediqueue.com', '9876543212', '1978-03-10', 'Male', 'Orthopedics', 3, 18, 'MCI-O3001', 'English, Hindi, Gujarati', 900.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(4, 'Sunita', 'Joshi', 'sunita.joshi@mediqueue.com', '9876543213', '1985-11-30', 'Female', 'General Medicine', 4, 10, 'MCI-G4001', 'English, Hindi, Marathi', 500.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(5, 'Vikram', 'Singh', 'vikram.singh@mediqueue.com', '9876543214', '1975-07-18', 'Male', 'Neurology', 5, 20, 'MCI-N5001', 'English, Hindi', 1500.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(6, 'Anita', 'Desai', 'anita.desai@mediqueue.com', '9876543215', '1983-09-25', 'Female', 'Pediatrics', 6, 12, 'MCI-P6001', 'English, Hindi, Marathi', 700.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(7, 'Nisha', 'Agarwal', 'nisha.agarwal@mediqueue.com', '9876543216', '1987-04-12', 'Female', 'Dermatology', 7, 8, 'MCI-D7001', 'English, Hindi', 650.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(8, 'Suresh', 'Kumar', 'suresh.kumar@mediqueue.com', '9876543217', '1979-12-05', 'Male', 'ENT', 8, 16, 'MCI-E8001', 'English, Hindi, Tamil', 800.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(9, 'Deepa', 'Nair', 'deepa.nair@mediqueue.com', '9876543218', '1981-06-20', 'Female', 'Ophthalmology', 9, 14, 'MCI-O9001', 'English, Hindi, Malayalam', 750.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(10, 'Kavita', 'Rao', 'kavita.rao@mediqueue.com', '9876543219', '1984-02-14', 'Female', 'Gynecology', 10, 11, 'MCI-G10001', 'English, Hindi, Telugu', 850.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(11, 'Rajan', 'Verma', 'rajan.verma@mediqueue.com', '9876543220', '1976-08-08', 'Male', 'Radiology', 11, 19, 'MCI-R11001', 'English, Hindi', 1000.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE),
(12, 'Manish', 'Gupta', 'manish.gupta@mediqueue.com', '9876543221', '1977-10-30', 'Male', 'Emergency', 12, 17, 'MCI-E12001', 'English, Hindi', 0.00, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BnFb1NmCi', TRUE);
