const db = require('../models/db');

// ── Save/Update Prescription ──────────────────────────────────
const savePrescription = async (req, res) => {
  try {
    const { appointment_id, diagnosis, medicines, instructions, follow_up_date, notes } = req.body;
    const doctor_id = req.user.id;

    if (!appointment_id || !diagnosis) {
      return res.status(400).json({ success: false, message: 'appointment_id and diagnosis are required.' });
    }

    // Verify appointment belongs to this doctor
    const [appt] = await db.query(
      'SELECT id, patient_id, department_id FROM appointments WHERE id=? AND doctor_id=?',
      [appointment_id, doctor_id]
    );
    if (appt.length === 0) {
      return res.status(403).json({ success: false, message: 'Appointment not found or not yours.' });
    }

    // Safe stringify: avoid double-encoding if already a string
    const medicinesJson = medicines
      ? (typeof medicines === 'string' ? medicines : JSON.stringify(medicines))
      : null;
    const followUp = follow_up_date || null;

    await db.query(
      `INSERT INTO prescriptions
        (appointment_id, doctor_id, patient_id, department_id, diagnosis, medicines, instructions, follow_up_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        diagnosis=VALUES(diagnosis), medicines=VALUES(medicines),
        instructions=VALUES(instructions), follow_up_date=VALUES(follow_up_date),
        notes=VALUES(notes), updated_at=NOW()`,
      [appointment_id, doctor_id, appt[0].patient_id, appt[0].department_id,
       diagnosis, medicinesJson, instructions || null, followUp, notes || null]
    );

    res.json({ success: true, message: 'Prescription saved.' });
  } catch (err) {
    console.error('savePrescription:', err);
    res.status(500).json({ success: false, message: 'Error saving prescription.' });
  }
};

// ── Get My Prescriptions (patient) ───────────────────────────
const getMyPrescriptions = async (req, res) => {
  try {
    const patient_id = req.user.id;
    const [rows] = await db.query(
      `SELECT pr.id, pr.appointment_id, pr.doctor_id, pr.patient_id, pr.department_id,
       pr.diagnosis, pr.medicines, pr.instructions, pr.notes,
       DATE_FORMAT(pr.follow_up_date, '%Y-%m-%d') as follow_up_date,
       DATE_FORMAT(pr.created_at, '%Y-%m-%d %H:%i') as created_at,
       d.first_name as doc_first, d.last_name as doc_last, d.specialization,
       dep.name as dept_name,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
       a.time_slot, a.booking_id
       FROM prescriptions pr
       JOIN doctors d ON pr.doctor_id = d.id
       JOIN departments dep ON pr.department_id = dep.id
       JOIN appointments a ON pr.appointment_id = a.id
       WHERE pr.patient_id = ?
       ORDER BY pr.created_at DESC`,
      [patient_id]
    );
    // Parse medicines JSON
    const safeParse = (val) => {
      if (!val) return [];
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
      return val;
    };
    const prescriptions = rows.map(r => ({ ...r, medicines: safeParse(r.medicines) }));
    res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// ── Get Prescription by appointment (doctor/patient) ─────────
const getPrescriptionByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const [rows] = await db.query(
      `SELECT pr.id, pr.appointment_id, pr.doctor_id, pr.patient_id, pr.department_id,
       pr.diagnosis, pr.medicines, pr.instructions, pr.notes,
       DATE_FORMAT(pr.follow_up_date, '%Y-%m-%d') as follow_up_date,
       DATE_FORMAT(pr.created_at, '%Y-%m-%d') as created_at,
       d.first_name as doc_first, d.last_name as doc_last
       FROM prescriptions pr
       JOIN doctors d ON pr.doctor_id = d.id
       WHERE pr.appointment_id = ?`,
      [appointmentId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'No prescription yet.' });
    // Safe parse: mysql2 driver may auto-parse JSON columns → already object
    // If it's a string, parse it; if it's already an object/array, use as-is
    const safeParse = (val) => {
      if (!val) return [];
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
      return val; // already parsed by mysql2
    };
    const p = { ...rows[0], medicines: safeParse(rows[0].medicines) };
    res.json({ success: true, prescription: p });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// ── Delete Prescription (doctor only) ────────────────────────
const deletePrescription = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctor_id = req.user.id;
    await db.query(
      'DELETE FROM prescriptions WHERE appointment_id=? AND doctor_id=?',
      [appointmentId, doctor_id]
    );
    res.json({ success: true, message: 'Prescription removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

module.exports = { savePrescription, getMyPrescriptions, getPrescriptionByAppointment, deletePrescription };