import { pool } from '../config/db';

async function createFormationsTables() {
  try {
    console.log('Creating parcours table...');
    const createParcoursQuery = `
      CREATE TABLE IF NOT EXISTS parcours (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createParcoursQuery);
    console.log('parcours table created successfully.');

    console.log('Creating classes table...');
    const createClassesQuery = `
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        effectif INT NOT NULL,
        parcours_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parcours_id) REFERENCES parcours(id) ON DELETE SET NULL
      )
    `;
    await pool.query(createClassesQuery);
    console.log('classes table created successfully.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createFormationsTables();