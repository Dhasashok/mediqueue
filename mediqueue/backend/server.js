require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const routes = require('./routes/index');
const setupSocket = require('./socket/index');

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://mediqueue-pon4-awiw54s0j-mediqueue.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true }
});

// Middleware
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting on auth routes
//const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many requests. Try again later.' } });
//app.use('/api/auth', authLimiter);

// Make io accessible in routes
app.set('io', io);

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', message: 'MediQueue API is running' }));

// Setup Socket.io
setupSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🏥 MediQueue Backend running on port ${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections\n`);

  // ✅ ML self-learning: lazy require avoids circular dependency
  try {
    const { scheduleMidnightRecalculation } = require('./controllers/queueController');
    scheduleMidnightRecalculation();
    console.log('🤖 ML scheduler started (runs nightly at 23:59)\n');
  } catch (e) {
    console.warn('⚠️  ML scheduler not started:', e.message, '\n');
  }
});