// Pseudo-code.
const { connectToDatabase, getSessionUser } = require('../utils/db'); 

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { key, new_roblox_id } = JSON.parse(event.body);

    const user = await getSessionUser(event);
    if (!user || user.role_status !== 'Perm') {
        return { statusCode: 403, body: JSON.stringify({ message: 'Access denied or not a Perm user.' }) };
    }
    
    // NOTE: Pour simplifier, nous supposons que l'utilisateur Perm a une clé permanente associée.
    // En réalité, la clé devrait être passée ou récupérée.

    try {
        const connection = await connectToDatabase();
        
        // 1. Récupérer la clé permanente de l'utilisateur et vérifier le cooldown
        const [rows] = await connection.execute(
            'SELECT * FROM keys_permanent WHERE discord_id = ?', 
            [user.discord_id]
        );
        
        if (rows.length === 0) {
             await connection.end();
             return { statusCode: 404, body: JSON.stringify({ message: 'No permanent key found for this user.' }) };
        }
        
        const permKey = rows[0];
        const cooldownEnd = permKey.roblox_reset_cooldown ? new Date(permKey.roblox_reset_cooldown) : new Date(0);
        const now = new Date();
        
        if (now < cooldownEnd) {
             await connection.end();
             return { statusCode: 400, body: JSON.stringify({ message: `Cooldown active. Next reset available on ${cooldownEnd.toLocaleString()}.` }) };
        }

        // 2. Mettre à jour (reset) le Roblox ID et définir le nouveau cooldown
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const newCooldown = new Date(now.getTime() + oneWeek);
        
        await connection.execute(
            'UPDATE keys_permanent SET roblox_user_id = NULL, roblox_reset_cooldown = ? WHERE discord_id = ?',
            [newCooldown, user.discord_id]
        );
        
        await connection.end();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Roblox ID link reset successfully. Cooldown started for 1 week.' })
        };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error during reset.' }) };
    }
};
