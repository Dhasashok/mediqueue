const db = require('../models/db');
const { sendCheckInEmail, sendCompletionEmail } = require('../utils/emailService');

// ════════════════════════════════════════════════════════════
// REAL ML — Consultation Time Tracking
//
// Flow:
// 1. Patient checks in  → check_in_time recorded (existing column)
// 2. Doctor marks Complete → completed_at = NOW() (new column)
// 3. consultation_mins = TIMESTAMPDIFF(completed_at, check_in_time)
// 4. Every 23:59 → avg per dept recalculated from today's data
// 5. dept_consultation_stats table updated
// 6. Next day: slot_capacity = floor(120 / real_avg_mins)
// Fallback: 20 min default if no real data yet
// ════════════════════════════════════════════════════════════

// ── IST-safe today date ───────────────────────────────────────
const getLocalToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
};

// ── Auto-cleanup stale queue entries from previous days ───────
const cleanOldQueueEntries = async () => {
  try {
    const today = getLocalToday();
    await db.query(
      `UPDATE queue q JOIN appointments a ON q.appointment_id = a.id
       SET q.status = 'No-Show'
       WHERE q.status IN ('Waiting','In-Progress') AND a.appointment_date < ?`,
      [today]
    );
    await db.query(
      `UPDATE appointments a JOIN queue q ON a.id = q.appointment_id
       SET a.status = 'No-Show'
       WHERE a.status = 'Checked-In' AND a.appointment_date < ?`,
      [today]
    );
  } catch (e) { console.error('Queue cleanup error:', e.message); }
};

