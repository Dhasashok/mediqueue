require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models/db');

const demoDoctors = [
  // Cardiology (dept 2)
  {
    first_name: 'Arman',
    last_name: 'Rahman',
    email: 'arman.rahman@hospital.com',
    phone: '9876543201',
    date_of_birth: '1982-04-12',
    gender: 'Male',
    specialization: 'Cardiologist',
    department_id: 2,
    years_of_experience: 15,
    medical_license_no: 'MCI-CARD-0821',
    languages_known: 'English, Hindi, Bengali',
    consultation_fee: 500.00,
    profile_image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
  },
  {
    first_name: 'Afnan',
    last_name: 'Hossain',
    email: 'afnan.hossain@hospital.com',
    phone: '9876543202',
    date_of_birth: '1980-09-22',
    gender: 'Male',
    specialization: 'Interventional Cardiologist',
    department_id: 2,
    years_of_experience: 16,
    medical_license_no: 'MCI-CARD-0914',
    languages_known: 'English, Hindi',
    consultation_fee: 650.00,
    profile_image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
  },

  // General Medicine (dept 4)
  {
    first_name: 'Imtiaz',
    last_name: 'Karim',
    email: 'imtiaz.karim@hospital.com',
    phone: '9876543203',
    date_of_birth: '1984-06-18',
    gender: 'Male',
    specialization: 'General Physician',
    department_id: 4,
    years_of_experience: 15,
    medical_license_no: 'MCI-GEN-1045',
    languages_known: 'English, Hindi, Urdu',
    consultation_fee: 300.00,
    profile_image_url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80',
  },
  {
    first_name: 'Sunita',
    last_name: 'Sharma',
    email: 'sunita.sharma@hospital.com',
    phone: '9876543204',
    date_of_birth: '1987-11-05',
    gender: 'Female',
    specialization: 'Consultant Physician',
    department_id: 4,
    years_of_experience: 11,
    medical_license_no: 'MCI-GEN-2144',
    languages_known: 'English, Hindi, Marathi',
    consultation_fee: 350.00,
    profile_image_url: 'https://images.unsplash.com/photo-1594824813629-9e8c467a840e?w=400&auto=format&fit=crop&q=80',
  },

  // Dermatology (dept 7)
  {
    first_name: 'Farhan',
    last_name: 'Siddique',
    email: 'farhan.siddique@hospital.com',
    phone: '9876543205',
    date_of_birth: '1983-02-14',
    gender: 'Male',
    specialization: 'Dermatologist & Cosmetologist',
    department_id: 7,
    years_of_experience: 15,
    medical_license_no: 'MCI-DERM-3321',
    languages_known: 'English, Hindi',
    consultation_fee: 450.00,
    profile_image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
  },
  {
    first_name: 'Ananya',
    last_name: 'Roy',
    email: 'ananya.roy@hospital.com',
    phone: '9876543206',
    date_of_birth: '1989-08-30',
    gender: 'Female',
    specialization: 'Pediatric Dermatologist',
    department_id: 7,
    years_of_experience: 9,
    medical_license_no: 'MCI-DERM-4428',
    languages_known: 'English, Hindi, Bengali',
    consultation_fee: 400.00,
    profile_image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
  },

  // Orthopedics (dept 3)
  {
    first_name: 'Rehan',
    last_name: 'Mahmud',
    email: 'rehan.mahmud@hospital.com',
    phone: '9876543207',
    date_of_birth: '1981-12-10',
    gender: 'Male',
    specialization: 'Orthopedic Specialist',
    department_id: 3,
    years_of_experience: 15,
    medical_license_no: 'MCI-ORTHO-1189',
    languages_known: 'English, Hindi',
    consultation_fee: 600.00,
    profile_image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
  },
  {
    first_name: 'Rohit',
    last_name: 'Kulkarni',
    email: 'rohit.kulkarni@hospital.com',
    phone: '9876543208',
    date_of_birth: '1979-05-19',
    gender: 'Male',
    specialization: 'Joint Replacement Surgeon',
    department_id: 3,
    years_of_experience: 18,
    medical_license_no: 'MCI-ORTHO-5520',
    languages_known: 'English, Marathi, Hindi',
    consultation_fee: 700.00,
    profile_image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
  },

  // Neurology (dept 5)
  {
    first_name: 'Zayaan',
    last_name: 'AKM',
    email: 'zayaan.akm@hospital.com',
    phone: '9876543209',
    date_of_birth: '1985-07-25',
    gender: 'Male',
    specialization: 'Neurologist',
    department_id: 5,
    years_of_experience: 12,
    medical_license_no: 'MCI-NEURO-7712',
    languages_known: 'English, Hindi',
    consultation_fee: 550.00,
    profile_image_url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80',
  },
  {
    first_name: 'Meera',
    last_name: 'Nambiar',
    email: 'meera.nambiar@hospital.com',
    phone: '9876543210',
    date_of_birth: '1983-03-14',
    gender: 'Female',
    specialization: 'Neurosurgeon',
    department_id: 5,
    years_of_experience: 14,
    medical_license_no: 'MCI-NEURO-8823',
    languages_known: 'English, Hindi, Malayalam',
    consultation_fee: 750.00,
    profile_image_url: 'https://images.unsplash.com/photo-1594824813629-9e8c467a840e?w=400&auto=format&fit=crop&q=80',
  },

  // Pediatrics (dept 6)
  {
    first_name: 'Tahmid',
    last_name: 'Noor',
    email: 'tahmid.noor@hospital.com',
    phone: '9876543211',
    date_of_birth: '1982-10-08',
    gender: 'Male',
    specialization: 'Pediatrician',
    department_id: 6,
    years_of_experience: 14,
    medical_license_no: 'MCI-PED-9912',
    languages_known: 'English, Hindi, Bengali',
    consultation_fee: 400.00,
    profile_image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
  },

  // Dentistry (dept 1)
  {
    first_name: 'Rafiul',
    last_name: 'Islam',
    email: 'rafiul.islam@hospital.com',
    phone: '9876543212',
    date_of_birth: '1988-01-20',
    gender: 'Male',
    specialization: 'Dentist & Orthodontist',
    department_id: 1,
    years_of_experience: 10,
    medical_license_no: 'MCI-DENT-3341',
    languages_known: 'English, Hindi, Bengali',
    consultation_fee: 350.00,
    profile_image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
  },

  // ENT (dept 8)
  {
    first_name: 'Tanveer',
    last_name: 'Ahmed',
    email: 'tanveer.ahmed@hospital.com',
    phone: '9876543213',
    date_of_birth: '1984-04-18',
    gender: 'Male',
    specialization: 'ENT Specialist',
    department_id: 8,
    years_of_experience: 13,
    medical_license_no: 'MCI-ENT-6611',
    languages_known: 'English, Hindi, Urdu',
    consultation_fee: 400.00,
    profile_image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
  },

  // Ophthalmology (dept 9)
  {
    first_name: 'Shreya',
    last_name: 'Mukherjee',
    email: 'shreya.mukherjee@hospital.com',
    phone: '9876543214',
    date_of_birth: '1986-08-11',
    gender: 'Female',
    specialization: 'Ophthalmologist (Eye Specialist)',
    department_id: 9,
    years_of_experience: 11,
    medical_license_no: 'MCI-OPHTH-2299',
    languages_known: 'English, Hindi, Bengali',
    consultation_fee: 450.00,
    profile_image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
  },

  // Gynecology (dept 10)
  {
    first_name: 'Pooja',
    last_name: 'Iyer',
    email: 'pooja.iyer@hospital.com',
    phone: '9876543215',
    date_of_birth: '1981-12-03',
    gender: 'Female',
    specialization: 'Obstetrician & Gynecologist',
    department_id: 10,
    years_of_experience: 16,
    medical_license_no: 'MCI-GYN-5510',
    languages_known: 'English, Hindi, Tamil',
    consultation_fee: 550.00,
    profile_image_url: 'https://images.unsplash.com/photo-1594824813629-9e8c467a840e?w=400&auto=format&fit=crop&q=80',
  },

  // Emergency (dept 12)
  {
    first_name: 'Arjun',
    last_name: 'Reddy',
    email: 'arjun.reddy@hospital.com',
    phone: '9876543216',
    date_of_birth: '1985-05-15',
    gender: 'Male',
    specialization: 'Emergency Medicine Specialist',
    department_id: 12,
    years_of_experience: 12,
    medical_license_no: 'MCI-EMERG-4419',
    languages_known: 'English, Hindi, Telugu',
    consultation_fee: 600.00,
    profile_image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
  }
];

