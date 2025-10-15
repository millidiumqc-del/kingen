// ... Imports et configuration de la DB ...

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const { key, userId, placeId } = JSON.parse(event.body);

    // 1. Connexion à la DB (non montré ici pour la concision)
    const connection = await connectToDatabase(); 

    // 2. Recherche de la clé (Perm ou Free)
    let keyInfo = await connection.execute('SELECT * FROM keys_permanent WHERE key_value = ?', [key]);
    let keyType = 'Perm';
    
    if (keyInfo.length === 0) {
        keyInfo = await connection.execute('SELECT * FROM keys_normal WHERE key_value = ?', [key]);
        keyType = 'Free';
    }

    if (keyInfo.length === 0) {
        return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'Invalid Key.' }) };
    }
    
    const keyData = keyInfo[0];
    
    // 3. Validation de la clé Free (Expiration 24h)
    if (keyType === 'Free') {
        const expirationTime = new Date(keyData.expires_at);
        if (expirationTime < new Date()) {
            // Optionnel: Supprimer la clé expirée et informer l'utilisateur de générer une nouvelle clé
            return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'Key has expired. Please generate a new key.' }) };
        }
        // Clé Free est toujours valide si non expirée (pas de linking d'ID)

    } 
    
    // 4. Validation de la clé Perm (Linking d'ID Roblox)
    else if (keyType === 'Perm') {
        if (!keyData.roblox_user_id) {
            // Première utilisation: Lier la clé à l'ID Roblox
            await connection.execute('UPDATE keys_permanent SET roblox_user_id = ? WHERE key_value = ?', [userId, key]);
            // Le serveur doit générer le message "Autoload: Contact owner for claim." [cite: 41, 42]
            // On peut retourner un message personnalisé pour ce cas si le script Lua le gère.
        } else if (keyData.roblox_user_id !== userId) {
            // Clé déjà liée à un autre ID
            return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'Key is already linked to another user.' }) }; [cite: 44]
        }
    }
    
    // 5. Récupération du script et succès
    // (Implémenter une fonction pour obtenir le script en fonction du PlaceId)
    const scriptCode = await getScriptCode(placeId);

    if (!scriptCode) {
        return { statusCode: 200, body: JSON.stringify({ valid: false, message: 'This game is not supported.' }) };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            valid: true,
            status: 'Key Accepted',
            script_content: scriptCode // Retourne le contenu du script pour loadstring [cite: 47]
        })
    };
};

// Fonction fictive simulant le `gameScripts` du script Lua [cite: 4]
async function getScriptCode(placeId) {
    // Récupérer le script des URLs Github/Pastebin correspondantes au PlaceId
    // Cette logique peut être directement intégrée dans le script Lua[cite: 4], 
    // ou gérée par le serveur pour plus de sécurité. 
    // Pour simplifier, le script Lua se charge de l'obtenir[cite: 4].
    // Si vous voulez que le serveur le fasse:
    
    // Ex: si placeId est 16656664443, le serveur retourne le contenu de https://raw.githubusercontent.com/.../SADSADSAD
    // L'implémentation de `fetchScript` dans le Lua d'origine est plus simple[cite: 4], donc on peut retourner simplement 'true' pour la validation.
    
    // Solution simplifiée : Retourner le contenu du script pour éviter de refaire le fetch dans Lua (le plus rapide)
    
    // Dans le script Lua modifié, on utilise:
    local scriptCode = gameScripts[PlaceId]
    -- Vous pouvez soit le laisser dans le script Lua pour plus de simplicité, soit le gérer ici en faisant une requête HTTP depuis votre Netlify Function.
    
    // Pour le test, supposons que le serveur envoie un script de test
    return "print('KingGen Script Loaded via API for PlaceId: ' .. tostring("..placeId.."))"
}
