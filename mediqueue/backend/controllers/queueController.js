const db = require('../models/db');
const { sendCheckInEmail, sendCompletionEmail } = require('../utils/emailService');

const getQueue = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const today = new Date();
    const cleanToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const [queue] = await db.query(
      `SELECT q.*, a.booking_id, a.full_name, a.age, a.gender, a.time_slot,
       a.reason_for_visit, a.predicted_wait_time, a.patient_id, a.department_id,
       d.first_name as doc_first, d.last_name as doc_last
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE q.department_id = ? AND a.appointment_date = ?
       AND q.status IN ('Waiting','In-Progress')
       ORDER BY q.queue_position ASC`,
      [departmentId, cleanToday]
    );
    res.json({ success: true, queue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching queue.' });
  }
};

const getAllQueues = async (req, res) => {
  try {
    const today = new Date();
    const cleanToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const [queue] = await db.query(
      `SELECT q.*, a.booking_id, a.full_name, a.age, a.time_slot,
       a.predicted_wait_time, a.id as appointment_id, dep.name as dept_name,
       d.first_name as doc_first, d.last_name as doc_last
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN departments dep ON q.department_id = dep.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.appointment_date = ? AND q.status IN ('Waiting','In-Progress')
       ORDER BY q.department_id, q.queue_position ASC`,
      [cleanToday]
    );
    res.json({ success: true, queue });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching all queues.' });
  }
};

const checkIn = async (req, res) => {
  try {
    const { booking_id } = req.body;
    const today = new Date();
    const cleanToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const [appts] = await db.query(
      `SELECT a.*, p.email, p.first_name as p_first, p.last_name as p_last,
       d.first_name as doc_first, d.last_name as doc_last, dep.name as dept_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.booking_id = ? AND a.appointment_date = ? AND a.status = 'Booked'`,
      [booking_id, cleanToday]
    );
    if (appts.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found or already checked in.' });
    }

    const appt = appts[0];
    const [existing] = await db.query('SELECT id FROM queue WHERE appointment_id = ?', [appt.id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Patient already in queue.' });
    }

    const [posResult] = await db.query(
      `SELECT COUNT(*) as count FROM queue WHERE department_id = ? AND status IN ('Waiting','In-Progress')`,
      [appt.department_id]
    );
    const position = posResult[0].count + 1;

    await db.query(
      `INSERT INTO queue (appointment_id, department_id, doctor_id, queue_position) VALUES (?,?,?,?)`,
      [appt.id, appt.department_id, appt.doctor_id, position]
    );
    await db.query(`UPDATE appointments SET status = 'Checked-In' WHERE id = ?`, [appt.id]);

    // Send check-in email
    try {
      await sendCheckInEmail(appt.email, appt.p_first, {
        dept_name: appt.dept_name,
        doc_first: appt.doc_first,
        doc_last: appt.doc_last,
        position,
        booking_id: appt.booking_id
      });
    } catch (e) { console.error('Email error:', e.message); }

    const io = req.app.get('io');
    if (io) {
      io.to(`dept-${appt.department_id}`).emit('queue:updated', { departmentId: appt.department_id });
      io.to('admin-all').emit('queue:updated', { departmentId: appt.department_id });
    }

    res.json({ success: true, message: `Patient checked in at position #${position}.`, position });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error checking in patient.' });
  }
};

const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const [appts] = await db.query(
      `SELECT a.*, p.email, p.first_name as p_first, p.last_name as p_last,
       d.first_name as doc_first, d.last_name as doc_last, dep.name as dept_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.id = ? AND a.doctor_id = ?`,
      [appointmentId, req.user.id]
    );
    if (appts.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    const [queueEntry] = await db.query('SELECT * FROM queue WHERE appointment_id = ?', [appointmentId]);
    if (queueEntry.length === 0) return res.status(404).json({ success: false, message: 'Queue entry not found.' });

    const completedPosition = queueEntry[0].queue_position;
    const deptId = queueEntry[0].department_id;
    const appt = appts[0];

    await db.query(`UPDATE queue SET status = 'Completed' WHERE appointment_id = ?`, [appointmentId]);
    await db.query(`UPDATE appointments SET status = 'Completed' WHERE id = ?`, [appointmentId]);
    await db.query(
      `UPDATE queue SET queue_position = queue_position - 1
       WHERE department_id = ? AND queue_position > ? AND status = 'Waiting'`,
      [deptId, completedPosition]
    );

    // Send completion email
    try {
      await sendCompletionEmail(appt.email, appt.p_first, {
        doc_first: appt.doc_first,
        doc_last: appt.doc_last,
        dept_name: appt.dept_name,
        appointment_date: appt.appointment_date,
        booking_id: appt.booking_id
      });
    } catch (e) { console.error('Email error:', e.message); }

    const io = req.app.get('io');
    if (io) {
      io.to(`dept-${deptId}`).emit('queue:updated', { departmentId: deptId });
      io.to(`appt-${appointmentId}`).emit('appointment:done', { message: 'Your consultation is complete!' });
      io.to('admin-all').emit('queue:updated', { departmentId: deptId });
    }

    res.json({ success: true, message: 'Appointment marked as completed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error completing appointment.' });
  }
};

const markNoShow = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const [queueEntry] = await db.query('SELECT * FROM queue WHERE appointment_id = ?', [appointmentId]);
    if (queueEntry.length > 0) {
      const completedPosition = queueEntry[0].queue_position;
      const deptId = queueEntry[0].department_id;
      await db.query(`UPDATE queue SET status = 'No-Show' WHERE appointment_id = ?`, [appointmentId]);
      await db.query(
        `UPDATE queue SET queue_position = queue_position - 1
         WHERE department_id = ? AND queue_position > ? AND status = 'Waiting'`,
        [deptId, completedPosition]
      );
      const io = req.app.get('io');
      if (io) io.to(`dept-${deptId}`).emit('queue:updated', { departmentId: deptId });
    }
    await db.query(`UPDATE appointments SET status = 'No-Show' WHERE id = ?`, [appointmentId]);
    res.json({ success: true, message: 'Marked as No-Show.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

const getMyQueuePosition = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const [rows] = await db.query(
      `SELECT q.queue_position, q.status, a.predicted_wait_time, a.time_slot,
       a.booking_id, a.department_id,
       (SELECT COUNT(*) FROM queue q2
        WHERE q2.department_id = q.department_id
        AND q2.queue_position < q.queue_position
        AND q2.status = 'Waiting') as patients_ahead
       FROM queue q JOIN appointments a ON q.appointment_id = a.id
       WHERE q.appointment_id = ?`,
      [appointmentId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not in queue yet.' });
    res.json({ success: true, ...rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

module.exports = { getQueue, getAllQueues, checkIn, completeAppointment, markNoShow, getMyQueuePosition };