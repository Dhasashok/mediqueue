/**
 * MediQueue — Seed Realistic Clinical Training Consultations
 * Populates authentic historical hospital OPD consultations across the past 30 days.
 * Includes natural clinical variance and genuine real-world outliers so the ML model
 * can learn to statistically clean (via IQR) and accurately predict treatment times.
 * 
 * Usage:
 *   node backend/scripts/seedClinicalTrainingData.js
 *   node backend/scripts/seedClinicalTrainingData.js --count=1000
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const db = require('../models/db');

// Department Clinical Profiles (Gaussian Mean & Std Dev in minutes)
const DEPT_PROFILES = {
  1:  { name: 'Dentistry',        mean: 14.5, std: 3.0 },
  2:  { name: 'Cardiology',       mean: 19.5, std: 4.5 },
  3:  { name: 'Orthopedics',      mean: 21.5, std: 4.0 },
  4:  { name: 'General Medicine', mean: 15.0, std: 3.5 },
  5:  { name: 'Neurology',        mean: 29.0, std: 6.0 },
  6:  { name: 'Pediatrics',       mean: 12.5, std: 2.5 },
  7:  { name: 'Dermatology',      mean: 14.0, std: 3.0 },
  8:  { name: 'ENT',              mean: 11.5, std: 2.5 },
  9:  { name: 'Ophthalmology',    mean: 13.5, std: 3.0 },
  10: { name: 'Gynecology',       mean: 18.0, std: 4.0 },
  11: { name: 'Radiology',        mean: 16.0, std: 3.5 },
  12: { name: 'Emergency',        mean: 22.0, std: 5.0 }
};

const TIME_SLOTS = [
  '8:00-10:00', '10:00-12:00', '12:00-14:00',
  '14:00-16:00', '16:00-18:00', '18:00-20:00'
];

const PATIENT_NAMES = [
  { name: 'Aarav Sharma',   age: 34, gender: 'Male' },
  { name: 'Pooja Verma',    age: 28, gender: 'Female' },
  { name: 'Rohan Gupta',    age: 45, gender: 'Male' },
  { name: 'Sneha Patel',    age: 22, gender: 'Female' },
  { name: 'Vikram Singh',   age: 62, gender: 'Male' },
  { name: 'Ananya Roy',     age: 51, gender: 'Female' },
  { name: 'Karan Mehra',    age: 19, gender: 'Male' },
  { name: 'Divya Nair',     age: 38, gender: 'Female' },
  { name: 'Amit Joshi',     age: 58, gender: 'Male' },
  { name: 'Priyanka Sen',   age: 31, gender: 'Female' },
  { name: 'Rajesh Kumar',   age: 67, gender: 'Male' },
  { name: 'Sunita Mishra',  age: 41, gender: 'Female' },
  { name: 'Deepak Rao',     age: 29, gender: 'Male' },
  { name: 'Kavita Das',     age: 36, gender: 'Female' },
  { name: 'Sanjay Reddy',   age: 54, gender: 'Male' },
  { name: 'Meera Iyer',     age: 43, gender: 'Female' },
  { name: 'Arjun Kapoor',   age: 27, gender: 'Male' },
  { name: 'Neha Chawla',    age: 33, gender: 'Female' },
  { name: 'Manish Pandey',  age: 49, gender: 'Male' },
  { name: 'Shreya Ghosh',   age: 24, gender: 'Female' }
];

const CLINICAL_REASONS = [
  'Routine checkup', 'Follow-up procedure', 'Consultation',
  'Chronic condition', 'Acute illness', 'Prescription renewal',
  'Post-operative evaluation', 'Vaccination'
];

// Box-Muller transform for normal distribution
function randomGaussian(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.round((mean + z * std) * 10) / 10;
}

// Parse optional --count=1000 argument
const args = process.argv.slice(2);
let targetCount = 1000;
for (const arg of args) {
  if (arg.startsWith('--count=')) {
    const parsed = parseInt(arg.split('=')[1], 10);
    if (!isNaN(parsed) && parsed > 0) targetCount = parsed;
  }
}

async function seed() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`🌱 MediQueue Clinical Training Seeder (Target: ${targetCount} Consultations)`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Get all active doctors grouped by department
  const [doctors] = await db.query('SELECT id, department_id FROM doctors WHERE is_approved = 1');
  const deptDoctorMap = {};
  doctors.forEach(d => {
    if (!deptDoctorMap[d.department_id]) deptDoctorMap[d.department_id] = [];
    deptDoctorMap[d.department_id].push(d.id);
  });

  const [patients] = await db.query('SELECT id FROM patients LIMIT 25');
  const patientIds = (patients && patients.length > 0) ? patients.map(p => p.id) : [1];

  let totalInserted = 0;
  let outlierCount = 0;
  const now = new Date();
  const daysSpan = 30;

  // Distribute target count evenly across 30 days and 12 departments
  const perDeptDailyAvg = Math.max(1, Math.ceil(targetCount / (daysSpan * 12)));

  console.log(`⏱️  Generating across past ${daysSpan} days (~${perDeptDailyAvg * 12} consultations/day)...`);

  for (let dayOffset = daysSpan; dayOffset >= 1; dayOffset--) {
    if (totalInserted >= targetCount) break;

    const apptDateObj = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = apptDateObj.toISOString().split('T')[0];

    for (let deptId = 1; deptId <= 12; deptId++) {
      if (totalInserted >= targetCount) break;

      const docList = deptDoctorMap[deptId];
      if (!docList || docList.length === 0) continue;

      const profile = DEPT_PROFILES[deptId];
      // Random variance around target daily consults per dept
      const consultsToday = Math.max(1, perDeptDailyAvg + Math.floor((Math.random() - 0.5) * 2));

      for (let i = 0; i < consultsToday; i++) {
        if (totalInserted >= targetCount) break;

        const docId = docList[Math.floor(Math.random() * docList.length)];
        const slot = TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)];
        const pInfo = PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)];
        const patientId = patientIds[Math.floor(Math.random() * patientIds.length)];
        const reason = CLINICAL_REASONS[Math.floor(Math.random() * CLINICAL_REASONS.length)];

        // Dynamic consultation time based on Gaussian specialty profile
        let duration = randomGaussian(profile.mean, profile.std);
        duration = Math.max(5.0, duration);

        // Adjust slightly based on patient age (older patients require slightly more care)
        if (pInfo.age >= 60) duration += Math.round(Math.random() * 2.5 * 10) / 10;

        // Realistic clinical noise injection (~4-5% real-world outliers)
        const rand = Math.random();
        let isOutlier = false;
        if (rand < 0.025) {
          // Accidental quick-click test / doctor immediate finish
          duration = Math.round((2.5 + Math.random() * 1.5) * 10) / 10;
          isOutlier = true;
        } else if (rand > 0.975) {
          // Forgotten open tab or rare highly prolonged consultation
          duration = Math.round((48.0 + Math.random() * 20.0) * 10) / 10;
          isOutlier = true;
        }
        if (isOutlier) outlierCount++;

        // Timestamps
        const startHour = parseInt(slot.split(':')[0], 10);
        const checkIn = new Date(apptDateObj);
        checkIn.setHours(startHour, Math.floor(Math.random() * 30), 0, 0);

        const treatStart = new Date(checkIn.getTime() + Math.floor(8 + Math.random() * 20) * 60000);
        const treatEnd = new Date(treatStart.getTime() + Math.round(duration * 60000));

        const bookingId = `MQ-TRN-${10000 + totalInserted}`;

        // Insert completed appointment record
        const [apptResult] = await db.query(
          `INSERT INTO appointments 
           (booking_id, patient_id, doctor_id, department_id, appointment_date, time_slot,
            full_name, phone, age, gender, reason_for_visit, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?)`,
          [
            bookingId, patientId, docId, deptId, dateStr, slot,
            pInfo.name, '9876543210', pInfo.age, pInfo.gender,
            reason, checkIn
          ]
        );

        const apptId = apptResult.insertId;

        // Insert queue entry with treatment start & complete times and duration
        await db.query(
          `INSERT INTO queue 
           (appointment_id, department_id, doctor_id, queue_position, check_in_time,
            treatment_start_time, status, completed_at, consultation_mins)
           VALUES (?, ?, ?, 1, ?, ?, 'Completed', ?, ?)`,
          [
            apptId, deptId, docId, checkIn,
            treatStart, treatEnd, duration
          ]
        );

        totalInserted++;
      }
    }
  }

  console.log('───────────────────────────────────────────────────────────────');
  console.log(`✅ Successfully seeded ${totalInserted} realistic clinical consultations!`);
  console.log(`📊 Outliers injected for IQR anomaly testing: ${outlierCount} (~${((outlierCount / totalInserted) * 100).toFixed(1)}%)`);
  console.log('🚀 Ready for continuous retraining pipeline: python ml-service/retrain.py');
  console.log('═══════════════════════════════════════════════════════════════');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
