import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/db'; 
import authRouter from './routes/authRoutes';
import userRouter from './routes/userRoutes';
import supervisionRouter from './routes/supervisionRoutes';
import asyncSupervisionRouter from './routes/asyncSupervisionRoutes';
import ueRouter from './routes/ueRoutes';
import teacherRouter from './routes/teacherRoutes';
import planningRouter from './routes/planningRoutes';
import parcoursRouter from './routes/parcoursRoutes';
import classeRouter from './routes/classeRoutes';

dotenv.config();

const app = express();
// Allow specific origins including localhost:4200 and Vercel domains
app.use(cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter); 
app.use('/api/supervisions', supervisionRouter);
app.use('/api/async-supervisions', asyncSupervisionRouter);
app.use('/api/ues', ueRouter);
app.use('/api/teachers', teacherRouter);
app.use('/api/plannings', planningRouter);
app.use('/api/parcours', parcoursRouter);
app.use('/api/classes', classeRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Supervision Visios Backend API (Firebase)' });
});

export const api = functions.https.onRequest(app);

// Local Development Server
// Listen only if not running in Cloud Functions environment
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
