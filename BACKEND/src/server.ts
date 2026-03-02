import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db';
import authRouter from './routes/authRoutes';
import userRouter from './routes/userRoutes';
import supervisionRouter from './routes/supervisionRoutes';
import ueRouter from './routes/ueRoutes';
import teacherRouter from './routes/teacherRoutes';
import planningRouter from './routes/planningRoutes';
import parcoursRouter from './routes/parcoursRoutes';
import classeRouter from './routes/classeRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['https://supervision-visios.vercel.app', 'https://supervision-visios-git-main-koffis-projects.vercel.app', 'http://localhost:4200'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '50mb' })); // Augmenter llimite pour les signatures base64

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter); 
app.use('/api/supervisions', supervisionRouter);
app.use('/api/ues', ueRouter);
app.use('/api/teachers', teacherRouter);
app.use('/api/plannings', planningRouter);
app.use('/api/parcours', parcoursRouter);
app.use('/api/classes', classeRouter);

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
