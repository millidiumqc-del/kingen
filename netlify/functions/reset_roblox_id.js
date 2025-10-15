const { getSessionUser, query } = require('../utils/db');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    const user = await getSessionUser(event);
    if (!user || user.role_status !== 'Perm') {
        return { statusCode: 403, body: JSON.stringify({ message: 'Access denied: Requires Perm status.' }) };
    }

    try {
        // 1. Récupérer la clé permanente de l'utilisateur
        const keys = await query(
            'SELECT roblox_reset_cooldown FROM keys_permanent WHERE discord_id = $1', 
            [user.discord_id]
        );
        
        if (keys.length === 0) {
             return { statusCode: 404, body: JSON.stringify({ message: 'No permanent key found associated with your Discord account.' }) };
        }
        
        const permKey = keys[0];
        const cooldownEnd = permKey.roblox_reset_cooldown;
        const now = new Date();
        
        // 2. Vérification du Cooldown
        if (cooldownEnd && new Date(cooldownEnd) > now) {
             const cooldownDate = new Date(cooldownEnd).toLocaleString();
             return { statusCode: 400, body: JSON.stringify({ message: `Cooldown active. Next reset available on ${cooldownDate}.` }) };
        }

        // 3. Réinitialisation de l'ID Roblox et définition du nouveau cooldown (1 semaine)
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        const newCooldown = new Date(now.getTime() + oneWeekMs);
        
        await query(
            'UPDATE keys_permanent SET roblox_user_id = NULL, roblox_reset_cooldown = $1 WHERE discord_id = $2',
            [newCooldown.toISOString(), user.discord_id]
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Roblox ID link reset successfully. Cooldown started for 1 week.', new_cooldown: newCooldown.toISOString() })
        };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error during reset.' }) };
    }
};
