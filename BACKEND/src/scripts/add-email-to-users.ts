import { pool } from '../config/db';

async function migrate() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database.');

    // 1. Add email column if not exists
    try {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN email VARCHAR(255) UNIQUE AFTER username;
      `);
      console.log('Added email column to users table.');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Email column already exists.');
      } else {
        throw e;
      }
    }

    // 2. Check if we still have 'role' column (old schema) and migrate to role_id if needed
    // Actually, init-db.ts created `role_id` and foreign key, but did userController insert using 'role'?
    // If init-db was run, the table has role_id. If controller uses 'role', it fails.
    // We don't need to change schema for role_id if init-db was run as per previous context.
    // However, if we need to migrate existing data or ensure role_id is populated...

    // For now, let's just make sure email is there.
    
    connection.release();
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
