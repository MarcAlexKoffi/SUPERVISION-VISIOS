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
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: process.env.DB_HOST === 'localhost' ? undefined : {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connexion à MySQL réussie.');

    // Création de la base de données
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    console.log(`Base de données '${process.env.DB_NAME}' vérifiée/créée.`);

    // Utilisation de la base de données
    await connection.changeUser({ database: process.env.DB_NAME });

    // 1. Table Utilisateurs
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

    // 2. Table Fiches de Supervision
    const createSupervisionTable = `
      CREATE TABLE IF NOT EXISTS supervision_forms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT, -- L'utilisateur qui a créé la fiche (superviseur)
        teacher_name VARCHAR(255) NOT NULL,
        module VARCHAR(255) NOT NULL,
        level VARCHAR(100),
        visit_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        platform VARCHAR(100),
        present_count INT DEFAULT 0,
        total_students INT DEFAULT 0,
        
        -- Aspects Techniques
        tech_internet VARCHAR(50),
        tech_audio_video VARCHAR(50),
        tech_punctuality VARCHAR(50),
        
        -- Aspects Pédagogiques
        ped_objectives VARCHAR(50),
        ped_content_mastery VARCHAR(50),
        ped_interaction VARCHAR(50),
        ped_tools_usage VARCHAR(50),
        
        observations TEXT,
        supervisor_name VARCHAR(255),
        
        -- Signatures (stockées en base64 - LONGTEXT car ça peut être gros)
        supervisor_signature LONGTEXT,
        teacher_signature LONGTEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `;
    await connection.query(createSupervisionTable);
    console.log('Table "supervision_forms" vérifiée/créée.');

    // 3. Table des Unités d'Enseignement (UEs) - pour remplacer le localStorage
    const createUEsTable = `
      CREATE TABLE IF NOT EXISTS ues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        responsible VARCHAR(255),
        department VARCHAR(100),
        students_count INT DEFAULT 0,
        modules_count INT DEFAULT 0,
        level VARCHAR(50),
        semester VARCHAR(10),
        phase VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createUEsTable);
    console.log('Table "ues" vérifiée/créée.');

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
