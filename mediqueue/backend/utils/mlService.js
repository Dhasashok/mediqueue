/**
 * MediQueue — ML Service Integration
 * Calls Flask ML API (port 5001) to get wait time predictions
 * 
 * Location: backend/utils/mlService.js
 */

const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Predict wait time for a patient appointment
 * @param {Object} params - appointment details
 * @returns {Object} prediction result
 */
const predictWaitTime = async (params) => {
  try {
    const {
      department_id,
      doctor_id,
      time_slot,       // e.g. "10:00-12:00"
      appointment_date,
      patient_age,
      is_emergency = 0,
      reason_complexity_score = 2,
      current_queue_length = 0,
    } = params;

    // Parse time slot to get arrival hour
    const hour = time_slot ? parseInt(time_slot.split(':')[0]) : 10;

    // Parse appointment date for day/month
    const date = appointment_date ? new Date(appointment_date) : new Date();
    const day_of_week = date.getDay(); // 0=Sun, 6=Sat
    const month       = date.getMonth() + 1;

    const payload = {
      department_id,
      arrival_hour:           hour,
      day_of_week,
      month,
      current_queue_length,
      is_emergency,
      patient_age:            patient_age || 35,
      reason_complexity_score,
      is_online_booking:      1,
      providers_on_shift:     5,
      nurses_on_shift:        8,
      staff_ratio:            0.3,
      occupancy_rate:         0.5 + (current_queue_length * 0.03), // dynamic
    };

    const response = await axios.post(`${ML_URL}/predict-wait`, payload, {
      timeout: 3000 // 3 second timeout
    });

    if (response.data.success) {
      return {
        success: true,
        predicted_wait_minutes: response.data.predicted_wait_minutes,
        load_level: response.data.load_level,
        load_color: response.data.load_color,
        source: 'ml_model'
      };
    }
    throw new Error('ML service returned failure');

  } catch (err) {
    // Re-throw so the caller (appointmentController.getPredictedWait)
    // can use its own DB-based fallback with real dept_consultation_stats data
    // instead of hardcoded BASE_TIMES values
    console.warn('⚠️  ML service unavailable, using fallback:', err.message);
    throw err;
  }
};

/**
 * Fallback prediction — uses real dept avg if provided, else dataset default
 * @param {Object} params - appointment details
 * @param {number} [avgConsultMins] - real avg from dept_consultation_stats (optional)
 */
const fallbackPredict = (params, avgConsultMins = null) => {
  // Dataset defaults — only used when no real DB data available
  const DATASET_AVG = {
    1: 18.6, 2: 18.8, 3: 18.8, 4: 19.2, 5: 18.7,
    6: 18.5, 7: 18.7, 8: 18.6, 9: 18.9, 10: 18.2, 11: 18.6, 12: 18.6
  };
  const dept_id      = params.department_id || 1;
  const queue_length = params.current_queue_length || 0;
  // Use real avg if provided, otherwise dataset default
  const consultMins  = avgConsultMins || DATASET_AVG[dept_id] || 18.6;
  // wait = patients_ahead × avg_consultation_time (matches slot display formula)
  const wait = queue_length === 0 ? 0 : Math.round(queue_length * consultMins);

  return {
    success: true,
    predicted_wait_minutes: Math.max(0, wait),
    load_level: wait === 0 ? 'None' : wait <= 15 ? 'Low' : wait <= 30 ? 'Medium' : wait <= 60 ? 'High' : 'Very High',
    load_color: wait === 0 ? '#22c55e' : wait <= 15 ? '#22c55e' : wait <= 30 ? '#f59e0b' : '#ef4444',
    source: avgConsultMins ? 'db_fallback' : 'dataset_fallback'
  };
};

/**
 * Get all department predictions (for admin dashboard)
 */
const predictAllDepartments = async (baseParams = {}) => {
  try {
    const response = await axios.post(`${ML_URL}/predict-batch`, baseParams, {
      timeout: 5000
    });
    return response.data;
  } catch (err) {
    console.warn('⚠️  ML batch predict unavailable:', err.message);
    return { success: false, error: 'ML service unavailable' };
  }
};

/**
 * Get historical wait stats per department
 */
const getDeptStats = async () => {
  try {
    const response = await axios.get(`${ML_URL}/dept-stats`, { timeout: 3000 });
    return response.data;
  } catch (err) {
    console.warn('⚠️  ML dept stats unavailable:', err.message);
    return { success: false, error: 'ML service unavailable' };
  }
};

/**
 * Check if ML service is running
 */
const isMLServiceRunning = async () => {
  try {
    const response = await axios.get(`${ML_URL}/health`, { timeout: 2000 });
    return response.data.model_loaded === true;
  } catch {
    return false;
  }
};

module.exports = {
  predictWaitTime,
  predictAllDepartments,
  getDeptStats,
  isMLServiceRunning,
  fallbackPredict
};