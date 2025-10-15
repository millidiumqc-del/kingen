// Fichier: netlify/functions/submit_suggestion.js

const { getSessionUser, query } = require('../utils/db'); 

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    const user = await getSessionUser(event);
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Authentication required.' }) };
    }

    const { suggestion } = JSON.parse(event.body || "{}");
    
    if (!suggestion || suggestion.trim().length < 10) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Suggestion must be at least 10 characters long.' }) };
    }

    const now = new Date();

    try {
        await query(
            'INSERT INTO suggestions (discord_id, content, created_at) VALUES ($1, $2, $3)',
            [user.discord_id, suggestion.trim(), now.toISOString()]
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Suggestion successfully submitted! Thank you.' })
        };
    } catch (error) {
        console.error("DB Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Database error during submission.' }) };
    }
};
