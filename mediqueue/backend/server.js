require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const http         = require('http');
const { Server }   = require('socket.io');
const cookieParser = require('cookie-parser');
const routes       = require('./routes/index');
const setupSocket  = require('./socket/index');

const app    = express();
const server = http.createServer(app);

// ── CORS — supports localhost dev + any Vercel preview + explicit FRONTEND_URL ──
const corsOrigin = (origin, callback) => {
  // Allow requests with no origin (Postman, curl, mobile)
  if (!origin) return callback(null, true);
  // Allow any Vercel preview for this project
  if (origin.includes('.vercel.app')) return callback(null, true);
  // Allow localhost dev
  if (origin.startsWith('http://localhost')) return callback(null, true);
  // Allow explicit env var (e.g. custom domain)
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
    return callback(null, true);
  console.warn(`⚠️  CORS blocked origin: ${origin}`);
  callback(new Error(`CORS: origin ${origin} not allowed`));
};

const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

// Handle preflight OPTIONS before everything else
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ── Socket.io ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true }
});

// ── Middleware ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('io', io);

// ── Routes ────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'OK', env: process.env.NODE_ENV || 'development' })
);

setupSocket(io);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`\n🏥 MediQueue Backend — port ${PORT}`);
  console.log(`🌐 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Socket.io ready\n`);

  // ── DB health check on startup ───────────────────────────
  try {
    const db = require('./models/db');
    await db.query('SELECT 1');
    console.log('✅ Database connected\n');
  } catch (err) {
    console.error('❌ DATABASE CONNECTION FAILED:', err.message);
    console.error('   → Check Render env vars: DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT\n');
  }

  // ── ML nightly scheduler ──────────────────────────────────
  try {
    const { scheduleMidnightRecalculation } = require('./controllers/queueController');
    scheduleMidnightRecalculation();
    console.log('🤖 ML scheduler started (runs nightly at 23:59 IST)\n');
  } catch (e) {
    console.warn('⚠️  ML scheduler not started:', e.message);
  }
});