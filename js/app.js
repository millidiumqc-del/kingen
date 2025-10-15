// Fichier: js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Configuration (Must match Netlify ENV and Discord App) ---
    const DISCORD_CLIENT_ID = '1427682761644183735';
    const REDIRECT_URI = 'https://kinggenshub.netlify.app/.netlify/functions/auth_callback';
    const LINKVERTISE_URL = 'https://link-hub.net/1409420/j5AokQm937Cf';
    const LINKVERTISE_BYPASS_TOKEN = '91329eb4ca547acfb1116bf5b34248cdfed5b4c805bbdd4d7d63fb86416a9e47';
    
    let hasClickedLink = false; // État côté client pour la validation Linkvertise

    // --- Utility Functions ---

    /** Fetches user data from the backend, handles authentication. */
    async function fetchUserData() {
        try {
            const response = await fetch('/.netlify/functions/get_user_data');
            if (response.status === 401) {
                if (window.location.pathname !== '/index.html') {
                    window.location.href = 'index.html';
                }
                return null;
            }
            return response.json();
        } catch (error) {
            console.error('Fetch User Data Error:', error);
            return null;
        }
    }

    /** Logs the user out. */
    function disconnect() {
        fetch('/.netlify/functions/logout', { method: 'POST' })
            .then(() => {
                window.location.href = 'index.html';
            });
    }

    /** --- UI and Event Handlers --- */

    async function updateUI() {
        const userData = await fetchUserData();
        if (!userData) return;

        const { username, avatar_url, role_status, is_manager } = userData;
        
        // General Topbar elements
        const userNameEl = document.getElementById('userName');
        const userStatusEl = document.getElementById('userStatus');
        const userAvatarEl = document.getElementById('userAvatar');
        const manageKeysBtn = document.getElementById('manageKeysBtn');
        const userMenuEl = document.getElementById('userMenu');
        const dropdownMenuEl = document.getElementById('dropdownMenu');
        const disconnectBtn = document.getElementById('disconnectBtn');

        // Update User Info
        if (userNameEl) userNameEl.textContent = username;
        if (userStatusEl) {
            userStatusEl.textContent = `(${role_status})`;
            userStatusEl.className = `status text-${role_status.toLowerCase()}`;
        }
        if (userAvatarEl) userAvatarEl.src = avatar_url || '/images/default_avatar.png';

        // Manager Button Logic (Visible en dessous de Disconnect)
        if (is_manager && manageKeysBtn) {
            manageKeysBtn.style.display = 'block';
            manageKeysBtn.onclick = () => window.location.href = 'manage_keys.html';
        }

        // Dropdown Menu Logic
        if (userMenuEl && dropdownMenuEl) {
            userMenuEl.onclick = () => dropdownMenuEl.classList.toggle('show');
            window.onclick = (e) => {
                if (!e.target.closest('#userMenu') && dropdownMenuEl.classList.contains('show')) {
                    dropdownMenuEl.classList.remove('show');
                }
            };
        }
        if (disconnectBtn) disconnectBtn.onclick = disconnect;

        // --- Page Specific Logic Dispatch ---
        if (window.location.pathname.includes('get_key.html')) {
            handleGetKeyPage(userData);
        } else if (window.location.pathname.includes('suggestion.html')) {
            handleSuggestionPage();
        } else if (window.location.pathname.includes('manage_keys.html')) {
            if (!is_manager) {
                // Rediriger si non manager
                window.location.href = '/error.html?msg=not_manager';
            } else {
                handleManageKeysPage(userData);
            }
        }
    }

    // --- KEY LOGIC HANDLERS ---

    function handleGetKeyPage(userData) {
        const freeSection = document.getElementById('freeUserSection');
        const permSection = document.getElementById('permUserSection');
        
        if (userData.role_status === 'Perm') {
            freeSection.style.display = 'none';
            permSection.style.display = 'block';
            handlePermKeyLogic(userData);
        } else {
            permSection.style.display = 'none';
            freeSection.style.display = 'block';
            handleFreeKeyLogic();
        }
    }

    /** Logic for Free users (Linkvertise and 24h key). */
    function handleFreeKeyLogic() {
        const linkvertiseLink = document.getElementById('linkvertiseLink');
        const getKeyBtn = document.getElementById('getKeyBtn');
        const statusMessage = document.getElementById('keyStatusMessage');
        const keyDisplay = document.getElementById('keyDisplay');
        const currentKeyInput = document.getElementById('currentKey');
        const expirationTimer = document.getElementById('expirationTimer');
        
        // 1. Configure Linkvertise Button
        linkvertiseLink.href = LINKVERTISE_URL;

        linkvertiseLink.onclick = () => {
            hasClickedLink = true; 
            statusMessage.textContent = 'Please complete the steps in the new tab. You can now click "Get Key" once finished.';
            statusMessage.className = 'text-warning';
        };

        // 2. Get Key Button Logic
        getKeyBtn.onclick = async () => {
            if (!hasClickedLink) {
                statusMessage.textContent = 'You must click the Linkvertise button first!';
                statusMessage.className = 'text-free';
                return;
            }
            
            statusMessage.textContent = 'Validating Linkvertise completion and generating key...';
            statusMessage.className = 'text-muted';

            // Appel API pour VALIDER ET GÉNÉRER la clé, en envoyant le TOKEN ANTI-BYPASS
            const keyResponse = await fetch('/.netlify/functions/generate_free_key', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link_token: LINKVERTISE_BYPASS_TOKEN })
            }); 
            
            const keyData = await keyResponse.json();
            
            if (keyResponse.ok && keyData.key) {
                currentKeyInput.value = keyData.key;
                keyDisplay.style.display = 'flex';
                statusMessage.textContent = 'Temporary key accepted! Valid for 24 hours.';
                statusMessage.className = 'text-success';
                expirationTimer.textContent = `Expires at: ${new Date(keyData.expires_at).toLocaleString()}`;
            } else {
                 statusMessage.textContent = keyData.message || 'Error generating key. Please ensure you completed Linkvertise.';
                 statusMessage.className = 'text-free';
            }
        };
        
        document.getElementById('copyKeyBtn').onclick = () => {
            currentKeyInput.select();
            navigator.clipboard.writeText(currentKeyInput.value);
            alert('Key copied to clipboard!');
        };
    }
    
    /** Logic for Perm users (Roblox ID reset). */
    async function handlePermKeyLogic(userData) {
        const linkedRobloxIDEl = document.getElementById('linkedRobloxID');
        const cooldownMessageEl = document.getElementById('cooldownMessage');
        const resetBtn = document.getElementById('resetRobloxBtn');
        
        // Fetch the user's Perm key details (must implement get_perm_key_details API)
        // Note: For simplicity, we use get_user_data which might already contain some details
        // In a real app, you need a dedicated API to check link and cooldown.

        // SIMULATION: Fetch the Perm key data
        const detailsResponse = await fetch('/.netlify/functions/get_perm_key_details'); 
        const details = detailsResponse.ok ? await detailsResponse.json() : {}; 

        linkedRobloxIDEl.textContent = details.roblox_user_id || 'Not Linked (Will link on first script execution)';
        
        const cooldownDate = details.roblox_reset_cooldown ? new Date(details.roblox_reset_cooldown) : null;
        const now = new Date();

        if (cooldownDate && cooldownDate > now) {
            // On Cooldown
            resetBtn.disabled = true;
            cooldownMessageEl.textContent = `Reset available on: ${cooldownDate.toLocaleString()}`;
            cooldownMessageEl.className = 'text-free';
        } else {
            // Ready to reset
            resetBtn.disabled = false;
            cooldownMessageEl.textContent = 'You can reset your linked Roblox ID now. (7-day cooldown applies)';
            cooldownMessageEl.className = 'text-perm';
            
            resetBtn.onclick = async () => {
                if (confirm("Are you sure you want to reset your Roblox ID link? This starts a 7-day cooldown.")) {
                    const resetResponse = await fetch('/.netlify/functions/reset_roblox_id', { method: 'POST' });
                    const resetData = await resetResponse.json();
                    
                    if (resetResponse.ok) {
                        alert(resetData.message);
                        handlePermKeyLogic(userData); // Refresh logic
                    } else {
                        alert('Reset failed: ' + (resetData.message || 'Server error.'));
                    }
                }
            };
        }
    }


    // --- MANAGER LOGIC HANDLERS ---

    /** Logic for the Manage Keys page. */
    async function handleManageKeysPage(userData) {
        const [freeResponse, permResponse] = await Promise.all([
            fetch('/.netlify/functions/get_all_free_keys'),
            fetch('/.netlify/functions/get_all_perm_keys')
        ]);
        
        const freeKeys = freeResponse.ok ? await freeResponse.json() : [];
        const permKeys = permResponse.ok ? await permResponse.json() : [];

        const freeTableBody = document.getElementById('freeKeysTableBody');
        const permTableBody = document.getElementById('permKeysTableBody');

        // --- Render Functions (Uses closure to manage keys) ---
        function renderKeys(keys, tableBody, isPerm) {
            tableBody.innerHTML = '';
            if (keys.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${isPerm ? 4 : 5}" style="text-align: center;">No keys found.</td></tr>`;
                return;
            }

            keys.forEach(key => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = key.key_value;
                row.insertCell().textContent = key.discord_id || 'N/A';
                row.insertCell().textContent = key.roblox_user_id || 'N/A';
                
                if (!isPerm) {
                    const expiry = new Date(key.expires_at);
                    const isExpired = expiry < new Date();
                    const expiryText = isExpired ? `EXPIRED (${expiry.toLocaleString()})` : expiry.toLocaleString();
                    const expiryCell = row.insertCell();
                    expiryCell.textContent = expiryText;
                    expiryCell.style.color = isExpired ? 'var(--discord-red)' : 'var(--text-color)';
                }

                const actionsCell = row.insertCell();

                // Edit Button (Roblox ID)
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit ID';
                editBtn.className = 'action-btn edit-btn';
                editBtn.onclick = async () => {
                    const currentId = key.roblox_user_id || '';
                    const newId = prompt(`Enter new Roblox ID for key ${key.key_value}:`, currentId);
                    if (newId !== null) {
                        const updateResponse = await fetch('/.netlify/functions/update_roblox_id', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key_value: key.key_value, new_id: newId, is_perm: isPerm }),
                        });
                        if (updateResponse.ok) {
                            alert('Roblox ID updated.');
                            row.cells[2].textContent = newId || 'N/A'; 
                        } else {
                            alert('Error updating Roblox ID.');
                        }
                    }
                };
                actionsCell.appendChild(editBtn);
                
                // Delete Button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = isPerm ? 'Delete' : 'Delete/Invalidate';
                deleteBtn.className = 'action-btn delete-btn';
                deleteBtn.onclick = async () => {
                    if (confirm(`Are you sure you want to delete the key ${key.key_value}? This action is irreversible and will invalidate the key.`)) {
                        const deleteResponse = await fetch('/.netlify/functions/delete_key', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key_value: key.key_value, is_perm: isPerm }),
                        });
                        if (deleteResponse.ok) {
                            alert('Key deleted.');
                            row.remove(); 
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
        
        // --- 3. Add Perm Key Logic ---
        document.getElementById('addPermKeyBtn').onclick = async () => {
             const key = document.getElementById('newPermKey').value;
             const robloxID = document.getElementById('initialRobloxID').value;
             const statusEl = document.getElementById('addStatus');
             
             if (!key) { statusEl.textContent = 'Key value is required.'; statusEl.className = 'text-free'; return; }
             
             const response = await fetch('/.netlify/functions/add_perm_key', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 // Note: We send the manager's Discord ID as a placeholder for now
                 body: JSON.stringify({ key_value: key, roblox_user_id: robloxID || null, discord_id: userData.discord_id }),
             });
             
             const data = await response.json();
             if (response.ok) {
                 statusEl.textContent = 'Permanent key added successfully!';
                 statusEl.className = 'text-success';
                 document.getElementById('newPermKey').value = '';
                 document.getElementById('initialRobloxID').value = '';
                 handleManageKeysPage(userData); // Refresh table
             } else {
                 statusEl.textContent = data.message || 'Error adding key.';
                 statusEl.className = 'text-free';
             }
        };
    }

    /** Logic for the Suggestion page. */
    function handleSuggestionPage() {
        const submitBtn = document.getElementById('submitSuggestionBtn');
        const textarea = document.getElementById('suggestionTextarea');
        const statusEl = document.getElementById('suggestionStatus');
        
        submitBtn.onclick = async () => {
            const suggestion = textarea.value;
            if (!suggestion || suggestion.trim().length < 10) {
                statusEl.textContent = "Suggestion is too short (min 10 characters).";
                statusEl.className = 'text-free';
                return;
            }

            statusEl.textContent = "Submitting...";
            statusEl.className = 'text-muted';

            const response = await fetch('/.netlify/functions/submit_suggestion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suggestion: suggestion }),
            });

            const data = await response.json();
            
            if (response.ok) {
                statusEl.textContent = data.message;
                statusEl.className = 'text-success';
                textarea.value = ''; // Clear textarea on success
            } else {
                statusEl.textContent = data.message || 'An unknown error occurred.';
                statusEl.className = 'text-free';
            }
        };
    }

    // Initialize the application on page load
    updateUI();
});
