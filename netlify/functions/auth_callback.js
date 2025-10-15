const fetch = require('node-fetch');
const querystring = require('querystring');
const { query, checkRoles, createSessionCookie, generateToken, PERM_ROLES, MANAGER_ROLES } = require('../utils/db');

// Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID; // 1427682761644183735
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET; // hlBegidtoClu4yaBz7AoW4W1YC3WyNXe
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; // Token du bot
const TARGET_GUILD_ID = process.env.TARGET_GUILD_ID; // L'ID réel du serveur KingGen
const REDIRECT_URI = 'https://kinggenshub.netlify.app/.netlify/functions/auth_callback';

exports.handler = async (event) => {
    const { code } = event.queryStringParameters;
    if (!code) {
        return { statusCode: 400, headers: { 'Location': '/error.html' }, body: '' };
    }

    let user;
    let roles = [];

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

        if (!access_token) {
            console.error('Failed to get access token:', tokenData);
            return { statusCode: 500, headers: { 'Location': '/error.html' }, body: '' };
        }

        // 2. Récupération des infos utilisateur
        const userResponse = await fetch('https://discord.com/api/users/@me', { 
            headers: { 'Authorization': `Bearer ${access_token}` } 
        });
        user = await userResponse.json();

        // 3. Vérification de l'adhésion au serveur et des rôles (nécessite le TOKEN BOT)
        const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${TARGET_GUILD_ID}/members/${user.id}`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });
        
        if (memberResponse.status === 404) {
            // L'utilisateur n'est pas membre du serveur
            return {
                statusCode: 302,
                headers: { 'Location': '/error.html?msg=join_discord' },
                body: ''
            };
        }
        
        const memberData = await memberResponse.json();
        roles = memberData.roles || [];

        // 4. Détermination du statut et des grades
        const roleStatus = checkRoles(roles, PERM_ROLES) ? 'Perm' : 'Free';
        const isManager = checkRoles(roles, MANAGER_ROLES);
        
        const avatarUrl = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

        // 5. Mise à jour de la DB et création de la session
        const sessionToken = generateToken();
        const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Transaction DB
        await query('BEGIN');
        
        // Insérer ou mettre à jour l'utilisateur
        await query(`
            INSERT INTO users (discord_id, username, avatar_url, role_status, is_manager) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (discord_id) DO UPDATE 
            SET username = $2, avatar_url = $3, role_status = $4, is_manager = $5;
        `, [user.id, user.username, avatarUrl, roleStatus, isManager]);

        // Supprimer les anciennes sessions pour cet utilisateur
        await query('DELETE FROM sessions WHERE discord_id = $1', [user.id]);

        // Créer la nouvelle session
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
        if (user) await query('ROLLBACK');
        console.error('Full OAuth Flow Error:', error);
        return { statusCode: 500, headers: { 'Location': '/error.html' }, body: '' };
    }
};
