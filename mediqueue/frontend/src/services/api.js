import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('mq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mq_token');
      localStorage.removeItem('mq_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const registerPatient = (data) => API.post('/auth/register/patient', data);
export const registerDoctor = (data) => API.post('/auth/register/doctor', data);
export const login = (data) => API.post('/auth/login', data);
export const logout = () => API.post('/auth/logout');
export const forgotPassword = (data) => API.post('/auth/forgot-password', data);
export const resetPassword = (data) => API.post('/auth/reset-password', data);
export const getMe = () => API.get('/auth/me');

// Departments
export const getDepartments = () => API.get('/departments');
export const getDoctorsByDept = (id) => API.get(`/departments/${id}/doctors`);
export const getDoctorById = (id) => API.get(`/doctors/${id}`);
export const getDoctorSlots = (id, date) => API.get(`/doctors/${id}/slots?date=${date}`);

// Appointments
export const bookAppointment = (data) => API.post('/appointments', data);
export const getMyAppointments = () => API.get('/appointments/my');
export const getDoctorAppointments = () => API.get('/appointments/doctor');
export const cancelAppointment = (id) => API.put(`/appointments/${id}/cancel`);

// Queue
export const getQueue = (deptId) => API.get(`/queue/${deptId}`);
export const checkIn = (data) => API.post('/queue/checkin', data);
export const completeAppointment = (apptId) => API.put(`/queue/${apptId}/complete`);
export const markNoShow = (apptId) => API.put(`/queue/${apptId}/noshow`);
export const getQueuePosition = (apptId) => API.get(`/queue/position/${apptId}`);

// Admin
export const getPendingDoctors = () => API.get('/admin/doctors/pending');
export const approveDoctor = (id) => API.put(`/admin/doctors/${id}/approve`);
export const getAllDoctors = () => API.get('/admin/doctors');
export const getAnalytics = () => API.get('/admin/analytics');
export const markInProgress = (appointmentId) =>
  API.put(`/queue/${appointmentId}/start`);

export default API;