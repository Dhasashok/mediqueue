const db = require('../models/db');

// ══════════════════════════════════════════════════════════════
// REAL DATA — from Hospital_Wait__TIme_Data.csv (5000 records)
// Formula: slot_capacity = floor(120 min / avg_consultation_min)
//
// Department           Avg Consult   2hr Capacity
// ─────────────────    ───────────   ────────────
// Internal Medicine    18.6 min      6 patients
// Cardiology           18.8 min      6 patients
// Orthopedics          18.8 min      6 patients
// General Surgery      19.2 min      6 patients
// Neurology            18.7 min      6 patients
// Pediatrics           18.5 min      6 patients
// Oncology             18.7 min      6 patients
// Emergency            18.6 min      6 patients
// Obstetrics           18.9 min      6 patients
// Radiology            18.2 min      6 patients
// Dentistry            18.6 min      6 patients  ← same as avg
// ENT                  18.6 min      6 patients  ← same as avg
//
// All departments = 6 patients max per 2-hour slot (data-driven)
// ══════════════════════════════════════════════════════════════

// dept_id → avg consultation time (minutes) from real dataset
const DEPT_CONSULTATION_MINS = {
  1:  18.6,  // Internal Medicine / General Medicine
  2:  18.8,  // Cardiology
  3:  18.8,  // Orthopedics
  4:  19.2,  // General Surgery
  5:  18.7,  // Neurology
  6:  18.5,  // Pediatrics
  7:  18.7,  // Oncology / Dermatology
  8:  18.6,  // Emergency / ENT
  9:  18.9,  // Obstetrics / Gynecology
  10: 18.2,  // Radiology
  11: 18.6,  // Dentistry
  12: 18.6,  // default
};

// dept_id → max patients per 2-hour slot = floor(120 / avg_consultation)
// All come to 6 based on real data
const DEPT_SLOT_CAPACITY = {};
Object.entries(DEPT_CONSULTATION_MINS).forEach(([id, mins]) => {
  DEPT_SLOT_CAPACITY[parseInt(id)] = Math.floor(120 / mins); // = 6 for all
});

// dept_id → avg queue wait time (minutes) from real dataset
// Used to show realistic wait time estimates on booking page
const DEPT_AVG_WAIT = {
  1:  61.2,  // Internal Medicine
  2:  53.7,  // Cardiology
  3:  57.6,  // Orthopedics
  4:  55.4,  // General Surgery
  5:  64.0,  // Neurology
  6:  44.3,  // Pediatrics
  7:  50.2,  // Oncology / Dermatology
  8:  47.6,  // Emergency / ENT
  9:  41.9,  // Obstetrics / Gynecology
  10: 41.1,  // Radiology
  11: 50.0,  // Dentistry (avg of dataset)
  12: 47.6,  // default (same as Emergency)
};

