const crypto = require('crypto');
const { getSessionUser, query } = require('../utils/db');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    const user = await getSessionUser(event);
    if (!user || user.role_status !== 'Free') {
        return { statusCode: 403, body: JSON.stringify({ message: 'Access denied: Requires Free status.' }) };
    }

    const { link_token } = JSON.parse(event.body || "{}"); // Le token que Linkvertise devrait retourner

    // 1. Validation du Linkvertise Anti-Bypass
    const expectedToken = process.env.LINKVERTISE_ANTI_BYPASS;
    
    // NOTE: Dans une intégration réelle, Linkvertise vous donnerait un jeton de l'utilisateur
    // que vous devriez valider par rapport à votre secret. Ici, on vérifie
    // si un jeton simple est présent pour simuler l'étape de validation POST.
    if (link_token !== expectedToken) {
        // Cela signifie que l'utilisateur n'a pas complété Linkvertise OU le token est incorrect.
        return { statusCode: 400, body: JSON.stringify({ message: 'Linkvertise not validated or incorrect bypass token.' }) };
    }

    // 2. Génération et expiration
    const newKey = crypto.randomBytes(8).toString('hex').toUpperCase();
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 heures

    try {
        // 3. Supprimer toutes les anciennes clés Free de cet utilisateur
        await query('DELETE FROM keys_normal WHERE discord_id = $1', [user.discord_id]);
        
        // 4. Insérer la nouvelle clé temporaire
        await query(
            'INSERT INTO keys_normal (key_value, discord_id, created_at, expires_at, linkvertise_completed) VALUES ($1, $2, $3, $4, TRUE)',
            [newKey, user.discord_id, now, expiry.toISOString()]
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                key: newKey, 
                expires_at: expiry.toISOString(),
                linkvertise_url: process.env.LINKVERTISE_URL_BASE // Renvoyer le lien pour le frontend
            })
        };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error during key generation.' }) };
    }
};
