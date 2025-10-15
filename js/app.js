// ... (Début du script app.js, incluant updateUI et fetchUserData)

    // Variables pour l'intégration Linkvertise
    const LINKVERTISE_URL = process.env.LINKVERTISE_URL_BASE || 'https://link-hub.net/1409420/j5AokQm937Cf'; // Utilisez l'ENV si possible, sinon le lien direct
    const LINKVERTISE_BYPASS_TOKEN = '91329eb4ca547acfb1116bf5b34248cdfed5b4c805bbdd4d7d63fb86416a9e47';
    let hasCompletedLinkvertise = false; // État côté client

    // ... (Reste des fonctions utilitaires)

    function handleGetKeyPage(userData) {
        const freeSection = document.getElementById('freeUserSection');
        const permSection = document.getElementById('permUserSection');
        
        if (userData.role_status === 'Perm') {
            freeSection.style.display = 'none';
            permSection.style.display = 'block';
            
            // Logique de clé permanente et reset (à implémenter dans une fonction séparée)
            handlePermKeyLogic(userData);
            
        } else {
            // Logique pour les utilisateurs 'Free'
            permSection.style.display = 'none';
            freeSection.style.display = 'block';
            
            const linkvertiseLink = document.getElementById('linkvertiseLink');
            const getKeyBtn = document.getElementById('getKeyBtn');
            const statusMessage = document.getElementById('keyStatusMessage');
            
            // 1. Configure le lien Linkvertise
            // Note: Nous ne passons pas le token dans l'URL pour la sécurité, l'utilisateur
            // doit revenir et cliquer sur Get Key.
            linkvertiseLink.href = LINKVERTISE_URL;

            linkvertiseLink.onclick = () => {
                hasCompletedLinkvertise = true; // L'utilisateur est sensé l'avoir complété après le click
                statusMessage.textContent = 'Please complete the steps in the new tab. Click "Get Key" when finished.';
                // On peut désactiver le lien et activer le bouton "Get Key" si désiré
            };


            getKeyBtn.onclick = async () => {
                if (!hasCompletedLinkvertise) {
                    statusMessage.textContent = 'You must click the Linkvertise button first!';
                    return;
                }
                
                statusMessage.textContent = 'Validating Linkvertise completion and generating key...';
                
                // 2. Appel API pour VALIDER ET GÉNÉRER la clé, en envoyant le TOKEN ANTI-BYPASS
                const keyResponse = await fetch('/.netlify/functions/generate_free_key', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    // Envoi du secret côté client pour validation (anti-bypass)
                    body: JSON.stringify({ link_token: LINKVERTISE_BYPASS_TOKEN })
                }); 
                
                const keyData = await keyResponse.json();
                
                if (keyResponse.ok && keyData.key) {
                    document.getElementById('currentKey').value = keyData.key;
                    document.getElementById('keyDisplay').style.display = 'block';
                    statusMessage.textContent = 'Temporary key accepted! Valid for 24 hours.';
                    document.getElementById('expirationTimer').textContent = `Expires at: ${new Date(keyData.expires_at).toLocaleString()}`;
                } else {
                     statusMessage.textContent = keyData.message || 'Error generating key. Please ensure you completed Linkvertise.';
                }
            };
            
            document.getElementById('copyKeyBtn').onclick = () => {
                const keyInput = document.getElementById('currentKey');
                keyInput.select();
                navigator.clipboard.writeText(keyInput.value);
                alert('Key copied to clipboard!');
            };
        }
    }
    
    // ... (fonction handlePermKeyLogic, handleManageKeysPage, etc.)