// ── Get All Departments ───────────────────────────────────────
const getDepartments = async (req, res) => {
  try {
    const [departments] = await db.query('SELECT * FROM departments ORDER BY name');
    res.json({ success: true, departments });
  } catch (err) {
    console.error('❌ getDepartments error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Doctors by Department ─────────────────────────────────
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

      const deptId = parseInt(id);
      // ── DYNAMIC capacity from DB, fallback to dataset defaults ──
      let deptConsultMins = DEPT_CONSULTATION_MINS[deptId] || 18.6;
      try {
        const [statsRow] = await db.query(
          `SELECT avg_consultation_mins, total_samples
           FROM dept_consultation_stats WHERE department_id = ?`,
          [deptId]
        );
        if (statsRow.length > 0 && statsRow[0].total_samples > 0) {
          deptConsultMins = parseFloat(statsRow[0].avg_consultation_mins);
        }
      } catch (e) { /* table not ready yet — use defaults */ }

      // Use real dataset avg wait time for this department
      const avgWait     = DEPT_AVG_WAIT[deptId] || 50;

      // Estimated wait = queue × real avg_consultation
      doc.estimated_wait  = Math.max(10, Math.round(doc.current_queue * deptConsultMins));
      doc.avg_dept_wait   = avgWait;
      doc.consultation_avg = deptConsultMins;
      doc.load_level = doc.current_queue <= 2 ? 'Low' : doc.current_queue <= 4 ? 'Medium' : 'High';
    }

    res.json({ success: true, doctors });
  } catch (err) {
    console.error('❌ getDoctorsByDepartment error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Doctor By ID ──────────────────────────────────────────
const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT d.*, dep.name as department_name FROM doctors d
       JOIN departments dep ON d.department_id = dep.id
       WHERE d.id = ? AND d.is_approved = TRUE`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }
    const { password_hash, ...doctor } = rows[0];
    res.json({ success: true, doctor });
  } catch (err) {
    console.error('❌ getDoctorById error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Doctor Slots (DYNAMIC — reads real capacity from DB) ──
// Day 1: uses dataset default (6 per slot, 20 min avg)
// Day 2+: uses real avg consultation time from dept_consultation_stats
// This makes the booking page automatically reflect real hospital speed
const getDoctorSlots = async (req, res) => {
  try {
    const { id }   = req.params;
    const { date } = req.query;

    const slots = [
      '8:00-10:00', '10:00-12:00', '12:00-14:00',
      '14:00-16:00', '16:00-18:00', '18:00-20:00'
    ];

    // Get doctor's department
    const [docRows] = await db.query(
      'SELECT department_id FROM doctors WHERE id = ?', [id]
    );
    const deptId  = docRows.length > 0 ? parseInt(docRows[0].department_id) : 1;
    const avgWait = DEPT_AVG_WAIT[deptId] || 50;

    // ── DYNAMIC: try real DB stats first, fall back to dataset defaults ──
    let capacity    = DEPT_SLOT_CAPACITY[deptId] || 6;
    let consultMins = DEPT_CONSULTATION_MINS[deptId] || 18.6;
    let dataSource  = 'dataset_default';

    try {
      const [statsRows] = await db.query(
        `SELECT slot_capacity, avg_consultation_mins, total_samples
         FROM dept_consultation_stats WHERE department_id = ?`,
        [deptId]
      );
      if (statsRows.length > 0 && statsRows[0].total_samples > 0) {
        capacity    = statsRows[0].slot_capacity;
        consultMins = parseFloat(statsRows[0].avg_consultation_mins);
        dataSource  = `real_data_${statsRows[0].total_samples}_samples`;
      }
    } catch (e) {
      // dept_consultation_stats table may not exist yet — use defaults
      console.warn('dept_consultation_stats not ready, using dataset defaults');
    }

    // ── Check if doctor is on leave for this date ────────────
    let isOnLeave = false;
    let leaveReason = '';
    try {
      const [leaveRows] = await db.query(
        `SELECT reason FROM doctor_leaves WHERE doctor_id = ? AND leave_date = ?`,
        [id, date]
      );
      if (leaveRows.length > 0) {
        isOnLeave = true;
        leaveReason = leaveRows[0].reason || 'Doctor unavailable';
      }
    } catch (e) { /* doctor_leaves table may not exist yet */ }

    // If doctor is on leave — return all slots as blocked
    if (isOnLeave) {
      const blockedSlots = slots.map(slot => ({
        slot, booked: 0, capacity: 0, available: 0,
        consultation_avg: consultMins, distributed_mins: 0,
        predicted_wait: 0, is_full: true, is_leave: true, leave_reason: leaveReason
      }));
      return res.json({
        success: true, slots: blockedSlots,
        department_id: deptId, slot_capacity: 0,
        consultation_avg: consultMins, avg_dept_wait: avgWait,
        is_on_leave: true, leave_reason: leaveReason
      });
    }

    const [booked] = await db.query(
      `SELECT time_slot, COUNT(*) as count FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('Cancelled','No-Show')
       GROUP BY time_slot`,
      [id, date]
    );

    const bookedMap = {};
    booked.forEach(b => { bookedMap[b.time_slot] = parseInt(b.count); });

    // ── Distributed mins: equal share per patient ───────────────
    const distributedMins = Math.round((120 / capacity) * 100) / 100;

    // ── Past slot detection (today only) ─────────────────────
    // Slot is "past" if its END hour <= current IST hour
    // e.g. at 11:27 IST: 8:00-10:00 (ends 10) → past ✓
    //                    10:00-12:00 (ends 12) → still open ✓
    // Future dates: isToday = false → no slots blocked as past
    const now        = new Date();
    const istNow     = new Date(now.getTime() + 5.5 * 60 * 60000);
    const todayStr   = `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth()+1).padStart(2,'0')}-${String(istNow.getUTCDate()).padStart(2,'0')}`;
    const isToday    = (date === todayStr);
    const istHour    = istNow.getUTCHours() + istNow.getUTCMinutes() / 60;

    const slotsData = slots.map(slot => {
      const bookedCount = bookedMap[slot] || 0;
      const available   = Math.max(0, capacity - bookedCount);

      // Equal distribution: distributed_mins per patient
      const predicted_wait = bookedCount === 0
        ? 0
        : Math.round(bookedCount * distributedMins);

      // Past slot: end hour already passed today
      // '8:00-10:00'  → slotEndHour = 10
      // '10:00-12:00' → slotEndHour = 12
      const slotEndHour = parseInt(slot.split('-')[1].split(':')[0]);
      const isPast      = isToday && istHour >= slotEndHour;

      return {
        slot,
        booked:           bookedCount,
        capacity,
        available:        isPast ? 0 : available,
        consultation_avg: consultMins,
        distributed_mins: distributedMins,
        predicted_wait,
        is_full:          available === 0,
        is_past:          isPast,
      };
    });

    res.json({
      success: true,
      slots:            slotsData,
      department_id:    deptId,
      slot_capacity:    capacity,
      distributed_mins: distributedMins,
      consultation_avg: consultMins,
      avg_dept_wait:    avgWait,
      data_source:      dataSource,
    });

  } catch (err) {
    console.error('❌ getDoctorSlots error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDepartments,
  getDoctorsByDepartment,
  getDoctorById,
  getDoctorSlots,
  DEPT_SLOT_CAPACITY,
  DEPT_CONSULTATION_MINS,
  DEPT_AVG_WAIT,
};