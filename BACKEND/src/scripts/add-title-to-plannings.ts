
import { pool } from '../config/db';

async function addTitleToPlannings() {
  try {
    console.log('Adding title column to plannings table...');
    const alterQuery = `
      ALTER TABLE plannings 
      ADD COLUMN title VARCHAR(255) NULL AFTER parcours;
    `;
    
    // Check if column exists first to avoid error? Or catch error.
    // Easier to catch error if duplicate column name.
    
    await pool.query(alterQuery);
    console.log('Column "title" added successfully.');
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Column "title" already exists.');
    } else {
        console.error('Error adding title column:', error);
    }
    process.exit(1);
  }
}

addTitleToPlannings();
