const { connectToDatabase, getSessionUser } = require('../utils/db'); 
const util = require('util');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const user = await getSessionUser(event);
    if (!user || !user.is_manager) {
        return { statusCode: 403, body: JSON.stringify({ message: 'Access denied: Manager privileges required.' }) };
    }
    
    const { key_value, new_id, is_perm } = JSON.parse(event.body);

    if (!key_value || !new_id) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Key value and new Roblox ID are required.' }) };
    }
    
    // S'assurer que le nouvel ID est vide ou un nombre valide
    const robloxIdToSet = new_id.trim() === '' ? null : new_id.trim();

    // Déterminer la table
    const tableName = is_perm ? 'keys_permanent' : 'keys_normal';

    try {
        const connection = await connectToDatabase();
        
        // Mettre à jour la colonne roblox_user_id. Pour les clés permanentes,
        // nous devons également s'assurer que si un ID est défini, nous n'écrasons pas
        // le cooldown si l'utilisateur perm a demandé un reset standard via le frontend.
        
        // Requête SQL pour mettre à jour l'ID Roblox
        // Le ? pour roblox_user_id prendra la valeur de robloxIdToSet (NULL ou ID)
        const query = util.format('UPDATE %s SET roblox_user_id = ? WHERE key_value = ?', tableName);
        
        const [result] = await connection.execute(query, [robloxIdToSet, key_value]);
        
        await connection.end();

        if (result.affectedRows === 0) {
            return { statusCode: 404, body: JSON.stringify({ message: `Key ${key_value} not found in ${tableName}.` }) };
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
