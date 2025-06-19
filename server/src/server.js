import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import setupSocket from './socket/index.js';
import authRoutes from './routes/auth.route.js';
import connectionRoutes from './routes/connection.route.js';
import messageRoutes from './routes/message.route.js';
import userRoutes from './routes/user.route.js';
import errorHandler from './middlewares/error.handler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.options("*", cors());

// Setup Socket.IO and get the io instance
const io = setupSocket(server);

// Middleware to parse JSON
app.use(express.json());

// Inject io into all requests (before routes)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mock JWT middleware (replace with real auth middleware)
app.use((req, res, next) => {
  // TODO: parse token and attach `req.user`
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/connection', connectionRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/user', userRoutes);

// Error handler (should be after all routes)
app.use(errorHandler);

// Health check
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Start server
const PORT = process.env.SOURCE_PORT || 8000; // Added fallback port
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});