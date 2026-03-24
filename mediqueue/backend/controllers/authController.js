const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { sendOTPEmail } = require('../utils/emailService');

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register Patient
const registerPatient = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, date_of_birth, gender, blood_group, password } = req.body;

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const hash = await bcrypt.hash(password, 12);

    // Check if email already exists
    const [existing] = await db.query('SELECT id, is_verified FROM patients WHERE email = ?', [email]);

    if (existing.length > 0) {
      // If already verified — reject
      if (existing[0].is_verified) {
        return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
      }
      // If not verified — update with fresh OTP and new details
      await db.query(
        `UPDATE patients SET
          first_name=?, last_name=?, phone=?, date_of_birth=?, gender=?,
          blood_group=?, password_hash=?, otp=?, otp_expiry=?
         WHERE email=?`,
        [first_name, last_name, phone, date_of_birth, gender,
         blood_group || null, hash, otp, otpExpiry, email]
      );
    } else {
      // New registration — insert fresh record
      await db.query(
        `INSERT INTO patients
         (first_name, last_name, email, phone, date_of_birth, gender, blood_group, password_hash, otp, otp_expiry, is_verified)
         VALUES (?,?,?,?,?,?,?,?,?,?,FALSE)`,
        [first_name, last_name, email, phone, date_of_birth, gender, blood_group || null, hash, otp, otpExpiry]
      );
    }

    // Always send fresh OTP email
    try {
      await sendOTPEmail(email, first_name, otp);
    } catch (emailErr) {
      console.error('Email send error:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'OTP sent to your email. Please verify to activate your account.',
      email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM patients WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const patient = rows[0];

    if (patient.is_verified) {
      return res.status(400).json({ success: false, message: 'Account already verified. Please login.' });
    }

    if (patient.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    if (new Date() > new Date(patient.otp_expiry)) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    // Activate account
    await db.query(
      'UPDATE patients SET is_verified = TRUE, otp = NULL, otp_expiry = NULL WHERE email = ?',
      [email]
    );

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const [rows] = await db.query('SELECT * FROM patients WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (rows[0].is_verified) {
      return res.status(400).json({ success: false, message: 'Account already verified.' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      'UPDATE patients SET otp = ?, otp_expiry = ? WHERE email = ?',
      [otp, otpExpiry, email]
    );

    await sendOTPEmail(email, rows[0].first_name, otp);

    res.json({ success: true, message: 'New OTP sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error sending OTP.' });
  }
};

// Register Doctor
const registerDoctor = async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, date_of_birth, gender,
      specialization, department_id, years_of_experience, medical_license_no,
      languages_known, consultation_fee, password
    } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM doctors WHERE email = ? OR medical_license_no = ?',
      [email, medical_license_no]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email or Medical License already registered.' });
    }

    const hash = await bcrypt.hash(password, 12);
    await db.query(
      `INSERT INTO doctors
       (first_name, last_name, email, phone, date_of_birth, gender, specialization,
        department_id, years_of_experience, medical_license_no, languages_known, consultation_fee, password_hash)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [first_name, last_name, email, phone, date_of_birth, gender, specialization,
       department_id, years_of_experience, medical_license_no, languages_known, consultation_fee || 500, hash]
    );

    res.status(201).json({ success: true, message: 'Doctor account created! Awaiting admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const table = role === 'patient' ? 'patients' : role === 'doctor' ? 'doctors' : 'admins';

    const [rows] = await db.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Check email verified for patients
    if (role === 'patient' && !user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. Check your inbox for OTP.',
        needsVerification: true,
        email
      });
    }

    // Fix $2a$ vs $2b$ bcrypt for MariaDB
    const normalizedHash = user.password_hash.replace(/^\$2a\$/, '$2b$');
    const match = await bcrypt.compare(password, normalizedHash);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    if (role === 'doctor' && !user.is_approved) {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
    }

    const name = `${user.first_name || user.username || ''} ${user.last_name || ''}`.trim();
    const token = generateToken({ id: user.id, email: user.email, role, name });

    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role, name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
};

const getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const table = role === 'patient' ? 'patients' : role === 'doctor' ? 'doctors' : 'admins';
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    const { password_hash, otp, otp_expiry, ...user } = rows[0];
    res.json({ success: true, user: { ...user, role } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { registerPatient, registerDoctor, verifyOTP, resendOTP, login, logout, getMe };