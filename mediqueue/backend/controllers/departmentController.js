const db = require('../models/db');

const getDepartments = async (req, res) => {
  try {
    const [departments] = await db.query('SELECT * FROM departments ORDER BY name');
    res.json({ success: true, departments });
  } catch (err) {
    console.error('❌ getDepartments error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDoctorsByDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const [doctors] = await db.query(
      `SELECT d.id, d.first_name, d.last_name, d.specialization, d.years_of_experience,
       d.languages_known, d.consultation_fee, d.profile_image_url, dep.name as department_name
       FROM doctors d JOIN departments dep ON d.department_id = dep.id
       WHERE d.department_id = ? AND d.is_approved = TRUE`,
      [id]
    );

    const today = new Date().toISOString().split('T')[0];
    for (let doc of doctors) {
      const [slots] = await db.query(
        `SELECT time_slot, COUNT(*) as booked FROM appointments
         WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('Cancelled','No-Show')
         GROUP BY time_slot`,
        [doc.id, today]
      );
      doc.slots_today = slots;

      const [queueCount] = await db.query(
        `SELECT COUNT(*) as count FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         WHERE a.doctor_id = ? AND a.appointment_date = ? AND q.status = 'Waiting'`,
        [doc.id, today]
      );
      doc.current_queue = queueCount[0].count;
      doc.estimated_wait = Math.max(15, doc.current_queue * 15 + 10);
      doc.load_level = doc.current_queue <= 3 ? 'Low' : doc.current_queue <= 6 ? 'Medium' : 'High';
    }

    res.json({ success: true, doctors });
  } catch (err) {
    console.error('❌ getDoctorsByDepartment error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT d.*, dep.name as department_name FROM doctors d
       JOIN departments dep ON d.department_id = dep.id
       WHERE d.id = ? AND d.is_approved = TRUE`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    const { password_hash, ...doctor } = rows[0];
    res.json({ success: true, doctor });
  } catch (err) {
    console.error('❌ getDoctorById error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDoctorSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const slots = ['8:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00'];
    const capacity = 10;

    const [booked] = await db.query(
      `SELECT time_slot, COUNT(*) as count FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('Cancelled','No-Show')
       GROUP BY time_slot`,
      [id, date]
    );

    const bookedMap = {};
    booked.forEach(b => { bookedMap[b.time_slot] = b.count; });

    const slotsData = slots.map(slot => ({
      slot,
      booked: bookedMap[slot] || 0,
      capacity,
      available: capacity - (bookedMap[slot] || 0),
      predicted_wait: Math.max(15, (bookedMap[slot] || 0) * 8 + 10)
    }));

    res.json({ success: true, slots: slotsData });
  } catch (err) {
    console.error('❌ getDoctorSlots error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDepartments, getDoctorsByDepartment, getDoctorById, getDoctorSlots };