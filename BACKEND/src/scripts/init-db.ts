import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

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

    // Ajouter ou mettre à jour un admin par défaut (mot de passe en clair)
    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if ((rows as any[]).length === 0) {
        // Création (Mot de passe en clair 'admin123')
        await connection.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            ['admin', 'admin123', 'admin']
        );
        console.log('Compte admin créé (non crypté) : admin / admin123');
    } else {
        // Mise à jour pour s'assurer que le mot de passe est en clair si on vient de changer la logique et le role est admin
        await connection.query(
            'UPDATE users SET password = ?, role = ? WHERE username = ?',
            ['admin123', 'admin', 'admin']
        );
        console.log('Compte admin mis à jour (mot de passe en clair) : admin / admin123');
    }

    console.log('Initialisation de la base de données terminée avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  } finally {
    await connection.end();
  }
}

initDB();
