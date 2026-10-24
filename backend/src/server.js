const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in backend/.env before starting the server.');
}

const { testConnection, getDriverInfo } = require('./db/dbAdapter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '5000', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Setup Socket.IO for real-time events
const io = new Server(server, {
  cors: {
    origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io instance to express app
app.set('io', io);

// Middleware
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io connection room handling
io.on('connection', (socket) => {
  // Join branch room or user room
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('join_branch_room', (branchId) => {
    socket.join(`branch_${branchId}`);
  });

  socket.on('join_admin_room', () => {
    socket.join('admin_room');
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'StockSense AI Backend',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
async function startServer() {
  const driverInfo = getDriverInfo();
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error(`CRITICAL: Database connection failed. Verify ${driverInfo.driver.toUpperCase()} service.`);
  } else {
    console.log(`Database connected successfully using driver: ${driverInfo.driver.toUpperCase()}.`);
  }

  server.listen(PORT, () => {
    console.log(`StockSense AI Backend running on http://localhost:${PORT}`);
  });
}

startServer();

module.exports = { app, server };
