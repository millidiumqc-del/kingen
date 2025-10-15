// Fichier: netlify/functions/validate_key.js

const { query } = require('../utils/db');

// --- Scripts codés en dur pour la vérification du PlaceId ---
// NOTE: Vous pourriez rendre cela dynamique via une table 'place_scripts'
// pour le moment, le backend détermine quel script l'utilisateur doit recevoir.
const gameScripts = {
    // Les valeurs sont le contenu du script (ou des URLs que le Lua doit fetch, mais le contenu est plus rapide)
    "16656664443": "print('--- KingGen Script for Place 16656664443 Loaded ---')\n--[Le script SADSADSAD complet ici]",
    "110866861848433": "print('--- KingGen Script for Place 110866861848433 Loaded ---')\n--[Le script 22222222 complet ici]",
    // ... (Ajouter tous les autres PlaceIds et leurs contenus de scripts correspondants)
};

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const { key, userId, placeId } = JSON.parse(event.body || "{}");
    const robloxUserId = String(userId);
    const robloxPlaceId = String(placeId);

    if (!key || !robloxUserId || !robloxPlaceId) {
        return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'Invalid request data.' }) };
    }

    try {
        let keyData;
        let keyType;

        // 1. Recherche de la clé Permanente
        const permKeys = await query('SELECT * FROM keys_permanent WHERE key_value = $1', [key]);
        if (permKeys.length > 0) {
            keyData = permKeys[0];
            keyType = 'Perm';
        } else {
            // 2. Recherche de la clé Temporaire
            const normalKeys = await query('SELECT * FROM keys_normal WHERE key_value = $1', [key]);
            if (normalKeys.length > 0) {
                keyData = normalKeys[0];
                keyType = 'Free';
            } else {
                return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'Invalid key.' }) };
            }
        }
        
        // 3. Validation
        if (keyType === 'Free') {
            const expirationTime = new Date(keyData.expires_at);
            if (expirationTime < new Date()) {
                return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'Key has expired (24h limit). Please get a new key from the website.' }) };
            }
            // Clé Free valide
        } 
        
        else if (keyType === 'Perm') {
            if (!keyData.roblox_user_id) {
                // Première utilisation: Lier la clé à l'ID Roblox
                await query('UPDATE keys_permanent SET roblox_user_id = $1 WHERE key_value = $2', [robloxUserId, key]);
                // NOTE: L'ancien script voulait un message spécifique ici (Autoload: Contact owner for claim.)
                // Nous allons simplement retourner le script
            } else if (keyData.roblox_user_id !== robloxUserId) {
                // Clé déjà liée à un autre ID
                return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'Key is already linked to a different Roblox account.' }) };
            }
            // Clé Perm valide
        }

        // 4. Récupération du script
        const scriptCode = gameScripts[robloxPlaceId];

        if (!scriptCode) {
            return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'This game is not supported by KingGen Hub.' }) };
        }

        // 5. Succès
        return {
            statusCode: 200,
            body: JSON.stringify({
                valid: true,
                message: keyType === 'Perm' ? 'Permanent Key Accepted.' : 'Temporary Key Accepted.',
                script_content: scriptCode 
            })
        };
    } catch (error) {
        console.error('Validate Key Flow Error:', error);
        return { statusCode: 500, body: JSON.stringify({ valid: false, message: 'Internal Server Error during validation.' }) };
    }
};
