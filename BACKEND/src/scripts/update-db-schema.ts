
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateSchema() {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('Connected. Updating schema...');

    // Add department column if not exists
    try {
        await connection.query('ALTER TABLE ues ADD COLUMN department VARCHAR(100)');
        console.log('Column department added.');
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log('Column department already exists.');
        else console.error(e);
    }

    // Add modules_count column if not exists
    try {
        await connection.query('ALTER TABLE ues ADD COLUMN modules_count INT DEFAULT 0');
        console.log('Column modules_count added.');
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log('Column modules_count already exists.');
        else console.error(e);
    }

    // Add session_number column to supervision_forms
    try {
        await connection.query('ALTER TABLE supervision_forms ADD COLUMN session_number VARCHAR(50) AFTER level');
        console.log('Column session_number added to supervision_forms.');
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log('Column session_number already exists.');
        else console.error(e);
    }
    
    console.log('Schema update complete.');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await connection.end();
  }
}

updateSchema();
