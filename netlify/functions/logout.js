// Fichier: netlify/functions/logout.js

const { query, createSessionCookie } = require('../utils/db');
const cookie = require('cookie');

exports.handler = async (event) => {
    const cookies = event.headers.cookie;
    const parsedCookies = cookies ? cookie.parse(cookies) : {};
    const sessionToken = parsedCookies.session;
    
    // 1. Supprimer la session dans la DB
    if (sessionToken) {
        try {
            await query('DELETE FROM sessions WHERE token = $1', [sessionToken]);
        } catch (e) {
            console.error("Logout DB error:", e);
        }
    }

    // 2. Renvoyer un cookie expiré pour détruire la session côté client
    const expiredCookie = cookie.serialize('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'Lax',
        expires: new Date(0), 
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
