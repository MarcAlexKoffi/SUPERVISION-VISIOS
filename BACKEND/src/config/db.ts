import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

console.log('DB Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  db: process.env.DB_NAME
});

export const pool = mysql.createPool({
  host: process.env.DB_HOST?.trim(),
  user: process.env.DB_USER?.trim(),
  password: process.env.DB_PASSWORD?.trim(),
  database: process.env.DB_NAME?.trim(),
  port: parseInt(process.env.DB_PORT || '3306'),
  // Gérer dynamiquement SSL basé sur l'environnement
  ...(process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1' ? { ssl: { rejectUnauthorized: false } } : {}),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