// ════════════════════════════════════════════════════════════
// MIDNIGHT RECALCULATION — The core ML logic
// Reads all completed consultations from today
// Calculates real avg per department
// Updates dept_consultation_stats
// slot_capacity = floor(120 / real_avg_mins)
// ════════════════════════════════════════════════════════════
const recalculateDeptStats = async () => {
  try {
    console.log(`\n🔄 ML Recalculation — using ALL historical consultation data`);

    // ── Only reliable data: treatment_start_time records ───────
    // treatment_start_time is set when doctor clicks ▶ Start
    // consultation_mins = completed_at - treatment_start_time = TRUE treatment duration
    // If treatment_start_time is NULL → consultation_mins includes queue wait (wrong)
    // Require MIN_RELIABLE_SAMPLES per dept before updating anything
    // ── Thresholds (tuned for real hospital use) ─────────────
    // MIN_CONSULT_MINS: A real consultation takes at least 5 min.
    //   Values < 5 min = test runs, accidental completions, or click errors.
    //   We reject these to prevent corrupt data from lowering the avg.
    // MAX_CONSULT_MINS: Hard cap at 60 min per session.
    //   Values > 60 min = doctor forgot to click Complete, system error.
    // DATE WINDOW: Last 20 days only.
    //   Older data may reflect different doctors/patient load.
    //   20 days keeps the avg fresh and representative of current hospital speed.
    //   As real data accumulates day by day, the avg self-corrects naturally.
    const MIN_CONSULT_MINS = 5;   // below this = test/accidental
    const MAX_CONSULT_MINS = 60;  // above this = forgot to complete
    const DAYS_WINDOW      = 20;  // only use data from last 20 days

    const [reliableStats] = await db.query(
      `SELECT
         a.department_id,
         COUNT(q.id)                          as total_samples,
         ROUND(AVG(q.consultation_mins), 1)   as avg_consultation_mins,
         ROUND(MIN(q.consultation_mins), 1)   as min_mins,
         ROUND(MAX(q.consultation_mins), 1)   as max_mins
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       WHERE q.status = 'Completed'
         AND q.consultation_mins IS NOT NULL
         AND q.consultation_mins >= ?
         AND q.consultation_mins <= ?
         AND q.treatment_start_time IS NOT NULL
         AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY a.department_id`,
      [MIN_CONSULT_MINS, MAX_CONSULT_MINS, DAYS_WINDOW]
    );

    // Build a map of reliable data by dept
    const reliableMap = {};
    for (const r of reliableStats) {
      reliableMap[r.department_id] = r;
    }

    // Only use reliable data (treatment_start_time recorded)
    // No fallback query — if data is incomplete, skip entirely
    const deptIds = reliableStats.map(r => r.department_id);

    if (deptIds.length === 0) {
      console.log('   No reliable consultation data yet — all seeded values preserved. ⏸️');
      return;
    }

    // Minimum reliable samples required before ANY update is made
    // Below this threshold → keep existing seeded values completely untouched
    const MIN_RELIABLE_SAMPLES = 5;  // need 5+ real consultations per dept before updating
    let updatedCount = 0;
    let skippedCount = 0;

    for (const deptId of deptIds) {
      const reliable = reliableMap[deptId];

      // ── STRICT RULE: Only update if we have enough RELIABLE data ─────
      // Reliable = treatment_start_time was recorded (doctor clicked ▶ Start)
      // This gives TRUE consultation time: doctor-starts → doctor-completes
      // If doctor never clicks ▶ Start, check_in_time is used which includes
      // the entire queue wait — making avg = 54 min instead of 14 min.
      //
      // If data is incomplete (no reliable records, or < MIN_RELIABLE_SAMPLES):
      //   → DO NOTHING. Keep seeded values from dummy_ml_data.sql exactly as-is.
      //   → The avg, slot_capacity, and last_updated are all preserved.
      //   → Nothing changes until real treatment-start data accumulates.

      if (!reliable || reliable.total_samples < MIN_RELIABLE_SAMPLES) {
        const reason = !reliable
          ? 'no treatment_start records'
          : `only ${reliable.total_samples} reliable sample(s) — need ${MIN_RELIABLE_SAMPLES}`;
        console.log(`   Dept ${deptId}: SKIPPED (${reason}) — keeping seeded values ⏸️`);
        skippedCount++;
        continue; // ← skip entirely, touch nothing
      }

      // We have enough reliable data → update BOTH avg and slot_capacity
      const avgMins  = parseFloat(reliable.avg_consultation_mins) || 20.0;
      const samples  = reliable.total_samples;
      const capacity = Math.max(3, Math.floor(120 / avgMins));

      await db.query(
        `INSERT INTO dept_consultation_stats
           (department_id, avg_consultation_mins, slot_capacity, total_samples, last_updated)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           avg_consultation_mins = VALUES(avg_consultation_mins),
           slot_capacity         = VALUES(slot_capacity),
           total_samples         = VALUES(total_samples),
           last_updated          = NOW()`,
        [deptId, avgMins, capacity, samples]
      );
      console.log(`   Dept ${deptId}: avg=${avgMins}min → capacity=${capacity}/slot (${samples} reliable samples) ✅`);
      updatedCount++;
    }

    console.log(`\n✅ ML done: ${updatedCount} dept(s) updated, ${skippedCount} skipped (incomplete data).\n`);
  } catch (e) {
    console.error('❌ recalculateDeptStats error:', e.message);
  }
};

// ── Schedule midnight recalculation (IST-aware, self-rescheduling) ──
// Uses IST (UTC+5:30) so it fires at 23:59 Indian time, not UTC time
// Self-reschedules after each run → always correct next-day timing
const scheduleMidnightRecalculation = () => {
  const getNextTarget = () => {
    const now    = new Date();
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60000);
    const target = new Date(istNow);
    target.setHours(23, 59, 0, 0);
    // If 23:59 has already passed today, schedule for tomorrow
    if (target <= istNow) target.setDate(target.getDate() + 1);
    return target.getTime() - istNow.getTime(); // ms until next 23:59 IST
  };

  const scheduleNext = () => {
    const msUntil = getNextTarget();
    const hrsUntil = Math.round(msUntil / 60000);
    console.log(`⏰ ML recalculation scheduled in ${hrsUntil} min (at 23:59 IST daily)`);

    setTimeout(async () => {
      console.log('\n🤖 Running nightly ML recalculation...');
      await recalculateDeptStats();
      scheduleNext(); // ← self-reschedule for next night (not setInterval)
    }, msUntil);
  };

  scheduleNext();
};

