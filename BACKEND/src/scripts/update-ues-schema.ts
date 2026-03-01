
import { pool } from '../config/db';

async function updateUEsTable() {
  try {
    console.log('Updating ues table...');
    // Simplified queries to avoid syntax complexity across versions
    try {
      await pool.query('ALTER TABLE ues ADD COLUMN user_id INT');
      console.log('Added user_id column.');
    } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') console.log('Column already exists or error:', e.message);
    }
    
    try {
      await pool.query('ALTER TABLE ues ADD CONSTRAINT fk_ues_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
      console.log('Added FK constraint.');
    } catch (e: any) {
        if (e.code !== 'ER_DUP_KEY' && e.code !== 'ER_FK_DUP_NAME') console.log('Constraint already exists or error:', e.message);
    }

    console.log('UEs table update attempt finished.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  }
}

updateUEsTable();
