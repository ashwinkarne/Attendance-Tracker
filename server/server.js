require('dotenv').config();
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectDB } = require('./config/db');
const { initAttendanceCron } = require('./jobs/attendanceCron');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust first proxy if behind reverse proxy (e.g. Render, Vercel, Nginx)
app.set('trust proxy', 1);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://attendance-tracker-lik04njd1-onemanproject.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

// CORS configuration supporting credentials, cross-origin cookies, and preflight requests
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin / Vercel proxy)
      if (!origin) {
        return callback(null, true);
      }

      // Check explicit allowed origins list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow all Vercel deployment URLs (production, preview, and branch deploys)
      if (/\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow local development ports
      if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        return callback(null, true);
      }

      // Default allow for other preview origins
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Protection', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend client in production or fallback
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Semester Attendance Tracker API Server is running.');
    }
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error.'
  });
});

// Start Server function
async function startServer() {
  try {
    await connectDB();
    initAttendanceCron();

    const server = app.listen(PORT, () => {
      console.log(`Semester Attendance Tracker server listening on port ${PORT}`);
    });
    return server;
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, startServer };
