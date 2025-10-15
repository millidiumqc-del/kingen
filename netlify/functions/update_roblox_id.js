const { getSessionUser, query } = require('../utils/db');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    const user = await getSessionUser(event);
    if (!user || !user.is_manager) return { statusCode: 403, body: JSON.stringify({ message: 'Access Denied' }) };
    
    const { key_value, new_id, is_perm } = JSON.parse(event.body);

    if (!key_value) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Key value is required.' }) };
    }
    
    const robloxIdToSet = new_id.trim() === '' ? null : new_id.trim();
    const tableName = is_perm ? 'keys_permanent' : 'keys_normal';

    try {
        const result = await query(
            `UPDATE ${tableName} SET roblox_user_id = $1 WHERE key_value = $2`, 
            [robloxIdToSet, key_value]
        );
        
        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ message: `Key ${key_value} not found.` }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Roblox ID updated to ${robloxIdToSet || 'NULL'} for key ${key_value}.` })
        };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error during update.' }) };
    }
};
