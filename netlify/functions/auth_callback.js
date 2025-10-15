const fetch = require('node-fetch');
// const mysql = require('mysql2/promise'); // Nécéssite l'installation

// Configuration (Utilisez les variables d'environnement dans Netlify)
const DISCORD_CLIENT_ID = '1427682761644183735';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET; // hlBegidtoClu4yaBz7AoW4W1YC3WyNXe
const REDIRECT_URI = 'https://votre-site.com/.netlify/functions/auth_callback';
const TARGET_GUILD_ID = 'YOUR_GUILD_ID'; // L'ID du serveur Discord d'invitation (d7DMck3NuA)

const PERM_ROLES = [ /* ... vos IDs de rôles Perm ... */ ];
const MANAGER_ROLES = [ /* ... vos IDs de rôles Manager ... */ ];

exports.handler = async (event) => {
    const { code } = event.queryStringParameters;
    if (!code) return { statusCode: 400, body: 'Missing code' };

    try {
        // 1. Échange du code pour un jeton d'accès
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
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

        // 2. Récupération des infos utilisateur et des serveurs
        const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { 'Authorization': `Bearer ${access_token}` } });
        const user = await userResponse.json();
        
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', { headers: { 'Authorization': `Bearer ${access_token}` } });
        const guilds = await guildsResponse.json();

        // 3. Vérification de l'adhésion au serveur cible (https://discord.gg/d7DMck3NuA)
        const member = guilds.find(g => g.id === TARGET_GUILD_ID);
        if (!member) {
            // Rediriger vers une page d'erreur "Join Discord"
            return {
                statusCode: 302,
                headers: { 'Location': '/error.html?msg=join_discord' }
            };
        }

        // 4. Récupération des rôles (nécessite que le bot soit dans le serveur avec le bon scope)
        // Vous aurez besoin d'un *second* appel API au bot pour récupérer la liste complète des rôles de l'utilisateur sur le serveur cible.

        // Simuler la détermination du statut et des rôles
        const userRoles = ['...']; // Rôles réels de l'utilisateur
        const roleStatus = userRoles.some(role => PERM_ROLES.includes(role)) ? 'Perm' : 'Free';
        const isManager = userRoles.some(role => MANAGER_ROLES.includes(role));

        // 5. Mise à jour de la DB et établissement de la session
        // ... (Logique de connexion à votre DB et d'insertion/update de l'utilisateur)
        
        // 6. Création d'un cookie de session (le plus important pour Netlify)
        const sessionToken = require('crypto').randomBytes(32).toString('hex');
        // ... (Associer sessionToken à user.id dans une table de session de la DB)
        
        // Redirection vers la page principale
        return {
            statusCode: 302,
            headers: { 
                'Location': '/main.html',
                'Set-Cookie': `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
            }
        };

    } catch (error) {
        console.error('OAuth Error:', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};
