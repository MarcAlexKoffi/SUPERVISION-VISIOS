import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  // Aiven et la plupart des DB cloud nécessitent SSL.
  // On l'active par défaut si on détecte qu'on est sur un port non-standard (souvent cloud) ou si DB_SSL est présent.
  ssl: { rejectUnauthorized: false }, 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

