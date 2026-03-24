// EMAIL TEST SCRIPT
// Run: node testEmail.js

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('📧 Testing email configuration...');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set (' + process.env.EMAIL_PASS.length + ' chars)' : '❌ NOT SET');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test connection first
transporter.verify((error, success) => {
  if (error) {
    console.log('\n❌ CONNECTION FAILED:');
    console.log('Error:', error.message);
    console.log('\n🔧 Possible fixes:');
    console.log('1. Make sure 2-Step Verification is ON for', process.env.EMAIL_USER);
    console.log('2. Make sure App Password is correct (16 chars, no spaces)');
    console.log('3. Go to: https://myaccount.google.com/apppasswords');
    console.log('4. Generate a NEW App Password for "Mail"');
  } else {
    console.log('\n✅ Gmail connection OK! Sending test email...');

    transporter.sendMail({
      from: `"MediQueue Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // sends to itself
      subject: 'MediQueue Email Test ✅',
      html: `
        <div style="font-family:Arial;padding:20px;background:#f0fdf4;border-radius:10px;">
          <h2 style="color:#0d9488;">✅ Email is Working!</h2>
          <p>Your MediQueue email configuration is correct.</p>
          <div style="background:white;padding:16px;border-radius:8px;text-align:center;margin:16px 0;">
            <span style="font-size:2rem;font-weight:bold;color:#0d9488;letter-spacing:8px;">847291</span>
            <p style="color:#64748b;font-size:12px;">Sample OTP</p>
          </div>
          <p style="color:#64748b;font-size:12px;">This is a test email from MediQueue backend.</p>
        </div>
      `
    }, (err, info) => {
      if (err) {
        console.log('❌ Send failed:', err.message);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('📬 Check inbox of:', process.env.EMAIL_USER);
        console.log('Message ID:', info.messageId);
      }
    });
  }
});
