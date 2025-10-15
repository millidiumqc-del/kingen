document.addEventListener('DOMContentLoaded', () => {
    // --- Global Configuration (Update REDIRECT_URI to your actual URL) ---
    const DISCORD_CLIENT_ID = '1427682761644183735';
    // IMPORTANT: This URL must be a server-side endpoint (Netlify Function, PHP, etc.)
    const REDIRECT_URI = 'https://votre-site.com/.netlify/functions/auth_callback'; 
    const DISCORD_OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds%20guilds.join`;
    
    // Rôles pour le statut 'Perm'
    const PERM_ROLES = [
        '869611811962511451', '1426871180282822757', '869611883836104734', 
        '877989445725483009', '869612027897839666', '1421439929052954674', 
        '1426774369711165501', '1422640196020867113', '877904473983447101'
    ];
    // Rôles pour l'accès à 'Manage Keys'
    const MANAGER_ROLES = ['869611811962511451', '877989445725483009'];

    // --- Utility Functions (Simule les appels au Backend) ---
    // En réalité, ces fonctions appelleraient vos Netlify Functions ou API PHP
    async function fetchUserData() {
        // Simuler la récupération des données utilisateur et de l'état de connexion depuis le backend.
        // Si non connecté, rediriger vers index.html
        // Pour la démo, on utilise un placeholder (le backend vérifiera la session)
        const response = await fetch('/.netlify/functions/get_user_data');
        if (response.status === 401) {
             window.location.href = 'index.html'; // Non connecté ou session expirée
             return null;
        }
        return response.json(); 
        /* Exemple de retour :
        {
             discord_id: '12345', 
             username: 'KingGenUser', 
             avatar_url: '...', 
             role_status: 'Perm', 
             is_manager: true 
        } */
    }

    function disconnect() {
        // Appelle le backend pour détruire la session
        fetch('/.netlify/functions/logout', { method: 'POST' })
            .then(() => {
                window.location.href = 'index.html';
            });
    }

    // --- UI Update & Event Handlers ---

    // 1. Mise à jour de la Topbar
    async function updateUI() {
        const userData = await fetchUserData();
        if (!userData) return;

        const { username, avatar_url, role_status, is_manager } = userData;
        
        // Mettre à jour les éléments de la Topbar
        const userNameEl = document.getElementById('userName');
        const userStatusEl = document.getElementById('userStatus');
        const userAvatarEl = document.getElementById('userAvatar');
        const manageKeysBtn = document.getElementById('manageKeysBtn');

        if (userNameEl) userNameEl.textContent = username;
        if (userStatusEl) {
            userStatusEl.textContent = `(${role_status})`;
            userStatusEl.className = `status text-${role_status.toLowerCase()}`;
        }
        if (userAvatarEl) userAvatarEl.src = avatar_url || 'images/default_avatar.png'; // Utiliser l'URL Discord réelle

        // Afficher le bouton Manage Keys si l'utilisateur est un manager
        if (is_manager && manageKeysBtn) {
            manageKeysBtn.style.display = 'block';
            manageKeysBtn.onclick = () => window.location.href = 'manage_keys.html';
        }

        // 2. Gestion du Dropdown Menu
        const userMenuEl = document.getElementById('userMenu');
        const dropdownMenuEl = document.getElementById('dropdownMenu');
        const disconnectBtn = document.getElementById('disconnectBtn');

        if (userMenuEl && dropdownMenuEl) {
            userMenuEl.onclick = () => dropdownMenuEl.classList.toggle('show');
            window.onclick = (e) => {
                if (!e.target.closest('#userMenu') && dropdownMenuEl.classList.contains('show')) {
                    dropdownMenuEl.classList.remove('show');
                }
            };
        }
        if (disconnectBtn) disconnectBtn.onclick = disconnect;

        // 3. Logique spécifique à la page Get Key (si on y est)
        if (window.location.pathname.includes('get_key.html')) {
            handleGetKeyPage(userData);
        }
        
        // 4. Logique spécifique à la page Manage Keys (si on y est)
        if (window.location.pathname.includes('manage_keys.html')) {
            if (!is_manager) {
                document.querySelector('main').innerHTML = '<div class="content-card"><h2 class="text-red">Access Denied</h2><p class="text-muted">You do not have permission to access the Key Management Dashboard.</p></div>';
            } else {
                handleManageKeysPage();
            }
        }
    }

    // --- Page Specific Handlers ---

    function handleGetKeyPage(userData) {
        const freeSection = document.getElementById('freeUserSection');
        const permSection = document.getElementById('permUserSection');
        const resetBtn = document.getElementById('resetRobloxBtn');

        if (userData.role_status === 'Perm') {
            freeSection.style.display = 'none';
            permSection.style.display = 'block';
            
            // Simuler la vérification du cooldown pour le bouton Reset
            // Le backend devra vérifier si (NOW() > roblox_reset_cooldown)
            let isOnCooldown = true; // Placeholder
            
            if (isOnCooldown) {
                 resetBtn.disabled = true;
                 // Simuler l'affichage de la prochaine date de reset
                 document.getElementById('cooldownMessage').textContent = "You can reset the link on: October 21, 2025"; 
            } else {
                 resetBtn.onclick = () => {
                     // Logique de reset : demande le Roblox ID, envoie au backend, et démarre le cooldown d'une semaine.
                     if (confirm("Are you sure you want to reset your Roblox ID link? This starts a 1-week cooldown.")) {
                        alert("Reset initiated! Cooldown started."); 
                        // Appel API pour réinitialiser et mettre le cooldown
                     }
                 };
            }
        } else {
            // Logique pour les utilisateurs 'Free'
            permSection.style.display = 'none';
            freeSection.style.display = 'block';
            
            const linkvertiseBtn = document.getElementById('linkvertiseBtn');
            const getKeyBtn = document.getElementById('getKeyBtn');
            
            // Simuler l'état Linkvertise (doit être géré par le backend/session)
            let linkvertiseCompleted = false; 

            linkvertiseBtn.onclick = () => {
                 // Rediriger vers Linkvertise. Après completion, Linkvertise doit rediriger vers 
                 // une URL sur votre backend qui met à jour l'état de la session (linkvertise_completed = true)
                 window.open('YOUR_LINKVERTISE_URL_HERE', '_blank'); 
                 alert("Please complete the Linkvertise. Click 'Get Key' once done.");
                 
                 // Simuler la complétion pour l'UI
                 linkvertiseCompleted = true;
                 linkvertiseBtn.style.display = 'none';
                 getKeyBtn.style.display = 'block';
            };

            getKeyBtn.onclick = async () => {
                if (linkvertiseCompleted) {
                    // Appel API pour générer une clé 24h et l'enregistrer dans la DB
                    const keyResponse = await fetch('/.netlify/functions/generate_free_key', { method: 'POST' });
                    const keyData = await keyResponse.json();
                    
                    if (keyData.key) {
                        document.getElementById('currentKey').value = keyData.key;
                        document.getElementById('keyDisplay').style.display = 'block';
                        document.getElementById('keyStatusMessage').textContent = 'Your temporary key is ready!';
                        // Afficher le timer
                        document.getElementById('expirationTimer').textContent = `Expires at: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}`;
                    } else {
                         document.getElementById('keyStatusMessage').textContent = keyData.message || 'Error generating key.';
                    }
                } else {
                    alert('Please complete the Linkvertise step first.');
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
    
    // --- Manager Page Handler ---
    async function handleManageKeysPage() {
        // Appels API pour récupérer les listes de clés (Free et Perm)
        const freeKeysResponse = await fetch('/.netlify/functions/get_all_free_keys');
        const permKeysResponse = await fetch('/.netlify/functions/get_all_perm_keys');

        const freeKeys = await freeKeysResponse.json();
        const permKeys = await permKeysResponse.json();

        const freeTableBody = document.getElementById('freeKeysTableBody');
        const permTableBody = document.getElementById('permKeysTableBody');

        // Fonction pour rendre le tableau
        function renderKeys(keys, tableBody, isPerm) {
            tableBody.innerHTML = '';
            if (keys.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${isPerm ? 4 : 5}" style="text-align: center;">No keys found.</td></tr>`;
                return;
            }

            keys.forEach(key => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = key.key_value;
                row.insertCell().textContent = key.discord_id;
                
                // Roblox ID avec un champ de modification pour les managers
                const robloxCell = row.insertCell();
                const robloxSpan = document.createElement('span');
                robloxSpan.textContent = key.roblox_user_id || 'N/A';
                robloxCell.appendChild(robloxSpan);
                
                if (!isPerm) {
                    row.insertCell().textContent = new Date(key.expires_at).toLocaleString();
                }

                // Boutons d'action
                const actionsCell = row.insertCell();

                // Bouton EDIT (pour Roblox ID)
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit Roblox ID';
                editBtn.className = 'action-btn edit-btn';
                editBtn.onclick = async () => {
                    const newId = prompt(`Enter new Roblox ID for key ${key.key_value}:`, key.roblox_user_id || '');
                    if (newId) {
                        // Appel API pour mettre à jour le Roblox ID
                        const updateResponse = await fetch('/.netlify/functions/update_roblox_id', {
                            method: 'POST',
                            body: JSON.stringify({ key_value: key.key_value, new_id: newId, is_perm: isPerm }),
                        });
                        if (updateResponse.ok) {
                            alert('Roblox ID updated.');
                            renderKeys(isPerm ? permKeys.map(k => k.key_value === key.key_value ? {...k, roblox_user_id: newId} : k) : freeKeys, isPerm ? permTableBody : freeTableBody, isPerm);
                            robloxSpan.textContent = newId; // Mise à jour locale rapide
                        } else {
                            alert('Error updating Roblox ID.');
                        }
                    }
                };
                actionsCell.appendChild(editBtn);
                
                // Bouton DELETE
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'action-btn delete-btn';
                deleteBtn.onclick = async () => {
                    if (confirm(`Are you sure you want to delete the key ${key.key_value}?`)) {
                        // Appel API pour supprimer la clé
                        const deleteResponse = await fetch('/.netlify/functions/delete_key', {
                            method: 'POST',
                            body: JSON.stringify({ key_value: key.key_value, is_perm: isPerm }),
                        });
                        if (deleteResponse.ok) {
                            alert('Key deleted.');
                            row.remove(); // Suppression de la ligne dans l'UI
                        } else {
                            alert('Error deleting key.');
                        }
                    }
                };
                actionsCell.appendChild(deleteBtn);
            });
        }

        renderKeys(freeKeys, freeTableBody, false);
        renderKeys(permKeys, permTableBody, true);
        
        // Logique pour l'ajout de clé permanente
        document.getElementById('addPermKeyBtn').onclick = async () => {
             const key = document.getElementById('newPermKey').value;
             const robloxID = document.getElementById('initialRobloxID').value;
             if (!key) return alert('Key value is required.');
             
             const response = await fetch('/.netlify/functions/add_perm_key', {
                 method: 'POST',
                 body: JSON.stringify({ key_value: key, roblox_user_id: robloxID || null }),
             });
             
             const statusEl = document.getElementById('addStatus');
             if (response.ok) {
                 statusEl.textContent = 'Permanent key added successfully!';
                 statusEl.className = 'text-perm';
                 // Rafraîchir le tableau des clés perm
                 handleManageKeysPage();
             } else {
                 const data = await response.json();
                 statusEl.textContent = data.message || 'Error adding key.';
                 statusEl.className = 'text-free';
             }
        };
    }

    updateUI();
});
