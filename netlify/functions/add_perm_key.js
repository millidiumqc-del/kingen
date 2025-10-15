const { getSessionUser, query } = require('../utils/db');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    const user = await getSessionUser(event);
    if (!user || !user.is_manager) return { statusCode: 403, body: JSON.stringify({ message: 'Access Denied' }) };
    
    const { key_value, roblox_user_id, discord_id } = JSON.parse(event.body);

    if (!key_value) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Key value is required.' }) };
    }

    try {
        // Note: roblox_user_id et discord_id sont optionnels à l'ajout
        await query(
            'INSERT INTO keys_permanent (key_value, roblox_user_id, discord_id) VALUES ($1, $2, $3)',
            [key_value, roblox_user_id || null, discord_id || null]
        );
        return { statusCode: 200, body: JSON.stringify({ message: 'Permanent key added successfully.' }) };
    } catch (error) {
        if (error.message.includes('duplicate key')) {
             return { statusCode: 409, body: JSON.stringify({ message: 'Error: Key already exists.' }) };
        }
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error adding key.' }) };
    }
};
