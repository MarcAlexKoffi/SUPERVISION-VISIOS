import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixDatabase() {
  const connection = await createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('Connected to database at', process.env.DB_HOST);

    // 1. Ensure Roles Exist
    const roles = ['admin', 'supervisor', 'user', 'assistant', 'enseignant'];
    console.log('--- Checking Roles ---');
    for (const role of roles) {
        const [existing] = await connection.query('SELECT * FROM roles WHERE name = ?', [role]);
        if ((existing as any[]).length === 0) {
            await connection.query('INSERT INTO roles (name) VALUES (?)', [role]);
            console.log(`Created missing role: ${role}`);
        } else {
            console.log(`Role exists: ${role} (ID: ${(existing as any[])[0].id})`);
        }
    }

    // 2. Get Admin Role ID
    const [adminRoleRows] = await connection.query("SELECT id FROM roles WHERE name = 'admin'");
    const adminRoleId = (adminRoleRows as any[])[0]?.id;

    if (!adminRoleId) {
        throw new Error('Critical: Admin role ID could not be found even after insertion logic.');
    }
    console.log(`Admin Role ID is: ${adminRoleId}`);

    // 3. Fix Admin User
    console.log('--- Fixing Admin User ---');
    const [userRows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if ((userRows as any[]).length === 0) {
        // Create if missing
        await connection.query(
            'INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)',
            ['admin', 'admin123', adminRoleId]
        );
        console.log('Created admin user.');
    } else {
        // Update if exists
        const user = (userRows as any[])[0];
        console.log(`Found admin user. Current Role ID: ${user.role_id}`);
        
        if (user.role_id !== adminRoleId) {
            await connection.query('UPDATE users SET role_id = ? WHERE id = ?', [adminRoleId, user.id]);
            console.log(`UPDATED admin user role_id to ${adminRoleId}`);
        } else {
            console.log('Admin user already has correct role_id.');
        }
    }
    
    // 4. Verify Fix
    const [check] = await connection.query(`
        SELECT u.username, r.name as role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.username = 'admin'
    `);
    console.log('--- Verification ---');
    console.log('Login query result would be:', (check as any[])[0]);

  } catch (error) {
    console.error('Fix failed:', error);
  } finally {
    await connection.end();
  }
}

fixDatabase();