import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function resetDB() {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('Connexion à MySQL réussie. Suppression de la base de données...');

    // Suppression de la base de données
    await connection.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\`;`);
    console.log(`Base de données '${process.env.DB_NAME}' supprimée.`);

    // Re-création
    await connection.query(`CREATE DATABASE \`${process.env.DB_NAME}\`;`);
    console.log(`Base de données '${process.env.DB_NAME}' re-créée.`);
    
    console.log('Veuillez maintenant exécuter "npm run init-db" pour créer les tables.');

  } catch (error) {
    console.error('Erreur lors de la réinitialisation de la base de données:', error);
  } finally {
    await connection.end();
  }
}

resetDB();