async function seed() {
  console.log('🌱 Starting Doctor Seeding...');
  const defaultPasswordHash = await bcrypt.hash('Doctor@123', 10);

  let inserted = 0;
  let updated = 0;

  for (const doc of demoDoctors) {
    const [existing] = await db.query('SELECT id FROM doctors WHERE email = ?', [doc.email]);
    if (existing.length > 0) {
      await db.query(
        `UPDATE doctors SET 
          first_name = ?, last_name = ?, phone = ?, date_of_birth = ?, gender = ?,
          specialization = ?, department_id = ?, years_of_experience = ?, medical_license_no = ?,
          languages_known = ?, consultation_fee = ?, profile_image_url = ?, is_approved = 1
        WHERE id = ?`,
        [
          doc.first_name, doc.last_name, doc.phone, doc.date_of_birth, doc.gender,
          doc.specialization, doc.department_id, doc.years_of_experience, doc.medical_license_no,
          doc.languages_known, doc.consultation_fee, doc.profile_image_url, existing[0].id
        ]
      );
      updated++;
    } else {
      await db.query(
        `INSERT INTO doctors (
          first_name, last_name, email, phone, date_of_birth, gender,
          specialization, department_id, years_of_experience, medical_license_no,
          languages_known, consultation_fee, password_hash, is_approved, profile_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          doc.first_name, doc.last_name, doc.email, doc.phone, doc.date_of_birth, doc.gender,
          doc.specialization, doc.department_id, doc.years_of_experience, doc.medical_license_no,
          doc.languages_known, doc.consultation_fee, defaultPasswordHash, doc.profile_image_url
        ]
      );
      inserted++;
    }
  }

  // Also make sure original doctors have profile photos if missing
  const [currentDocs] = await db.query('SELECT id, first_name, gender, profile_image_url FROM doctors');
  for (const cd of currentDocs) {
    if (!cd.profile_image_url || cd.profile_image_url === '') {
      const fallbackUrl = cd.gender === 'Female'
        ? 'https://images.unsplash.com/photo-1594824813629-9e8c467a840e?w=400&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80';
      await db.query('UPDATE doctors SET profile_image_url = ? WHERE id = ?', [fallbackUrl, cd.id]);
    }
  }

  const [totalDocs] = await db.query('SELECT COUNT(*) as count FROM doctors WHERE is_approved = 1');
  console.log(`✅ Doctor Seeding Finished: ${inserted} inserted, ${updated} updated. Total approved doctors now: ${totalDocs[0].count}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
