const db = require('../models/db');
const QRCode = require('qrcode');
const { sendAppointmentConfirmation, sendCancellationEmail } = require('../utils/emailService');
const { predictWaitTime: mlPredict } = require('../utils/mlService');
const { DEPT_CONSULTATION_MINS, DEPT_AVG_WAIT } = require('./departmentController');
const { getRealSlotCapacity } = require('./queueController');

// ── Booking ID generator ──────────────────────────────────────
const generateBookingId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random    = Math.floor(1000 + Math.random() * 9000);
  return `MQ-${timestamp}-${random}`;
};

// ── IST Date Fix ──────────────────────────────────────────────
// Frontend sends "2026-03-26T00:00:00.000Z" (UTC midnight)
// Splitting on T gives "2026-03-25" for IST users — wrong!
// Fix: add IST offset before extracting the date
const cleanAppointmentDate = (dateInput) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
  const d         = new Date(dateInput);
  const istOffset = 5.5 * 60 * 60000;
  const istDate   = new Date(d.getTime() + istOffset);
  const yyyy      = istDate.getUTCFullYear();
  const mm        = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dd        = String(istDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ── ML Wait Time Prediction ───────────────────────────────────
const getPredictedWait = async (department_id, queueLength, time_slot, appointment_date, age) => {
  try {
    const result = await mlPredict({
      department_id,
      time_slot,
      appointment_date,
      current_queue_length:    queueLength,
      patient_age:             age || 35,
      is_emergency:            department_id === 12 ? 1 : 0,
      reason_complexity_score: 2,
    });
    console.log(`🤖 ML: ${result.predicted_wait_minutes}min (${result.load_level}) [${result.source}]`);
    return result.predicted_wait_minutes;
  } catch (e) { /* ML service offline — use smart fallback below */ }

  // ── Smart fallback: equal distribution from dept_consultation_stats ──
  // distributedMins = 120 / slot_capacity  (each patient gets equal share)
  // wait = patients_already_booked × distributedMins
  let consultMins  = DEPT_CONSULTATION_MINS[department_id] || 18.6;
  let slotCapacity = Math.floor(120 / consultMins);
  try {
    const [rows] = await db.query(
      `SELECT avg_consultation_mins, slot_capacity, total_samples
       FROM dept_consultation_stats WHERE department_id = ?`,
      [department_id]
    );
    if (rows.length > 0 && rows[0].total_samples > 0) {
      consultMins  = parseFloat(rows[0].avg_consultation_mins);
      slotCapacity = rows[0].slot_capacity;
      console.log(`📊 Fallback using real DB: dept=${department_id} avg=${consultMins}min cap=${slotCapacity}`);
    } else {
      console.warn(`⚠️ No real data for dept ${department_id}, using dataset default: ${consultMins}min`);
    }
  } catch (dbErr) { /* dept_consultation_stats not ready */ }

  const distributedMins = Math.round((120 / slotCapacity) * 100) / 100;
  const wait = queueLength === 0 ? 0 : Math.round(queueLength * distributedMins);
  console.log(`📊 Smart fallback: dept=${department_id} queue=${queueLength} distributed=${distributedMins}min → wait=${wait}min`);
  return Math.max(0, wait);
};

// ── Book Appointment ──────────────────────────────────────────
const bookAppointment = async (req, res) => {
  try {
    const {
      doctor_id, department_id, appointment_date, time_slot,
      full_name, phone, age, gender, reason_for_visit
    } = req.body;

    const patient_id = req.user.id;
    const deptId     = parseInt(department_id);
    const cleanDate  = cleanAppointmentDate(appointment_date);

    // Block Emergency dept — must go directly to reception
    const [deptRow] = await db.query('SELECT name FROM departments WHERE id=?', [deptId]);
    if (deptRow.length > 0 && deptRow[0].name.toLowerCase() === 'emergency') {
      return res.status(403).json({
        success: false,
        message: 'Emergency department does not accept online bookings. Please visit the hospital directly.'
      });
    }

    // Dynamic slot capacity from dept_consultation_stats (real ML data)
    // Falls back to dataset default if no real data yet
    const { capacity: slotCapacity, avg_mins, source } = await getRealSlotCapacity(deptId);
    console.log(`📊 Dept ${deptId}: capacity=${slotCapacity}/slot avg=${avg_mins}min [${source}]`);

    // Check slot capacity
    const [slotCount] = await db.query(
      `SELECT COUNT(*) as count FROM appointments
       WHERE doctor_id=? AND appointment_date=? AND time_slot=?
       AND status NOT IN ('Cancelled','No-Show')`,
      [doctor_id, cleanDate, time_slot]
    );
    if (slotCount[0].count >= slotCapacity) {
      return res.status(400).json({
        success: false,
        message: `This slot is fully booked. Max ${slotCapacity} patients per 2-hour slot.`
      });
    }

    // Check duplicate booking
    const [dup] = await db.query(
      `SELECT id FROM appointments
       WHERE patient_id=? AND doctor_id=? AND appointment_date=?
       AND status NOT IN ('Cancelled','No-Show')`,
      [patient_id, doctor_id, cleanDate]
    );
    if (dup.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an appointment with this doctor on this date.'
      });
    }

    // Unique booking ID
    let booking_id = generateBookingId();
    for (let i = 0; i < 5; i++) {
      const [ex] = await db.query('SELECT id FROM appointments WHERE booking_id=?', [booking_id]);
      if (ex.length === 0) break;
      booking_id = generateBookingId();
    }

    // Queue length for ML prediction
    const [queueData] = await db.query(
      `SELECT COUNT(*) as count FROM appointments
       WHERE doctor_id=? AND appointment_date=?
       AND status NOT IN ('Cancelled','No-Show')`,
      [doctor_id, cleanDate]
    );

    const predicted_wait = await getPredictedWait(
      deptId, queueData[0].count, time_slot, cleanDate, age
    );

    // QR code
    const qrData = JSON.stringify({
      booking_id, patient_id, department_id: deptId, doctor_id,
      date: cleanDate, slot: time_slot, generated_at: Date.now()
    });
    const qr_code_data = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M', type: 'image/png',
      margin: 1, color: { dark: '#0f172a', light: '#ffffff' }, width: 180
    });

    // Insert
    const [result] = await db.query(
      `INSERT INTO appointments
       (booking_id, patient_id, doctor_id, department_id, appointment_date,
        time_slot, full_name, phone, age, gender, reason_for_visit,
        predicted_wait_time, qr_code_data)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        booking_id, patient_id, doctor_id, deptId, cleanDate,
        time_slot, full_name, phone.replace(/\D/g, ''), age, gender,
        reason_for_visit || null, predicted_wait, qr_code_data
      ]
    );

    // Fetch with DATE_FORMAT — prevents UTC midnight → wrong IST date in response
    // JOIN dept_consultation_stats to get real avg consultation time for success page
    const [appointment] = await db.query(
      `SELECT a.id, a.booking_id, a.time_slot, a.full_name, a.phone, a.age,
       a.gender, a.status, a.predicted_wait_time, a.qr_code_data,
       a.patient_id, a.doctor_id, a.department_id,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
       d.first_name, d.last_name, d.specialization, dep.name as dept_name,
       COALESCE(dcs.avg_consultation_mins, 20.0)              as consultation_avg,
       COALESCE(dcs.slot_capacity, 6)                         as slot_capacity,
       ROUND(120.0 / COALESCE(dcs.slot_capacity, 6), 2)       as distributed_mins
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       LEFT JOIN dept_consultation_stats dcs ON a.department_id = dcs.department_id
       WHERE a.id = ?`,
      [result.insertId]
    );

    // patients_booked_in_slot = how many were booked BEFORE this patient
    // = their 0-indexed position → used to compute arrival window on success page
    const patientsBookedBefore = queueData[0].count; // count was taken before this insert

    // Email
    try {
      const [patient] = await db.query('SELECT email, first_name FROM patients WHERE id=?', [patient_id]);
      if (patient.length > 0) {
        await sendAppointmentConfirmation(
          patient[0].email, patient[0].first_name,
          { ...appointment[0], patient_id, qr_code_data }
        );
        console.log('✅ Email sent to:', patient[0].email);
      }
    } catch (e) { console.error('❌ Email error:', e.message); }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment: {
        ...appointment[0],
        patients_before: patientsBookedBefore,  // position = patients_before + 1
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error booking appointment.' });
  }
};

// ── Get Patient Appointments ──────────────────────────────────
// DATE_FORMAT: prevents MySQL UTC midnight object → wrong IST date
const getMyAppointments = async (req, res) => {
  try {
    const [appointments] = await db.query(
      `SELECT a.id, a.booking_id, a.time_slot, a.full_name, a.phone, a.age,
       a.gender, a.status, a.predicted_wait_time, a.qr_code_data,
       a.patient_id, a.doctor_id, a.department_id,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
       d.first_name, d.last_name, d.specialization, dep.name as dept_name
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// ── Get Doctor's Today Appointments ──────────────────────────
const getDoctorAppointments = async (req, res) => {
  try {
    // IST-safe today — avoids UTC midnight giving wrong date for Indian users
    const _now = new Date();
    const _ist = new Date(_now.getTime() + 5.5 * 60 * 60000);
    const cleanToday = `${_ist.getUTCFullYear()}-${String(_ist.getUTCMonth()+1).padStart(2,'0')}-${String(_ist.getUTCDate()).padStart(2,'0')}`;

    const [appointments] = await db.query(
      `SELECT a.id, a.booking_id, a.time_slot, a.full_name, a.status, a.age, a.gender,
       a.reason_for_visit, a.predicted_wait_time, a.patient_id, a.department_id,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
       p.first_name as p_first, p.last_name as p_last,
       dep.name as dept_name, q.queue_position, q.status as queue_status,
       ROUND(120.0 / COALESCE(dcs.slot_capacity, 6), 2)  as dept_avg_mins,
       COALESCE(dcs.slot_capacity, 6)                     as slot_capacity,
       COALESCE(dcs.total_samples, 0)                     as dept_samples
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN departments dep ON a.department_id = dep.id
       LEFT JOIN queue q ON a.id = q.appointment_id
       LEFT JOIN dept_consultation_stats dcs ON a.department_id = dcs.department_id
       WHERE a.doctor_id = ? AND a.appointment_date = ?
       ORDER BY q.queue_position ASC, a.time_slot ASC`,
      [req.user.id, cleanToday]
    );
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// ── Cancel Appointment ────────────────────────────────────────
const cancelAppointment = async (req, res) => {
  try {
    const { id }     = req.params;
    const patient_id = req.user.id;

    const [appt] = await db.query(
      `SELECT a.*, d.first_name, d.last_name, dep.name as dept_name,
       p.email, p.first_name as p_first,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = ? AND a.patient_id = ?`,
      [id, patient_id]
    );
    if (appt.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    if (['Completed', 'In-Progress', 'Checked-In'].includes(appt[0].status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel at this stage.' });
    }

    await db.query(`UPDATE appointments SET status='Cancelled' WHERE id=?`, [id]);
    try {
      await sendCancellationEmail(appt[0].email, appt[0].p_first, appt[0]);
    } catch (e) { console.error('Email error:', e.message); }

    res.json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

module.exports = { bookAppointment, getMyAppointments, getDoctorAppointments, cancelAppointment };