const db = require('../models/db');
const QRCode = require('qrcode');
const { sendAppointmentConfirmation, sendCancellationEmail } = require('../utils/emailService');

const generateBookingId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MQ-${timestamp}-${random}`;
};

const predictWaitTime = (departmentId, queueLength, timeSlot) => {
  const baseTimes = {1:20,2:30,3:25,4:15,5:35,6:20,7:25,8:20,9:25,10:30,11:40,12:10};
  const peakSlots = ['10:00-12:00','11:00-13:00'];
  const peakMultiplier = peakSlots.includes(timeSlot) ? 1.2 : 1.0;
  const base = baseTimes[departmentId] || 20;
  return Math.max(10, Math.round((base + queueLength * 12) * peakMultiplier + Math.floor(Math.random() * 8)));
};

const bookAppointment = async (req, res) => {
  try {
    const { doctor_id, department_id, appointment_date, time_slot, full_name, phone, age, gender, reason_for_visit } = req.body;
    const patient_id = req.user.id;
    const cleanDate = appointment_date.split('T')[0];

    const [slotCount] = await db.query(
      `SELECT COUNT(*) as count FROM appointments WHERE doctor_id=? AND appointment_date=? AND time_slot=? AND status NOT IN ('Cancelled','No-Show')`,
      [doctor_id, cleanDate, time_slot]
    );
    if (slotCount[0].count >= 10) {
      return res.status(400).json({ success: false, message: 'This time slot is fully booked.' });
    }

    const [dup] = await db.query(
      `SELECT id FROM appointments WHERE patient_id=? AND doctor_id=? AND appointment_date=? AND status NOT IN ('Cancelled','No-Show')`,
      [patient_id, doctor_id, cleanDate]
    );
    if (dup.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have an appointment with this doctor on this date.' });
    }

    let booking_id = generateBookingId();
    for (let i = 0; i < 5; i++) {
      const [ex] = await db.query('SELECT id FROM appointments WHERE booking_id=?', [booking_id]);
      if (ex.length === 0) break;
      booking_id = generateBookingId();
    }

    const [queueData] = await db.query(
      `SELECT COUNT(*) as count FROM appointments WHERE doctor_id=? AND appointment_date=? AND status NOT IN ('Cancelled','No-Show')`,
      [doctor_id, cleanDate]
    );
    const predicted_wait = predictWaitTime(department_id, queueData[0].count, time_slot);

    // Generate unique QR code with full booking details + unique timestamp
    const qrData = JSON.stringify({
      booking_id,
      patient_id,
      department_id,
      doctor_id,
      date: cleanDate,
      slot: time_slot,
      generated_at: Date.now() // makes every QR unique
    });

    // Generate QR as PNG base64 — keep small so Gmail doesn't strip it
    const qr_code_data = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      width: 180
    });

    const [result] = await db.query(
      `INSERT INTO appointments (booking_id, patient_id, doctor_id, department_id, appointment_date, time_slot, full_name, phone, age, gender, reason_for_visit, predicted_wait_time, qr_code_data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [booking_id, patient_id, doctor_id, department_id, cleanDate, time_slot, full_name, phone.replace(/\D/g,''), age, gender, reason_for_visit || null, predicted_wait, qr_code_data]
    );

    const [appointment] = await db.query(
      `SELECT a.*, a.patient_id, d.first_name, d.last_name, d.specialization, dep.name as dept_name
       FROM appointments a JOIN doctors d ON a.doctor_id=d.id JOIN departments dep ON a.department_id=dep.id WHERE a.id=?`,
      [result.insertId]
    );

    // Send confirmation email with QR code
    try {
      const [patient] = await db.query('SELECT email, first_name FROM patients WHERE id=?', [patient_id]);
      if (patient.length > 0) {
        await sendAppointmentConfirmation(
          patient[0].email,
          patient[0].first_name,
          {
            ...appointment[0],
            patient_id,        // ensure patient_id is present
            qr_code_data       // pass stored QR base64 directly
          }
        );
        console.log('✅ Confirmation email sent to:', patient[0].email);
      }
    } catch (e) {
      console.error('❌ Email error:', e.message);
    }

    res.status(201).json({ success: true, message: 'Appointment booked successfully!', appointment: appointment[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error booking appointment.' });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const [appointments] = await db.query(
      `SELECT a.*, d.first_name, d.last_name, d.specialization, dep.name as dept_name
       FROM appointments a JOIN doctors d ON a.doctor_id=d.id JOIN departments dep ON a.department_id=dep.id
       WHERE a.patient_id=? ORDER BY a.appointment_date DESC, a.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

const getDoctorAppointments = async (req, res) => {
  try {
    const today = new Date();
    const cleanToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const [appointments] = await db.query(
      `SELECT a.*, p.first_name as p_first, p.last_name as p_last,
       dep.name as dept_name, q.queue_position, q.status as queue_status
       FROM appointments a JOIN patients p ON a.patient_id=p.id JOIN departments dep ON a.department_id=dep.id
       LEFT JOIN queue q ON a.id=q.appointment_id
       WHERE a.doctor_id=? AND a.appointment_date=?
       ORDER BY q.queue_position ASC, a.time_slot ASC`,
      [req.user.id, cleanToday]
    );
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const patient_id = req.user.id;
    const [appt] = await db.query(
      `SELECT a.*, d.first_name, d.last_name, dep.name as dept_name, p.email, p.first_name as p_first
       FROM appointments a JOIN doctors d ON a.doctor_id=d.id JOIN departments dep ON a.department_id=dep.id
       JOIN patients p ON a.patient_id=p.id WHERE a.id=? AND a.patient_id=?`,
      [id, patient_id]
    );
    if (appt.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (['Completed','In-Progress','Checked-In'].includes(appt[0].status)) {
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