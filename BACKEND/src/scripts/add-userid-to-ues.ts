
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

// Charge les variables d'environnement depuis le fichier .env
dotenv.config();

async function migrate() {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'supervision_db',
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('Connexion à MySQL réussie.');

    // Check if column exists
    const [columns] = await connection.query(`SHOW COLUMNS FROM ues LIKE 'user_id'`);
    if ((columns as any).length === 0) {
        console.log('Ajout de la colonne user_id à la table ues...');
        await connection.query(`
            ALTER TABLE ues 
            ADD COLUMN user_id INT,
            ADD CONSTRAINT fk_ue_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        `);
        console.log('Colonne user_id ajoutée avec succès.');
    } else {
        console.log('La colonne user_id existe déjà.');
    }

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    await connection.end();
  }
}

migrate();
