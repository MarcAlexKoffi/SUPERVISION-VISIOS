import { pool } from '../config/db';

async function addDescriptionColumn() {
  try {
    const connection = await pool.getConnection();
    console.log('Connexion à la base de données réussie.');

    const query = `
      ALTER TABLE plannings
      ADD COLUMN description TEXT NULL;
    `;

    await connection.query(query);
    console.log('Colonne "description" ajoutée avec succès à la table "plannings".');
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la modification de la table :', error);
    process.exit(1);
  }
}

addDescriptionColumn();
