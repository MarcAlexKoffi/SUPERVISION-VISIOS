import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db';
import authRouter from './routes/authRoutes';
import userRouter from './routes/userRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter); // Register user routes


// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Supervision Visios Backend API' });
});

// Database Connection Test Route
app.get('/db-test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() as now');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database connection error');
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
