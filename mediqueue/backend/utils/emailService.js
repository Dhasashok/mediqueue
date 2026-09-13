const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const nodemailer = require('nodemailer');
const axios = require('axios');

// Force Nodemailer internal DNS to ONLY use IPv4 (Render cloud has no IPv6 outbound routing)
try {
  const nodemailerShared = require('nodemailer/lib/shared');
  if (nodemailerShared && nodemailerShared.networkInterfaces) {
    const ifaces = nodemailerShared.networkInterfaces;
    const filtered = {};
    for (const key in ifaces) {
      filtered[key] = (ifaces[key] || []).filter(i => i.family === 'IPv4' || i.family === 4);
    }
    nodemailerShared.networkInterfaces = filtered;
  }
} catch (e) {
  // fallback gracefully
}

const emailUser = (process.env.EMAIL_USER || '').trim();
const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

// Create transporter optimized for cloud hosting (Render/Vercel)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  connectionTimeout: 4000, // 4 seconds max
  greetingTimeout: 3000,
  socketTimeout: 5000,
  auth: {
    user: emailUser,
    pass: emailPass
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection on startup
if (emailUser && emailPass) {
  transporter.verify((err) => {
    if (err) {
      console.warn('⚠️ [EmailService] SMTP verification failed (cloud firewall may block SMTP ports 465/587):', err.message);
    } else {
      console.log('✅ [EmailService] Gmail SMTP connected & ready.');
    }
  });
}

// Safe mail dispatcher supporting HTTPS API (Resend / Brevo) + SMTP fallback
const safeSendMail = async (mailOptions) => {
  // 1. If RESEND_API_KEY is configured (HTTPS port 443 - never blocked by Render cloud firewall)
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddr = process.env.RESEND_FROM || 'MediQueue <onboarding@resend.dev>';
      const res = await axios.post('https://api.resend.com/emails', {
        from: fromAddr,
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 6000
      });
      console.log(`✅ [EmailService:Resend] Email sent to ${mailOptions.to} (ID: ${res.data?.id})`);
      return { success: true, messageId: res.data?.id };
    } catch (resendErr) {
      console.error(`❌ [EmailService:Resend] Failed:`, resendErr.response?.data || resendErr.message);
    }
  }

  // 2. If BREVO_API_KEY is configured (HTTPS port 443)
  if (process.env.BREVO_API_KEY) {
    try {
      const payload = {
        sender: { name: 'MediQueue Hospital', email: emailUser || 'noreply@mediqueue.com' },
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html
      };
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        payload.attachment = mailOptions.attachments.map(att => ({
          name: att.filename || 'qrcode.png',
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : (att.content || '')
        }));
      }
      const res = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });
      console.log(`✅ [EmailService:Brevo] Email sent to ${mailOptions.to} (ID: ${res.data?.messageId})`);
      return { success: true, messageId: res.data?.messageId };
    } catch (brevoErr) {
      console.error(`❌ [EmailService:Brevo] Failed:`, brevoErr.response?.data || brevoErr.message);
    }
  }

  // 3. Fallback to Gmail SMTP via nodemailer
  if (!emailUser || !emailPass) {
    console.warn(`⚠️ [EmailService] EMAIL_USER or EMAIL_PASS not configured. Email to "${mailOptions.to}" skipped.`);
    return { success: false, error: 'EMAIL_USER or EMAIL_PASS not configured on server.' };
  }
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EmailService:SMTP] Email sent to ${mailOptions.to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [EmailService:SMTP] Failed to send email to ${mailOptions.to}:`, err.message);
    return { success: false, error: err.message, code: err.code };
  }
};

// Hospital info
const HOSPITAL = 'City General Hospital, Pune';
const HOSPITAL_EMAIL = emailUser;

// Base HTML template — Standard Enterprise Healthcare Email Layout
const baseTemplate = (content, recipientEmail = '') => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MediQueue Healthcare</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);">
          
          <!-- Top Brand Accent Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #0d9488 0%, #06b6d4 100%);"></td>
          </tr>

          <!-- Hospital Header -->
          <tr>
            <td style="padding: 28px 36px 22px 36px; border-bottom: 1px solid #f1f5f9; text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align: middle;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 36px; height: 36px; background-color: #f0fdfa; border: 1.5px solid #ccfbf1; border-radius: 10px; text-align: center; vertical-align: middle; color: #0d9488; font-size: 22px; font-weight: bold; line-height: 36px;">
                          &#43;
                        </td>
                        <td style="padding-left: 12px; vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.2;">Medi<span style="color: #0d9488;">Queue</span></div>
                          <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; line-height: 1.3;">City General Hospital &bull; Pune</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align: middle; text-align: right;">
                    <span style="display: inline-block; background-color: #f8fafc; border: 1px solid #e2e8f0; color: #475569; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;">Patient Portal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 36px 28px 36px; text-align: left;">
              ${content}
            </td>
          </tr>

          <!-- Hospital Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #334155; letter-spacing: 0.2px;">City General Hospital, Pune</p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                MG Road, Camp, Pune – 411001 &bull; 24x7 Helpline: 020-1234-5678
              </p>
              <div style="height: 1px; background-color: #e2e8f0; margin: 14px 0;"></div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                This is an automated security transmission. Please do not reply directly.<br/>
                &copy; 2026 MediQueue Healthcare Systems. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// 1. Send OTP Email (Account Verification)
const sendOTPEmail = async (email, name, otp) => {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
      Verify Your Email Address
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
      Welcome to MediQueue. Please verify your email to activate your patient account.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
      Hello <strong>${name || 'Patient'}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      Use the 6-digit verification code below to complete your registration:
    </p>

    <!-- Clean OTP Block -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; margin: 20px 0 24px 0; text-align: center;">
      <tr>
        <td style="padding: 24px 16px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">
            One-Time Password (OTP)
          </div>
          <div style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #0d9488; font-family: 'SF Mono', Consolas, Menlo, monospace; padding-left: 12px; margin: 6px 0 14px 0;">
            ${otp}
          </div>
          <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
            &#x23F1; Valid for 10 minutes only
          </span>
        </td>
      </tr>
    </table>

    <!-- Security Advisory -->
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin: 20px 0 24px 0;">
      <p style="margin: 0; font-size: 12.5px; color: #92400e; line-height: 1.5; font-weight: 500;">
        <strong>Security Notice:</strong> MediQueue or hospital staff will never call or ask for this code. If you did not request this, please disregard this email.
      </p>
    </div>
  `;
  return await safeSendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `MediQueue Verification Code: ${otp}`,
    html: baseTemplate(content, email)
  });
};

