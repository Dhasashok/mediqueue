const express = require('express');
const router = express.Router();
const { registerPatient, registerDoctor, verifyOTP, resendOTP, login, logout, getMe } = require('../controllers/authController');
const { getDepartments, getDoctorsByDepartment, getDoctorById, getDoctorSlots } = require('../controllers/departmentController');
const { bookAppointment, getMyAppointments, getDoctorAppointments, cancelAppointment } = require('../controllers/appointmentController');
const { getQueue, getAllQueues, checkIn, completeAppointment, markNoShow, getMyQueuePosition } = require('../controllers/queueController');
const { getPendingDoctors, approveDoctor, getAllDoctors, getAnalytics, getTodayAppointments, getUpcomingAppointments, getAllAppointments, adminCancelAppointment } = require('../controllers/adminController');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Auth
router.post('/auth/register/patient', registerPatient);
router.post('/auth/register/doctor', registerDoctor);
router.post('/auth/verify-otp', verifyOTP);
router.post('/auth/resend-otp', resendOTP);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/me', authMiddleware, getMe);

// Departments & Doctors
router.get('/departments', getDepartments);
router.get('/departments/:id/doctors', getDoctorsByDepartment);
router.get('/doctors/:id', getDoctorById);
router.get('/doctors/:id/slots', getDoctorSlots);

// Appointments
router.post('/appointments', authMiddleware, roleCheck('patient'), bookAppointment);
router.get('/appointments/my', authMiddleware, roleCheck('patient'), getMyAppointments);
router.get('/appointments/doctor', authMiddleware, roleCheck('doctor'), getDoctorAppointments);
router.put('/appointments/:id/cancel', authMiddleware, roleCheck('patient'), cancelAppointment);

// Queue — specific routes BEFORE param routes
router.get('/queue/all', authMiddleware, roleCheck('admin'), getAllQueues);
router.post('/queue/checkin', authMiddleware, roleCheck('admin'), checkIn);
router.get('/queue/position/:appointmentId', authMiddleware, getMyQueuePosition);
router.put('/queue/:appointmentId/complete', authMiddleware, roleCheck('doctor'), completeAppointment);
router.put('/queue/:appointmentId/noshow', authMiddleware, roleCheck('doctor', 'admin'), markNoShow);
router.get('/queue/:departmentId', getQueue);

// Admin
router.get('/admin/doctors/pending', authMiddleware, roleCheck('admin'), getPendingDoctors);
router.put('/admin/doctors/:id/approve', authMiddleware, roleCheck('admin'), approveDoctor);
router.get('/admin/doctors', authMiddleware, roleCheck('admin'), getAllDoctors);
router.get('/admin/analytics', authMiddleware, roleCheck('admin'), getAnalytics);
router.get('/admin/today-appointments', authMiddleware, roleCheck('admin'), getTodayAppointments);
router.get('/admin/upcoming-appointments', authMiddleware, roleCheck('admin'), getUpcomingAppointments);
router.get('/admin/all-appointments', authMiddleware, roleCheck('admin'), getAllAppointments);
router.put('/admin/appointments/:id/cancel', authMiddleware, roleCheck('admin'), adminCancelAppointment);

module.exports = router;