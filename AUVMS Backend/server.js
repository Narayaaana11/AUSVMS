require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectDB } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');
const cronService = require('./services/cronService');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const otpRoutes = require('./routes/otpRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const systemConfigRoutes = require('./routes/systemConfigRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  // Join user to role-based rooms (admin, staff, guard) and private rooms
  socket.on('join_room', (room) => {
    socket.join(room);
    logger.info(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('leave_room', (room) => {
    socket.leave(room);
    logger.info(`Socket ${socket.id} left room ${room}`);
  });

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Export io instance for use in controllers
global.io = io;

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({ origin: true, credentials: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', limiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AUVMS Backend API',
    version: '1.0.0',
    status: 'running',
    docs: 'Use /api endpoints for API calls'
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/guard', require('./routes/guardRoutes'));
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/requests', requestRoutes);
const emailSmsRoutes = require('./routes/emailSmsRoutes');
app.use('/api/email-sms', emailSmsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    // Initialize scheduled reports cron jobs
    cronService.initScheduledReports();

    server.listen(PORT, () => {
      logger.info(`HTTP Server running on port ${PORT}`);
      logger.info(`WebSocket Server ready`);
      logger.info(`Scheduled reports initialized`);
    });
  })
  .catch((err) => {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  });

