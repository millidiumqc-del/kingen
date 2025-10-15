const { getSessionUser, query } = require('../utils/db');

exports.handler = async (event) => {
    const user = await getSessionUser(event);
    if (!user || !user.is_manager) return { statusCode: 403, body: JSON.stringify({ message: 'Access Denied' }) };

    try {
        const keys = await query('SELECT key_value, discord_id, roblox_user_id, expires_at FROM keys_normal ORDER BY created_at DESC');
        return { statusCode: 200, body: JSON.stringify(keys) };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error fetching keys.' }) };
    }
};