// ── Get real slot capacity from DB ────────────────────────────
const getRealSlotCapacity = async (department_id) => {
  try {
    const [rows] = await db.query(
      `SELECT slot_capacity, avg_consultation_mins, total_samples
       FROM dept_consultation_stats WHERE department_id = ?`,
      [department_id]
    );
    if (rows.length > 0 && rows[0].total_samples > 0) {
      return {
        capacity: rows[0].slot_capacity,
        avg_mins: parseFloat(rows[0].avg_consultation_mins),
        samples:  rows[0].total_samples,
        source:   'real_data'
      };
    }
    return { capacity: 6, avg_mins: 20.0, samples: 0, source: 'default_20min' };
  } catch (e) {
    return { capacity: 6, avg_mins: 20.0, samples: 0, source: 'fallback' };
  }
};

// ── Get queue for a specific department ───────────────────────
const getQueue = async (req, res) => {
  try {
    await cleanOldQueueEntries();
    const { departmentId } = req.params;
    const today = getLocalToday();
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
      [departmentId, today]
    );
    res.json({ success: true, queue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching queue.' });
  }
};

// ── Get all queues ────────────────────────────────────────────
const getAllQueues = async (req, res) => {
  try {
    await cleanOldQueueEntries();
    const today = getLocalToday();
    const [queue] = await db.query(
      `SELECT q.*, a.booking_id, a.full_name, a.age, a.time_slot,
       a.predicted_wait_time, a.id as appointment_id, dep.name as dept_name,
       d.first_name as doc_first, d.last_name as doc_last,
       COALESCE(dcs.slot_capacity, 6)                          as slot_capacity,
       ROUND(120.0 / COALESCE(dcs.slot_capacity, 6), 2)        as distributed_mins
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN departments dep ON q.department_id = dep.id
       JOIN doctors d ON a.doctor_id = d.id
       LEFT JOIN dept_consultation_stats dcs ON q.department_id = dcs.department_id
       WHERE a.appointment_date = ? AND q.status IN ('Waiting','In-Progress')
       ORDER BY q.department_id, q.queue_position ASC`,
      [today]
    );
    res.json({ success: true, queue });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching all queues.' });
  }
};

// ── Check In Patient ──────────────────────────────────────────
const checkIn = async (req, res) => {
  try {
    await cleanOldQueueEntries();
    const { booking_id } = req.body;
    const today = getLocalToday();

    const [appts] = await db.query(
      `SELECT a.*, p.email, p.first_name as p_first, p.last_name as p_last,
       d.first_name as doc_first, d.last_name as doc_last, dep.name as dept_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.booking_id = ? AND a.appointment_date = ? AND a.status = 'Booked'`,
      [booking_id, today]
    );
    if (appts.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found or already checked in.' });
    }

    const appt = appts[0];
    const [existing] = await db.query('SELECT id FROM queue WHERE appointment_id = ?', [appt.id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Patient already in queue.' });
    }

    // Count only TODAY's queue (prevents ghost positions from old data)
    const [posResult] = await db.query(
      `SELECT COUNT(*) as count FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       WHERE q.department_id = ? AND q.status IN ('Waiting','In-Progress')
       AND a.appointment_date = ?`,
      [appt.department_id, today]
    );
    const position = posResult[0].count + 1;

    // check_in_time = NOW() — used later to calculate consultation_mins
    await db.query(
      `INSERT INTO queue (appointment_id, department_id, doctor_id, queue_position, check_in_time)
       VALUES (?,?,?,?, NOW())`,
      [appt.id, appt.department_id, appt.doctor_id, position]
    );
    await db.query(`UPDATE appointments SET status = 'Checked-In' WHERE id = ?`, [appt.id]);

    try {
      await sendCheckInEmail(appt.email, appt.p_first, {
        dept_name: appt.dept_name, doc_first: appt.doc_first,
        doc_last: appt.doc_last, position, booking_id: appt.booking_id
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

// ── Mark In Progress — doctor starts seeing patient ──────────
// Records treatment_start_time = NOW() when doctor begins consultation
// This is the TRUE start of treatment (not arrival/check-in time)
const markInProgress = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    await db.query(
      `UPDATE queue SET status='In-Progress', treatment_start_time=NOW()
       WHERE appointment_id=? AND treatment_start_time IS NULL`,
      [appointmentId]
    );
    await db.query(
      `UPDATE appointments SET status='In-Progress' WHERE id=?`,
      [appointmentId]
    );
    const io = req.app.get('io');
    if (io) {
      const [q] = await db.query('SELECT department_id FROM queue WHERE appointment_id=?', [appointmentId]);
      if (q.length > 0) {
        io.to(`dept-${q[0].department_id}`).emit('queue:updated', { departmentId: q[0].department_id });
      }
    }
    res.json({ success: true, message: 'Treatment started. Timer running.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// ════════════════════════════════════════════════════════════
// COMPLETE APPOINTMENT — Records actual consultation time
// This is the key data collection point for real ML
// consultation_mins = NOW() - check_in_time (in minutes)
// ════════════════════════════════════════════════════════════
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
    if (appts.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const [queueEntry] = await db.query('SELECT * FROM queue WHERE appointment_id = ?', [appointmentId]);
    if (queueEntry.length === 0) {
      return res.status(404).json({ success: false, message: 'Queue entry not found.' });
    }

    const completedPosition = queueEntry[0].queue_position;
    const deptId            = queueEntry[0].department_id;
    const appt              = appts[0];
    const checkInTime        = queueEntry[0].check_in_time;
    const treatmentStartTime = queueEntry[0].treatment_start_time;

    // ── Record real consultation time ─────────────────────────
    // RULE: Only save consultation_mins when doctor clicked ▶ Start
    // treatment_start_time → completed_at = TRUE treatment duration
    //
    // check_in_time is NEVER used — it records when patient arrived
    // at reception, which includes queue waiting time. Using it would
    // give wrong values like 54 min (40 min wait + 14 min treatment).
    //
    // If doctor does not click ▶ Start → consultationMins = null
    // null values are excluded from recalculateDeptStats query
    // → seeded ML values remain unchanged. Clean and correct.
    //
    // Thresholds:
    //   < 5 min  = accidental click / test run → reject
    //   > 60 min = doctor forgot to complete → reject
    let consultationMins = null;
    const SAVE_MIN_MINS  = 5;
    const SAVE_MAX_MINS  = 60;

    if (treatmentStartTime) {
      const diffMins = (new Date() - new Date(treatmentStartTime)) / 60000;
      if (diffMins >= SAVE_MIN_MINS && diffMins <= SAVE_MAX_MINS) {
        consultationMins = Math.round(diffMins * 10) / 10;
        console.log(`📊 Saved: Dept ${deptId} → ${consultationMins} min ✅`);
      } else if (diffMins < SAVE_MIN_MINS) {
        console.log(`⚠️ Skipped: ${diffMins.toFixed(1)} min — too short (< ${SAVE_MIN_MINS} min), likely accidental`);
      } else {
        console.log(`⚠️ Skipped: ${Math.round(diffMins)} min — too long (> ${SAVE_MAX_MINS} min), likely forgot to complete`);
      }
    } else {
      // Doctor did not click ▶ Start → no reliable time measurement
      // consultationMins stays null → recalculation ignores this record
      console.log(`ℹ️ No treatment_start for appt ${appointmentId} — consultation_mins not recorded`);
    }

    // Mark completed + store consultation time
    await db.query(
      `UPDATE queue SET status='Completed', completed_at=NOW(), consultation_mins=?
       WHERE appointment_id=?`,
      [consultationMins, appointmentId]
    );
    await db.query(`UPDATE appointments SET status='Completed' WHERE id=?`, [appointmentId]);

    // Shift remaining positions down by 1
    await db.query(
      `UPDATE queue SET queue_position = queue_position - 1
       WHERE department_id=? AND queue_position>? AND status='Waiting'`,
      [deptId, completedPosition]
    );

    try {
      await sendCompletionEmail(appt.email, appt.p_first, {
        doc_first: appt.doc_first, doc_last: appt.doc_last,
        dept_name: appt.dept_name, appointment_date: appt.appointment_date,
        booking_id: appt.booking_id
      });
    } catch (e) { console.error('Email error:', e.message); }

    const io = req.app.get('io');
    if (io) {
      io.to(`dept-${deptId}`).emit('queue:updated', { departmentId: deptId });
      io.to(`appt-${appointmentId}`).emit('appointment:done', { message: 'Your consultation is complete!' });
      io.to('admin-all').emit('queue:updated', { departmentId: deptId });
    }

    res.json({ success: true, message: 'Appointment completed.', consultation_mins: consultationMins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error completing appointment.' });
  }
};

// ── Mark No-Show ──────────────────────────────────────────────
const markNoShow = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const [queueEntry] = await db.query('SELECT * FROM queue WHERE appointment_id=?', [appointmentId]);
    if (queueEntry.length > 0) {
      const completedPosition = queueEntry[0].queue_position;
      const deptId            = queueEntry[0].department_id;
      await db.query(`UPDATE queue SET status='No-Show' WHERE appointment_id=?`, [appointmentId]);
      await db.query(
        `UPDATE queue SET queue_position=queue_position-1
         WHERE department_id=? AND queue_position>? AND status='Waiting'`,
        [deptId, completedPosition]
      );
      const io = req.app.get('io');
      if (io) {
        io.to(`dept-${deptId}`).emit('queue:updated', { departmentId: deptId });
        io.to('admin-all').emit('queue:updated', { departmentId: deptId });
      }
    }
    await db.query(`UPDATE appointments SET status='No-Show' WHERE id=?`, [appointmentId]);
    res.json({ success: true, message: 'Marked as No-Show.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// ── Get Patient's Queue Position ──────────────────────────────
const getMyQueuePosition = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const today = getLocalToday();
    const [rows] = await db.query(
      `SELECT q.queue_position, q.status, q.treatment_start_time, q.check_in_time,
       a.predicted_wait_time, a.time_slot, a.booking_id, a.department_id,
       (SELECT COUNT(*) FROM queue q2
        JOIN appointments a2 ON q2.appointment_id = a2.id
        WHERE q2.department_id = q.department_id
        AND q2.queue_position < q.queue_position
        AND q2.status IN ('Waiting','In-Progress')
        AND a2.appointment_date = ?) as patients_ahead
       FROM queue q JOIN appointments a ON q.appointment_id = a.id
       WHERE q.appointment_id = ?`,
      [today, appointmentId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not in queue yet.' });

    const row = rows[0];

    // ── Fetch distributed time per patient (equal distribution) ─
    // distributedMins = 120 / slot_capacity  (fair share for each patient)
    // e.g. Cardiology cap=8 → 120/8 = 15.0 min (not raw avg 14.2)
    // This ensures timer is consistent with booking page wait estimates
    let dept_avg_mins = 20.0;
    try {
      const [stats] = await db.query(
        `SELECT avg_consultation_mins, slot_capacity, total_samples
         FROM dept_consultation_stats WHERE department_id = ?`,
        [row.department_id]
      );
      if (stats.length > 0 && stats[0].total_samples > 0) {
        dept_avg_mins = Math.round((120 / stats[0].slot_capacity) * 100) / 100;
      }
    } catch (e) { /* table not ready — use default */ }

    // ── Fetch treatment_start_time of position #1 patient ─────
    // This is when the doctor ACTUALLY started treating the first patient.
    // Patient #2's remaining wait = dept_avg_mins - time_elapsed_since_pos1_started
    // Even if patient #2 logs in late, the timer reflects true remaining time.
    let pos1_treatment_start = null;
    try {
      const [pos1] = await db.query(
        `SELECT q.treatment_start_time, q.check_in_time
         FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         WHERE q.department_id = ? AND q.queue_position = 1
         AND q.status = 'In-Progress'
         AND a.appointment_date = ?
         LIMIT 1`,
        [row.department_id, today]
      );
      if (pos1.length > 0) {
        // Prefer treatment_start_time (doctor clicked ▶ Start), fallback to check_in_time
        pos1_treatment_start = pos1[0].treatment_start_time || pos1[0].check_in_time || null;
      }
    } catch (e) { /* ignore */ }

    res.json({ success: true, ...row, dept_avg_mins, pos1_treatment_start });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

// ── Get dept consultation stats (admin analytics) ─────────────
const getDeptConsultationStats = async (req, res) => {
  try {
    const [stats] = await db.query(
      `SELECT dcs.*, dep.name as dept_name
       FROM dept_consultation_stats dcs
       JOIN departments dep ON dcs.department_id = dep.id
       ORDER BY dcs.avg_consultation_mins DESC`
    );
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error.' });
  }
};

module.exports = {
  getQueue, getAllQueues, checkIn, completeAppointment,
  markInProgress, markNoShow, getMyQueuePosition, getDeptConsultationStats,
  getRealSlotCapacity, scheduleMidnightRecalculation, recalculateDeptStats,
};