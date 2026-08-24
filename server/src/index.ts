import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import organizationRoutes from './routes/organizationRoutes';
import queueRoutes from './routes/queueRoutes';
import { seedDb } from './database/seed';

// Load environment variables from the parent directory's .env if possible
dotenv.config({ path: '../.env' });
// Also try local .env fallback
dotenv.config();

const app = express();
const server = http.createServer(app);

// Use FRONTEND_URL and SERVER_URL for CORS in a real setup. Allowing all for initial dev.
export const io = new Server(server, {
  cors: {
    origin: '*', // To be configured strictly later
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/queue', queueRoutes);

// Basic route to check health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

seedDb().catch(console.error);

server.listen(PORT, () => {
  console.log(`EnQFlow Server is running on port ${PORT}`);
});