// 1b. Send Password Reset OTP Email
const sendPasswordResetOTPEmail = async (email, name, otp) => {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
      Password Reset Request
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
      A request was received to reset the password for your MediQueue account.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      Use the 6-digit verification code below to set a new password:
    </p>

    <!-- Clean OTP Block -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; margin: 20px 0 24px 0; text-align: center;">
      <tr>
        <td style="padding: 24px 16px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">
            Password Reset Code
          </div>
          <div style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #0d9488; font-family: 'SF Mono', Consolas, Menlo, monospace; padding-left: 12px; margin: 6px 0 14px 0;">
            ${otp}
          </div>
          <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
            &#x23F1; Valid for 10 minutes only
          </span>
        </td>
      </tr>
    </table>

    <!-- Security Advisory -->
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin: 20px 0 24px 0;">
      <p style="margin: 0; font-size: 12.5px; color: #92400e; line-height: 1.5; font-weight: 500;">
        <strong>Security Notice:</strong> Hospital staff will never ask for your verification code. If you did not make this request, please change your password immediately.
      </p>
    </div>
  `;
  return await safeSendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `MediQueue Password Reset Code: ${otp}`,
    html: baseTemplate(content, email)
  });
};

// 2. Send Appointment Confirmation Email (with QR & Department Arrival Window)
const sendAppointmentConfirmation = async (email, name, appointment) => {
  const QRCode = require('qrcode');
  let qrBuffer = null;
  try {
    const qrPayload = appointment.booking_id;
    qrBuffer = await QRCode.toBuffer(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 220,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    });
  } catch(e) {
    console.error('QR generation error:', e.message);
  }

  // ── Arrival Window Calculation (Department-Specific) ───────────
  let arrivalBlock = '';
  try {
    const distMins = appointment.distributed_mins
      ? parseFloat(appointment.distributed_mins)
      : appointment.slot_capacity
        ? Math.round((120 / appointment.slot_capacity) * 100) / 100
        : 20.0;
    const patBefore = appointment.patients_before != null ? parseInt(appointment.patients_before, 10) : 0;
    const slotStartH = appointment.time_slot ? parseInt(appointment.time_slot.split(':')[0], 10) : 8;
    const slotStartM = (appointment.time_slot && appointment.time_slot.split(':')[1]) ? parseInt(appointment.time_slot.split(':')[1], 10) : 0;
    const slotStart  = slotStartH * 60 + slotStartM;
    const turnStart  = slotStart + patBefore * distMins;
    const turnEnd    = turnStart + distMins;

    const fmt = (m) => {
      const total = Math.round(m);
      const h = Math.floor(total / 60), mn = total % 60;
      const suf = h < 12 ? 'AM' : 'PM';
      const hh  = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return hh + ':' + String(mn).padStart(2, '0') + ' ' + suf;
    };

    const arriveFromStr = fmt(turnStart);
    const arriveToStr   = fmt(turnEnd);
    const positionNum   = patBefore + 1;

    arrivalBlock = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; margin-bottom: 24px; text-align: center;">
        <tr>
          <td style="padding: 20px 16px;">
            <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">🏥 Personalized Arrival Window</div>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="45%" style="text-align: center;">
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Arrive From</div>
                  <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px;">${arriveFromStr}</div>
                </td>
                <td width="10%" style="text-align: center; font-size: 20px; color: #94a3b8; font-weight: 300;">&rarr;</td>
                <td width="45%" style="text-align: center;">
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Arrive By</div>
                  <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px;">${arriveToStr}</div>
                </td>
              </tr>
            </table>
            <div style="margin-top: 14px; font-size: 12.5px; color: #334155;">
              Queue Position: <strong style="color: #0d9488;">#${positionNum}</strong> &bull; Estimated consultation: <strong>${arriveFromStr} &ndash; ${arriveToStr}</strong>
            </div>
          </td>
        </tr>
      </table>
    `;
  } catch(e) {
    console.warn('Arrival calc error:', e.message);
    arrivalBlock = '';
  }

  // Reliable HTTPS QR Code generation ensuring 100% rendering in Gmail / Outlook
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&data=${encodeURIComponent(appointment.booking_id)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
      Appointment Confirmed!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
      Your hospital OPD consultation slot has been reserved successfully.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
      Hello <strong>${name || 'Patient'}</strong>, here are your booking details:
    </p>

    <!-- Appointment Details Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 40%;">Booking ID</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${appointment.booking_id}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Doctor</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a;">Dr. ${appointment.first_name} ${appointment.last_name}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Department</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0d9488;">${appointment.dept_name}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Date</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a;">${appointment.appointment_date}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #64748b;">Time Slot Window</td>
        <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; color: #0f172a;">${appointment.time_slot}</td>
      </tr>
    </table>

    <!-- Digital QR Pass Block -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdfa; border: 1.5px solid #99f6e4; border-radius: 12px; margin-bottom: 24px; text-align: center;">
      <tr>
        <td style="padding: 24px 16px;">
          <div style="font-size: 12px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">📲 Digital Entry Pass</div>
          <p style="margin: 0 0 16px 0; font-size: 13px; color: #115e59;">Show this QR code at hospital reception or OPD kiosk to check in</p>
          <img src="${qrImageUrl}" width="200" height="200" style="display: block; margin: 0 auto; border-radius: 12px; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.15);" alt="QR Pass: ${appointment.booking_id}" />
          <p style="margin: 14px 0 0 0; font-size: 12px; color: #64748b;">Booking ID: <strong style="color: #0f172a; font-family: monospace; letter-spacing: 0.5px;">${appointment.booking_id}</strong></p>
        </td>
      </tr>
    </table>

    <!-- Department Arrival Window Block -->
    ${arrivalBlock}

    <!-- Important Notice -->
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin: 20px 0 0 0;">
      <p style="margin: 0; font-size: 12.5px; color: #92400e; line-height: 1.5; font-weight: 500;">
        ⚠️ <strong>Important:</strong> Please arrive during your designated arrival window. Present the QR entry pass at reception for instant check-in.
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `Appointment Confirmed — ${appointment.booking_id}`,
    html: baseTemplate(content, email),
  };

  if (qrBuffer) {
    mailOptions.attachments = [{
      filename: `qrcode-${appointment.booking_id}.png`,
      content: qrBuffer,
      cid: 'qrcode',
      contentType: 'image/png'
    }];
  }

  await safeSendMail(mailOptions);
};

