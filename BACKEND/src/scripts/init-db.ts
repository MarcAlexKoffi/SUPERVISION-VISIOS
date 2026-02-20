import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Charge les variables d'environnement depuis le fichier .env
dotenv.config();

async function initDB() {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('Connexion à MySQL réussie.');

    // Création de la base de données
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    console.log(`Base de données '${process.env.DB_NAME}' vérifiée/créée.`);

    // Utilisation de la base de données
    await connection.changeUser({ database: process.env.DB_NAME });

    // Exemple de création de table (vous pourrez ajouter vos propres tables ici)
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createUsersTable);
    console.log('Table "users" vérifiée/créée.');

    console.log('Initialisation de la base de données terminée avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  } finally {
    await connection.end();
  }
}

initDB();
