// Fichier: netlify/utils/db.js

const { Pool } = require('@neondatabase/serverless');
const cookie = require('cookie');
const crypto = require('crypto');

// Rôles Perm et Manager (utilisez vos IDs réels)
const PERM_ROLES = [
    '869611811962511451', '1426871180282822757', '869611883836104734', 
    '877989445725483009', '869612027897839666', '1421439929052954674', 
    '1426774369711165501', '1422640196020867113', '877904473983447101'
];
const MANAGER_ROLES = ['869611811962511451', '877989445725483009'];

// Le pool utilise automatiquement process.env.DATABASE_URL de Neon
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        return result.rows;
    } catch (error) {
        console.error('Database query failed:', error);
        throw new Error('DB_ERROR'); 
    }
}

/**
 * Récupère l'utilisateur à partir du cookie de session.
 */
async function getSessionUser(event) {
    const cookies = event.headers.cookie;
    if (!cookies) return null;

    const parsedCookies = cookie.parse(cookies);
    const sessionToken = parsedCookies.session;

    if (!sessionToken) return null;

    try {
        // 1. Vérification de la session
        const sessions = await query(
            'SELECT discord_id FROM sessions WHERE token = $1 AND expires_at > NOW()', 
            [sessionToken]
        );

        if (sessions.length === 0) return null;

        const discordId = sessions[0].discord_id;

        // 2. Récupération des données utilisateur
        const users = await query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
        if (users.length === 0) return null;

        const user = users[0];
        
        // Retourne toutes les infos, y compris les statuts DB (is_manager)
        return {
            ...user,
            session_token: sessionToken
        };

    } catch (error) {
        console.error("Session lookup error:", error);
        return null;
    }
}

function checkRoles(userRoles, targetRoles) {
    return userRoles.some(role => targetRoles.includes(role));
}

function createSessionCookie(token) {
    return cookie.serialize('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60, // 7 jours
        path: '/'
    });
}

module.exports = {
    query,
    getSessionUser,
    PERM_ROLES,
    MANAGER_ROLES,
    checkRoles,
    createSessionCookie,
    generateToken: () => crypto.randomBytes(32).toString('hex')
};
