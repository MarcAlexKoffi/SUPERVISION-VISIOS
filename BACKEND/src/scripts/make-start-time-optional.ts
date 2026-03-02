import { pool } from '../config/db';

async function makeStartTimeOptional() {
  try {
    const connection = await pool.getConnection();
    console.log('Connexion à la base de données réussie.');

    // Modify start_time to be nullable
    const query = `
      ALTER TABLE plannings
      MODIFY COLUMN start_time TIME NULL;
    `;

    await connection.query(query);
    console.log('Colonne "start_time" modifiée pour accepter NULL.');
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la modification de la table :', error);
    process.exit(1);
  }
}

makeStartTimeOptional();
