const express = require('express');
const router  = express.Router();

const { registerPatient, registerDoctor, verifyOTP, resendOTP, login, logout, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { getDepartments, getDoctorsByDepartment, getDoctorById, getDoctorSlots } = require('../controllers/departmentController');
const { bookAppointment, getMyAppointments, getDoctorAppointments, cancelAppointment } = require('../controllers/appointmentController');
const { getQueue, getAllQueues, checkIn, completeAppointment, markInProgress, markNoShow, getMyQueuePosition, getDeptConsultationStats } = require('../controllers/queueController');
const { getPendingDoctors, approveDoctor, getAllDoctors, getAnalytics, getTodayAppointments, getUpcomingAppointments, getAllAppointments, adminCancelAppointment, setDoctorLeave, removeDoctorLeave, getDoctorLeaves, setMyLeave, removeMyLeave, getMyLeaves } = require('../controllers/adminController');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const { savePrescription, getMyPrescriptions, getPrescriptionByAppointment, deletePrescription } = require('../controllers/prescriptionController');

const rateLimit = require('express-rate-limit');

// Rate limiters for security & brute-force prevention
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 6, // limit each IP to 6 OTP verification attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP verification attempts. Please try again after 10 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many accounts created from this IP. Please try again later.' }
});

// ── Auth ──────────────────────────────────────────────────────
router.post('/auth/register/patient',  registerLimiter, registerPatient);
router.post('/auth/register/doctor',   registerLimiter, registerDoctor);
router.post('/auth/verify-otp',        otpLimiter,      verifyOTP);
router.post('/auth/resend-otp',        otpLimiter,      resendOTP);
router.post('/auth/forgot-password',   loginLimiter,    forgotPassword);
router.post('/auth/reset-password',    loginLimiter,    resetPassword);
router.post('/auth/login',             loginLimiter,    login);
router.post('/auth/logout',            logout);
router.get ('/auth/me',                authMiddleware,  getMe);

// ── Departments & Doctors ─────────────────────────────────────
router.get('/departments',                   getDepartments);
router.get('/departments/:id/doctors',       getDoctorsByDepartment);
router.get('/doctors/:id',                   getDoctorById);
router.get('/doctors/:id/slots',             getDoctorSlots);

// ── Appointments ──────────────────────────────────────────────
router.post('/appointments',                  authMiddleware, roleCheck('patient'), bookAppointment);
router.get ('/appointments/my',               authMiddleware, roleCheck('patient'), getMyAppointments);
router.get ('/appointments/doctor',           authMiddleware, roleCheck('doctor'),  getDoctorAppointments);
router.put ('/appointments/:id/cancel',       authMiddleware, roleCheck('patient'), cancelAppointment);

// ── Queue — SPECIFIC routes BEFORE param routes ───────────────
router.get ('/queue/all',                     authMiddleware, roleCheck('admin'),  getAllQueues);
router.post('/queue/checkin',                 authMiddleware, roleCheck('admin'),  checkIn);
router.get ('/queue/position/:appointmentId', authMiddleware,                      getMyQueuePosition);
router.put ('/queue/:appointmentId/start',    authMiddleware, roleCheck('doctor'), markInProgress);
router.put ('/queue/:appointmentId/complete', authMiddleware, roleCheck('doctor'), completeAppointment);
router.put ('/queue/:appointmentId/noshow',   authMiddleware, roleCheck('doctor', 'admin'), markNoShow);
router.get ('/queue/dept-stats',              authMiddleware, roleCheck('admin'),  getDeptConsultationStats);
router.get ('/queue/:departmentId',                                                getQueue);

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/doctors/pending',          authMiddleware, roleCheck('admin'), getPendingDoctors);
router.put('/admin/doctors/:id/approve',      authMiddleware, roleCheck('admin'), approveDoctor);
router.get('/admin/doctors',                  authMiddleware, roleCheck('admin'), getAllDoctors);
router.get('/admin/analytics',                authMiddleware, roleCheck('admin'), getAnalytics);
router.get('/admin/today-appointments',       authMiddleware, roleCheck('admin'), getTodayAppointments);
router.get('/admin/upcoming-appointments',    authMiddleware, roleCheck('admin'), getUpcomingAppointments);
router.get('/admin/all-appointments',         authMiddleware, roleCheck('admin'), getAllAppointments);
router.put('/admin/appointments/:id/cancel',  authMiddleware, roleCheck('admin'), adminCancelAppointment);

// ── Prescriptions ─────────────────────────────────────────────
router.post  ('/prescriptions',                             authMiddleware, roleCheck('doctor'),  savePrescription);
router.get   ('/prescriptions/my',                          authMiddleware, roleCheck('patient'), getMyPrescriptions);
router.get   ('/prescriptions/appointment/:appointmentId',  authMiddleware,                       getPrescriptionByAppointment);
router.delete('/prescriptions/appointment/:appointmentId',  authMiddleware, roleCheck('doctor'),  deletePrescription);

// ── Doctor Leave Management (Admin sets for any doctor) ───────
router.post  ('/admin/doctor-leave',   authMiddleware, roleCheck('admin'),  setDoctorLeave);
router.delete('/admin/doctor-leave',   authMiddleware, roleCheck('admin'),  removeDoctorLeave);
router.get   ('/admin/doctor-leaves',  authMiddleware, roleCheck('admin'),  getDoctorLeaves);

// ── Doctor Self-Service Leave ─────────────────────────────────
router.post  ('/doctor/my-leave',      authMiddleware, roleCheck('doctor'), setMyLeave);
router.delete('/doctor/my-leave',      authMiddleware, roleCheck('doctor'), removeMyLeave);
router.get   ('/doctor/my-leaves',     authMiddleware, roleCheck('doctor'), getMyLeaves);

module.exports = router;