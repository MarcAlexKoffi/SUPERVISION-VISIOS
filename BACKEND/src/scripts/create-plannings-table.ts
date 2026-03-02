import { pool } from '../config/db';

async function createPlanningsTable() {
  try {
    console.log('Creating plannings table...');
    const createQuery = `
      CREATE TABLE IF NOT EXISTS plannings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parcours VARCHAR(255) NOT NULL,
        ue_id INT,
        teacher_id INT,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        session_type VARCHAR(50) DEFAULT 'CM',
        platform VARCHAR(50),
        visio_link TEXT,
        status ENUM('À superviser', 'Supervisé', 'Annulé') DEFAULT 'À superviser',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (ue_id) REFERENCES ues(id) ON DELETE SET NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
      )
    `;

    await pool.query(createQuery);
    console.log('plannings table created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating plannings table:', error);
    process.exit(1);
  }
}

createPlanningsTable();
