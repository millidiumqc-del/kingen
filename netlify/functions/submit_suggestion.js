const { connectToDatabase, getSessionUser } = require('../utils/db'); 

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const user = await getSessionUser(event);
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Authentication required.' }) };
    }

    const { suggestion } = JSON.parse(event.body);
    
    if (!suggestion || suggestion.trim().length < 10) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Suggestion must be at least 10 characters long.' }) };
    }

    const now = new Date();

    try {
        const connection = await connectToDatabase();
        
        await connection.execute(
            'INSERT INTO suggestions (discord_id, content, created_at) VALUES (?, ?, ?)',
            [user.discord_id, suggestion.trim(), now]
        );
        
        await connection.end();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Suggestion successfully submitted! Thank you.' })
        };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error during submission.' }) };
    }
};
