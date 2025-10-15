// Pseudo-code. La connexion réelle à MySQL est omise pour la concision.
const { connectToDatabase, getSessionUser } = require('../utils/db'); 
const crypto = require('crypto');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    // 1. Authentification de l'utilisateur et vérification du statut
    const user = await getSessionUser(event); // Récupère l'utilisateur à partir du cookie de session
    if (!user || user.role_status !== 'Free') {
        return { statusCode: 403, body: JSON.stringify({ message: 'Access denied or not a Free user.' }) };
    }
    
    // 2. Vérification Linkvertise (Simulé en Frontend, mais le Backend doit aussi le vérifier)
    // NOTE: L'intégration Linkvertise réelle est complexe et nécessiterait de vérifier
    // une URL de callback Linkvertise ou un état dans la session/DB. 
    // Pour cet exemple, nous supposons que le frontend a fait sa part.

    // 3. Génération et vérification de l'unicité de la clé
    const newKey = crypto.randomBytes(8).toString('hex').toUpperCase(); // Clé aléatoire de 16 caractères
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 heures plus tard

    try {
        const connection = await connectToDatabase();
        
        // Supprimer toutes les anciennes clés Free de cet utilisateur
        await connection.execute('DELETE FROM keys_normal WHERE discord_id = ?', [user.discord_id]);
        
        // Insérer la nouvelle clé temporaire
        await connection.execute(
            'INSERT INTO keys_normal (key_value, discord_id, created_at, expires_at, linkvertise_completed) VALUES (?, ?, ?, ?, TRUE)',
            [newKey, user.discord_id, now, expiry]
        );
        
        await connection.end();

        return {
            statusCode: 200,
            body: JSON.stringify({ key: newKey, expires_at: expiry.toISOString() })
        };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error during key generation.' }) };
    }
};
