const { query, createSessionCookie } = require('../utils/db');

exports.handler = async (event) => {
    // 1. Récupérer le jeton actuel (même si la session est expirée)
    const cookies = event.headers.cookie;
    const parsedCookies = cookies ? cookie.parse(cookies) : {};
    const sessionToken = parsedCookies.session;
    
    // 2. Supprimer la session dans la DB
    if (sessionToken) {
        try {
            await query('DELETE FROM sessions WHERE token = $1', [sessionToken]);
        } catch (e) {
            console.error("Logout DB error:", e);
            // Continuer quand même pour effacer le cookie
        }
    }

    // 3. Renvoyer un cookie expiré pour détruire la session côté client
    const expiredCookie = cookie.serialize('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'Lax',
        expires: new Date(0), // Fait expirer immédiatement
        path: '/'
    });

    return {
        statusCode: 200,
        headers: {
            'Set-Cookie': expiredCookie,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Logged out successfully.' })
    };
};
