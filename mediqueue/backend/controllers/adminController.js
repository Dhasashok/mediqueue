const db = require('../models/db');

// Get today's date in local format YYYY-MM-DD
const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPendingDoctors = async (req, res) => {
  try {
    const [doctors] = await db.query(
      `SELECT d.*, dep.name as dept_name FROM doctors d
       JOIN departments dep ON d.department_id = dep.id
       WHERE d.is_approved = FALSE ORDER BY d.created_at DESC`
    );
    res.json({ success: true, doctors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

const approveDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE doctors SET is_approved = TRUE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Doctor approved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

const getAllDoctors = async (req, res) => {
  try {
    const [doctors] = await db.query(
      `SELECT d.id, d.first_name, d.last_name, d.email, d.specialization,
       d.years_of_experience, d.consultation_fee, d.is_approved,
       dep.name as dept_name
       FROM doctors d JOIN departments dep ON d.department_id = dep.id
       ORDER BY d.created_at DESC`
    );
    res.json({ success: true, doctors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const today = getLocalToday();
    const [[patients]]   = await db.query('SELECT COUNT(*) as count FROM patients');
    const [[doctors]]    = await db.query('SELECT COUNT(*) as count FROM doctors WHERE is_approved = TRUE');
    const [[totalAppts]] = await db.query('SELECT COUNT(*) as count FROM appointments');
    const [[todayAppts]] = await db.query('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?', [today]);
    const [[completed]]  = await db.query(`SELECT COUNT(*) as count FROM appointments WHERE status = 'Completed'`);
    const [[noShow]]     = await db.query(`SELECT COUNT(*) as count FROM appointments WHERE status = 'No-Show'`);
    const [[cancelled]]  = await db.query(`SELECT COUNT(*) as count FROM appointments WHERE status = 'Cancelled'`);
    const [deptStats]    = await db.query(
      `SELECT dep.name, COUNT(a.id) as total FROM appointments a
       JOIN departments dep ON a.department_id = dep.id
       GROUP BY dep.name ORDER BY total DESC`
    );
    res.json({
      success: true,
      analytics: {
        total_patients: patients.count,
        total_doctors: doctors.count,
        total_appointments: totalAppts.count,
        today_appointments: todayAppts.count,
        completed: completed.count,
        no_shows: noShow.count,
        cancelled: cancelled.count,
        department_stats: deptStats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// TODAY's appointments — only Booked status for today
const getTodayAppointments = async (req, res) => {
  try {
    const today = getLocalToday();
    const [appointments] = await db.query(
      `SELECT a.*, p.first_name as p_first, p.last_name as p_last,
       d.first_name as doc_first, d.last_name as doc_last,
       dep.name as dept_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.appointment_date = ? AND a.status = 'Booked'
       ORDER BY a.time_slot ASC, a.created_at ASC`,
      [today]
    );
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// UPCOMING appointments — future dates only, Booked status
const getUpcomingAppointments = async (req, res) => {
  try {
    const today = getLocalToday();
    const [appointments] = await db.query(
      `SELECT a.*, p.first_name as p_first, p.last_name as p_last,
       d.first_name as doc_first, d.last_name as doc_last,
       dep.name as dept_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.appointment_date > ? AND a.status = 'Booked'
       ORDER BY a.appointment_date ASC, a.time_slot ASC`,
      [today]
    );
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// ALL appointments — for search and history
const getAllAppointments = async (req, res) => {
  try {
    const [appointments] = await db.query(
      `SELECT a.*, p.first_name as p_first, p.last_name as p_last,
       d.first_name as doc_first, d.last_name as doc_last,
       dep.name as dept_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       ORDER BY a.appointment_date DESC, a.created_at DESC
       LIMIT 200`
    );
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

const adminCancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const [appt] = await db.query('SELECT * FROM appointments WHERE id = ?', [id]);
    if (appt.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    if (['Completed', 'In-Progress'].includes(appt[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed or in-progress appointment.'
      });
    }
    await db.query(`UPDATE appointments SET status = 'Cancelled' WHERE id = ?`, [id]);
    await db.query(`UPDATE queue SET status = 'No-Show' WHERE appointment_id = ?`, [id]);
    res.json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

module.exports = {
  getPendingDoctors, approveDoctor, getAllDoctors, getAnalytics,
  getTodayAppointments, getUpcomingAppointments, getAllAppointments, adminCancelAppointment
};