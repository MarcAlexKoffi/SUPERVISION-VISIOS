
import { pool } from '../config/db';

async function fixRoles() {
  try {
    console.log('Adding missing roles...');
    const roles = ['assistant', 'enseignant'];
    for (const role of roles) {
      // Using INSERT IGNORE or ON DUPLICATE KEY UPDATE to existentially ensure roles
      await pool.query(`INSERT IGNORE INTO roles (name) VALUES (?)`, [role]);
      console.log(`Role '${role}' checked/added.`);
    }
    console.log('Roles update complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating roles:', error);
    process.exit(1);
  }
}

fixRoles();