// 3. Send Check-In Email (Queue Position)
const sendCheckInEmail = async (email, name, data) => {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
      You're in the Live Queue!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
      You have been successfully checked in at ${HOSPITAL}.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
      Hello <strong>${name || 'Patient'}</strong>, your current queue position details:
    </p>

    <!-- Queue Status Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 40%;">Queue Position</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 18px; font-weight: 800; color: #0d9488;">#${data.position}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Patients Ahead</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a;">${data.position - 1}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Department</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a;">${data.dept_name}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Doctor</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a;">Dr. ${data.doc_first} ${data.doc_last}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #64748b;">Booking ID</td>
        <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${data.booking_id}</td>
      </tr>
    </table>

    <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px 18px; text-align: center; margin-bottom: 20px;">
      <p style="color: #15803d; font-size: 13.5px; font-weight: 700; margin: 0;">📍 Please stay near the ${data.dept_name} consultation area. You will be alerted when it is your turn.</p>
    </div>
  `;
  await safeSendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `You are #${data.position} in Queue — ${data.dept_name}`,
    html: baseTemplate(content, email)
  });
};

// 4. Send Consultation Complete Email
const sendCompletionEmail = async (email, name, data) => {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
      Consultation Complete
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
      Your consultation has been successfully completed at ${HOSPITAL}.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
      Hello <strong>${name || 'Patient'}</strong>, here is a summary of your completed visit:
    </p>

    <!-- Consultation Summary Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 40%;">Doctor</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a;">Dr. ${data.doc_first} ${data.doc_last}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Department</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a;">${data.dept_name}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Date</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a;">${data.appointment_date}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #64748b;">Booking ID</td>
        <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${data.booking_id}</td>
      </tr>
    </table>

    <div style="background-color: #f0fdfa; border: 1.5px solid #99f6e4; border-radius: 10px; padding: 16px; text-align: center;">
      <p style="color: #0f766e; font-size: 14px; font-weight: 700; margin: 0 0 4px 0;">Thank you for visiting City General Hospital!</p>
      <p style="color: #115e59; font-size: 13px; margin: 0;">Your prescription and medical records are accessible anytime in your MediQueue patient portal.</p>
    </div>
  `;
  await safeSendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `Consultation Complete — ${HOSPITAL}`,
    html: baseTemplate(content, email)
  });
};

// 5. Send Cancellation Email
const sendCancellationEmail = async (email, name, appointment) => {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #991b1b; letter-spacing: -0.4px; line-height: 1.3;">
      Appointment Cancelled
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
      Your appointment reservation has been cancelled.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
      Hello <strong>${name || 'Patient'}</strong>, your cancelled appointment details:
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 40%;">Booking ID</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${appointment.booking_id}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Doctor</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a;">Dr. ${appointment.first_name} ${appointment.last_name}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">Department</td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; color: #0f172a;">${appointment.dept_name}</td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #64748b;">Date</td>
        <td style="padding: 12px 18px; font-size: 14px; font-weight: 600; color: #0f172a;">${appointment.appointment_date}</td>
      </tr>
    </table>

    <div style="background-color: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px; padding: 14px 18px; text-align: center;">
      <p style="color: #b91c1c; font-size: 13px; margin: 0;">You can reschedule or book a new appointment anytime through the MediQueue Patient Portal.</p>
    </div>
  `;
  await safeSendMail({
    from: `"MediQueue Hospital" <${HOSPITAL_EMAIL}>`,
    to: email,
    subject: `Appointment Cancelled — ${appointment.booking_id}`,
    html: baseTemplate(content, email)
  });
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetOTPEmail,
  sendAppointmentConfirmation,
  sendCheckInEmail,
  sendCompletionEmail,
  sendCancellationEmail
};