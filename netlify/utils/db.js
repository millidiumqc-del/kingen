const mysql = require('mysql2/promise');

// Assurez-vous que ces variables sont définies dans les variables d'environnement de Netlify.
const dbConfig = {
    host: process.env.DB_HOST || 'sql305.hstn.me', // Votre host
    user: process.env.DB_USER || 'mseet_40169032', // Votre utilisateur
    password: process.env.DB_PASSWORD, // OmpgHWDb3iAZ
    database: process.env.DB_NAME || 'mseet_40169032_kingen', // Votre nom de DB
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Pool de connexion pour une meilleure performance
let pool;
function initPool() {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
        console.log("MySQL Pool Initialized.");
    }
    return pool;
}

async function connectToDatabase() {
    try {
        const pool = initPool();
        return pool.getConnection(); // Obtient une connexion du pool
    } catch (error) {
        console.error('Failed to get database connection:', error);
        throw new Error('Database connection failed.');
    }
}

// Fonction utilitaire pour récupérer l'utilisateur à partir du jeton de session (cookie)
async function getSessionUser(event) {
    const cookies = event.headers.cookie;
    const sessionToken = cookies ? cookies.split('; ').find(row => row.startsWith('session='))?.split('=')[1] : null;

    if (!sessionToken) return null;

    // En réalité, vous devriez vérifier le token dans une table de 'sessions'
    // Pour l'exemple, nous allons simuler la récupération de l'utilisateur à partir de son ID stocké dans une session fictive ou un cache.
    // L'implémentation réelle est cruciale pour la sécurité.

    // SIMULATION (À REMPLACER) : Retourne un objet utilisateur fictif basé sur le token
    if (sessionToken === 'valid_manager_token') {
        return { 
            discord_id: '123456789', 
            username: 'ManagerUser', 
            role_status: 'Perm', 
            is_manager: true 
        };
    }
    if (sessionToken === 'valid_perm_token') {
        return { 
            discord_id: '987654321', 
            username: 'PermUser', 
            role_status: 'Perm', 
            is_manager: false 
        };
    }
    if (sessionToken === 'valid_free_token') {
        return { 
            discord_id: '112233445', 
            username: 'FreeUser', 
            role_status: 'Free', 
            is_manager: false 
        };
    }

    return null; // Session invalide
}

module.exports = {
    connectToDatabase,
    getSessionUser
};
