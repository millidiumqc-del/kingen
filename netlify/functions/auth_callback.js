// Fichier: netlify/functions/auth_callback.js

const { query, checkRoles, createSessionCookie, generateToken } = require('../utils/db');
const { PERM_ROLES, MANAGER_ROLES, fetch, querystring, getGuildIdFromInvite } = require('../utils/db');

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const REDIRECT_URI = 'https://kinggenshub.netlify.app/.netlify/functions/auth_callback'; 
let TARGET_GUILD_ID = process.env.TARGET_GUILD_ID; // Utilisé comme fallback si l'ENV est vide

exports.handler = async (event) => {
    const { code } = event.queryStringParameters;
    if (!code) return { statusCode: 302, headers: { 'Location': '/error.html' }, body: '' };

    // Tente de trouver l'ID du serveur si la variable d'ENV est manquante
    if (!TARGET_GUILD_ID) {
        TARGET_GUILD_ID = await getGuildIdFromInvite();
        if (!TARGET_GUILD_ID) {
            console.error("CRITICAL: TARGET_GUILD_ID is not set and could not be found.");
            return { statusCode: 500, headers: { 'Location': '/error.html' }, body: '' };
        }
    }

    await query('BEGIN'); 
    try {
        // 1. Échange du code pour le jeton d'accès
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: querystring.stringify({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                scope: 'identify guilds guilds.join'
            })
        });
        const tokenData = await tokenResponse.json();
        const { access_token } = tokenData;

        if (!access_token) throw new Error('Failed to get access token');

        // 2. Récupération des infos utilisateur (via OAuth)
        const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { 'Authorization': `Bearer ${access_token}` } });
        const user = await userResponse.json();

        // 3. Vérification de l'adhésion au serveur et des rôles (via Token BOT)
        const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${TARGET_GUILD_ID}/members/${user.id}`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });
        
        if (memberResponse.status === 404) {
            // L'utilisateur n'est pas membre du serveur -> REDIRECTION VERS L'ERREUR
            await query('ROLLBACK');
            return {
                statusCode: 302,
                headers: { 'Location': '/error.html?msg=join_discord' },
                body: ''
            };
        }
        
        const memberData = await memberResponse.json();
        const roles = memberData.roles || [];

        // 4. Détermination du statut et des grades
        const roleStatus = checkRoles(roles, PERM_ROLES) ? 'Perm' : 'Free';
        const isManager = checkRoles(roles, MANAGER_ROLES);
        
        const avatarUrl = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

        // 5. Mise à jour de la DB et création de la session
        const sessionToken = generateToken();
        const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

        await query(`
            INSERT INTO users (discord_id, username, avatar_url, role_status, is_manager) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (discord_id) DO UPDATE 
            SET username = $2, avatar_url = $3, role_status = $4, is_manager = $5;
        `, [user.id, user.username, avatarUrl, roleStatus, isManager]);

        await query('DELETE FROM sessions WHERE discord_id = $1', [user.id]);

        await query('INSERT INTO sessions (token, discord_id, expires_at) VALUES ($1, $2, $3)', 
            [sessionToken, user.id, sessionExpiry.toISOString()]
        );
        
        await query('COMMIT'); 

        // 6. Redirection avec cookie de session
        return {
            statusCode: 302,
            headers: { 
                'Location': '/main.html',
                'Set-Cookie': createSessionCookie(sessionToken)
            },
            body: ''
        };

    } catch (error) {
        await query('ROLLBACK'); 
        console.error('Full OAuth Flow Error:', error);
        return { statusCode: 302, headers: { 'Location': '/error.html' }, body: '' };
    }
};
