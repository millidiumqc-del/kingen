const { getSessionUser } = require('../utils/db');

exports.handler = async (event) => {
    const user = await getSessionUser(event);

    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    // Retourne les données nécessaires au frontend pour la Topbar
    return {
        statusCode: 200,
        body: JSON.stringify({
            discord_id: user.discord_id,
            username: user.username,
            avatar_url: user.avatar_url,
            role_status: user.role_status, // 'Free' ou 'Perm'
            is_manager: user.is_manager,
            // Optionnel : statut de clé pour la page Get Key si l'utilisateur est Perm
            roblox_link_cooldown: user.roblox_reset_cooldown || null 
        })
    };
};
