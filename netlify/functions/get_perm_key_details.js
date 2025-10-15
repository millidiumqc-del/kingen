// Fichier: netlify/functions/get_perm_key_details.js

const { getSessionUser, query } = require('../utils/db');

exports.handler = async (event) => {
    const user = await getSessionUser(event);

    if (!user || user.role_status !== 'Perm') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Access denied.' }) };
    }

    try {
        // Récupère les détails de la clé permanente (seulement la première trouvée)
        const keys = await query(
            'SELECT roblox_user_id, roblox_reset_cooldown FROM keys_permanent WHERE discord_id = $1 LIMIT 1', 
            [user.discord_id]
        );

        if (keys.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'No permanent key found for this user.' }) };
        }

        const keyData = keys[0];

        // Retourne les détails de la clé pour la page Get Key
        return {
            statusCode: 200,
            body: JSON.stringify({
                roblox_user_id: keyData.roblox_user_id,
                roblox_reset_cooldown: keyData.roblox_reset_cooldown
            })
        };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database error fetching key details.' }) };
    }
};
