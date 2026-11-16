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

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, adjust as needed
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Protection']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust first proxy if behind reverse proxy (e.g., render, heroku, nginx)
app.set('trust proxy', 1);

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
