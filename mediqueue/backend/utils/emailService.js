const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Hospital info
const HOSPITAL = 'City General Hospital, Pune';
const HOSPITAL_EMAIL = process.env.EMAIL_USER;

// Format date nicely: "24 Mar 2026"
const formatDate = (raw) => {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(raw).split('T')[0];
  }
};

// Base HTML template
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family: Arial, sans-serif; }
    .wrapper { max-width:600px; margin:0 auto; padding:24px 16px; }
    .card { background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#0f172a,#0d9488); padding:32px 32px 24px; text-align:center; }
    .header-logo { font-size:28px; font-weight:bold; color:white; margin-bottom:4px; }
    .header-sub { color:#5eead4; font-size:14px; }
    .body { padding:32px; }
    .title { font-size:22px; font-weight:bold; color:#0f172a; margin-bottom:8px; }
    .subtitle { font-size:14px; color:#64748b; margin-bottom:24px; }
    .info-box { background:#f8fafc; border-radius:10px; padding:20px; margin:20px 0; border:1px solid #e2e8f0; }
    .info-row { padding:8px 0; border-bottom:1px solid #e2e8f0; font-size:14px; overflow:hidden; }
    .info-row:last-child { border-bottom:none; }
    .info-label { display:block; color:#64748b; font-size:12px; margin-bottom:2px; }
    .info-value { display:block; color:#0f172a; font-weight:600; font-size:14px; }
    .otp-box { text-align:center; background:#f0fdf4; border:2px dashed #0d9488; border-radius:12px; padding:24px; margin:24px 0; }
    .otp-code { font-size:42px; font-weight:bold; color:#0d9488; letter-spacing:8px; }
    .otp-label { font-size:13px; color:#64748b; margin-top:8px; }
    .btn { display:inline-block; background:#0d9488; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:14px; margin:16px 0; }
    .badge { display:inline-block; background:#ccfbf1; color:#0f766e; padding:4px 12px; border-radius:999px; font-size:12px; font-weight:bold; }
    .footer { background:#f8fafc; padding:20px 32px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
    .divider { height:1px; background:#e2e8f0; margin:20px 0; }
    .green-box { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px; margin:16px 0; text-align:center; }
    .red-box { background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:16px; margin:16px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">🏥 MediQueue</div>
        <div class="header-sub">${HOSPITAL}</div>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>© 2024 MediQueue · ${HOSPITAL}</p>
        <p>MG Road, Pune – 411001 · 020-1234-5678</p>
        <p style="margin-top:8px;font-size:11px;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// 1. Send OTP Email
const sendOTPEmail = async (email, name, otp) => {
  const content = `
    <div class="title">Verify Your Email Address</div>
    <div class="subtitle">Welcome to MediQueue! Please verify your email to activate your account.</div>
    <p style="font-size:14px;color:#475569;">Hi <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#475569;margin-bottom:20px;">Use the OTP below to verify your email address:</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-label">⏰ Valid for 10 minutes only</div>
    </div>
    <p style="font-size:13px;color:#94a3b8;text-align:center;">Do not share this OTP with anyone.</p>
    <div class="divider"></div>
    <p style="font-size:13px;color:#64748b;">If you did not create an account, please ignore this email.</p>
  `;
  await transporter.sendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: 'Verify Your MediQueue Account — OTP Inside',
    html: baseTemplate(content)
  });
};

// 2. Send Appointment Confirmation Email (with QR via CID attachment)
const sendAppointmentConfirmation = async (email, name, appointment) => {
  const QRCode = require('qrcode');

  // Generate QR as a Buffer (PNG) — CID method works in ALL email clients including Gmail
  let qrBuffer = null;
  try {
    let qrBase64 = appointment.qr_code_data; // base64 string from DB

    if (qrBase64) {
      // Strip the data:image/png;base64, prefix to get raw base64
      const base64Data = qrBase64.replace(/^data:image\/png;base64,/, '');
      qrBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Fallback: generate fresh QR as buffer
      const qrData = JSON.stringify({
        booking_id: appointment.booking_id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        department_id: appointment.department_id,
        date: String(appointment.appointment_date).split('T')[0],
        slot: appointment.time_slot,
        ts: Date.now()
      });
      qrBuffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        width: 220,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
    }
  } catch (e) {
    console.error('QR generation error:', e.message);
  }

  // Use CID image tag — this works in Gmail, Outlook, mobile apps
  const qrImageTag = qrBuffer
    ? `<img src="cid:qrcode@mediqueue" width="200" height="200" style="border-radius:12px;border:2px solid #bbf7d0;display:block;margin:8px auto;" alt="QR Code" />`
    : `<p style="font-size:14px;color:#0f172a;text-align:center;font-weight:bold;letter-spacing:1px;">${appointment.booking_id}</p>`;

  const formattedDate = formatDate(appointment.appointment_date);

  const content = `
    <div class="title">✅ Appointment Confirmed!</div>
    <div class="subtitle">Your appointment has been successfully booked.</div>
    <p style="font-size:14px;color:#475569;">Hi <strong>${name}</strong>, your appointment details are below:</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">${appointment.booking_id}</span></div>
      <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">Dr. ${appointment.first_name} ${appointment.last_name}</span></div>
      <div class="info-row"><span class="info-label">Department</span><span class="info-value">${appointment.dept_name}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span class="info-value">${formattedDate}</span></div>
      <div class="info-row"><span class="info-label">Time Slot</span><span class="info-value">${appointment.time_slot}</span></div>
    </div>
    <div class="green-box">
      <p style="font-weight:bold;color:#15803d;margin:0 0 8px;">📲 Your QR Entry Pass</p>
      <p style="font-size:13px;color:#166534;margin:0 0 12px;">Show this QR code at the reception desk when you arrive.</p>
      ${qrImageTag}
      <p style="font-size:12px;color:#64748b;margin:10px 0 0;text-align:center;">Booking ID: <strong style="color:#0f172a;letter-spacing:1px;">${appointment.booking_id}</strong></p>
    </div>
    <div class="info-box" style="background:#fef9c3;border-color:#fde047;">
      <p style="font-size:13px;color:#a16207;margin:0;">⚠️ <strong>Important:</strong> Please arrive on time for your appointment. Your QR code is your entry pass — show it at reception.</p>
    </div>
  `;

  // Build mail options — attach QR as inline CID image
  const mailOptions = {
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `Appointment Confirmed — ${appointment.booking_id}`,
    html: baseTemplate(content),
    attachments: []
  };

  // Add QR as inline attachment only if buffer is available
  if (qrBuffer) {
    mailOptions.attachments.push({
      filename: 'qrcode.png',
      content: qrBuffer,
      cid: 'qrcode@mediqueue',  // must match cid: in img src
      contentType: 'image/png'
    });
  }

  await transporter.sendMail(mailOptions);
};

// 3. Send Check-In Email (Queue Position)
const sendCheckInEmail = async (email, name, data) => {
  const content = `
    <div class="title">🔴 You're in the Queue!</div>
    <div class="subtitle">You have been successfully checked in at ${HOSPITAL}.</div>
    <p style="font-size:14px;color:#475569;">Hi <strong>${name}</strong>, the receptionist has added you to the queue.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Department</span><span class="info-value">${data.dept_name}</span></div>
      <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">Dr. ${data.doc_first} ${data.doc_last}</span></div>
      <div class="info-row"><span class="info-label">Queue Position</span><span class="info-value">#${data.position}</span></div>
      <div class="info-row"><span class="info-label">Patients Ahead</span><span class="info-value">${data.position - 1}</span></div>
      <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">${data.booking_id}</span></div>
    </div>
    <div class="green-box">
      <p style="color:#15803d;font-weight:bold;margin:0;">📍 Please stay near the ${data.dept_name} department</p>
    </div>
  `;
  await transporter.sendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `You are #${data.position} in Queue — ${data.dept_name}`,
    html: baseTemplate(content)
  });
};

// 4. Send Consultation Complete Email
const sendCompletionEmail = async (email, name, data) => {
  const content = `
    <div class="title">✅ Consultation Complete</div>
    <div class="subtitle">Your consultation has been successfully completed.</div>
    <p style="font-size:14px;color:#475569;">Hi <strong>${name}</strong>, your consultation is complete.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">Dr. ${data.doc_first} ${data.doc_last}</span></div>
      <div class="info-row"><span class="info-label">Department</span><span class="info-value">${data.dept_name}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span class="info-value">${formatDate(data.appointment_date)}</span></div>
      <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">${data.booking_id}</span></div>
    </div>
    <div class="green-box">
      <p style="color:#15803d;font-weight:bold;margin:0 0 6px;">Thank you for visiting ${HOSPITAL}!</p>
      <p style="color:#166534;font-size:13px;margin:0;">We hope you feel better soon. Please visit again if needed.</p>
    </div>
  `;
  await transporter.sendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `Consultation Complete — ${HOSPITAL}`,
    html: baseTemplate(content)
  });
};

// 5. Send Cancellation Email
const sendCancellationEmail = async (email, name, appointment) => {
  const content = `
    <div class="title">❌ Appointment Cancelled</div>
    <div class="subtitle">Your appointment has been cancelled.</div>
    <p style="font-size:14px;color:#475569;">Hi <strong>${name}</strong>, your appointment has been cancelled.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">${appointment.booking_id}</span></div>
      <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">Dr. ${appointment.first_name} ${appointment.last_name}</span></div>
      <div class="info-row"><span class="info-label">Department</span><span class="info-value">${appointment.dept_name}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span class="info-value">${formatDate(appointment.appointment_date)}</span></div>
    </div>
    <div class="red-box">
      <p style="color:#b91c1c;font-size:13px;margin:0;">You can book a new appointment anytime at <strong>MediQueue</strong>.</p>
    </div>
  `;
  await transporter.sendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `Appointment Cancelled — ${appointment.booking_id}`,
    html: baseTemplate(content)
  });
};

module.exports = {
  sendOTPEmail,
  sendAppointmentConfirmation,
  sendCheckInEmail,
  sendCompletionEmail,
  sendCancellationEmail
};