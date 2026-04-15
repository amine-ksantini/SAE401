const socket = io();

// Écoute des sons globaux envoyés par le serveur (arène uniquement)
socket.on('play_global_sound', (type) => {
    if (type === 'victory') AudioManager.playVictory();
});

// Initialisation globale de l'UI TOP 5
let leaderboardDiv = document.getElementById('leaderboard');
if (!leaderboardDiv) {
    leaderboardDiv = document.createElement('div');
    leaderboardDiv.id = 'leaderboard';
    leaderboardDiv.style.position = 'absolute';
    leaderboardDiv.style.top = '25px';
    leaderboardDiv.style.right = '25px'; 
    leaderboardDiv.style.color = 'white';
    leaderboardDiv.style.fontFamily = "'Inter', Arial, sans-serif";
    leaderboardDiv.style.backgroundColor = 'rgba(20, 15, 40, 0.8)';
    leaderboardDiv.style.borderRadius = '10px';
    leaderboardDiv.style.padding = '15px';
    leaderboardDiv.style.minWidth = '200px';
    leaderboardDiv.style.boxShadow = '0px 4px 15px rgba(0,0,0,0.5)';
    leaderboardDiv.style.border = '2px solid #2d2550';
    document.body.appendChild(leaderboardDiv);
}

socket.on('top_players', (top5) => {
    let html = '<h3 style="margin: 0 0 10px 0; text-align: center; color: #FFD700; text-shadow: 0px 2px 4px rgba(0,0,0,0.8);">🏆 TOP 5 🏆</h3>';
    html += '<ol style="margin: 0; padding-left: 25px;">';
    top5.forEach((p) => {
        html += `<li style="margin-bottom: 8px; color: ${p.color}; font-size: 18px; text-shadow: 1px 1px 2px black;">
            <span style="color: white; font-weight: bold;">${p.pseudo}</span> 
            <span style="color: #aaa; float: right;">${p.score}</span>
        </li>`;
    });
    html += '</ol>';
    
    if (top5.length === 0) {
        html += '<p style="margin:0; text-align:center; color:#aaa; font-style:italic;">En attente de gladiateurs...</p>';
    }
    leaderboardDiv.innerHTML = html;
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 2000;
const HEX_SIZE = 45;
const BG_COLOR = '#1a1432';
const GRID_COLOR = '#2d2550';

let currentGameState = { players: {}, orbs: [], coins: [], chests: [] };
let victoryOverlay = null;

socket.emit('register_arena');
socket.on('arena_registered', () => console.log('[Arena] Enregistré.'));
socket.on('gameState_update', (state) => currentGameState = state);

// Gestion de la Fin de Partie
socket.on('game_over', (data) => {
    if (victoryOverlay) return;
    
    AudioManager.stopBgm(); // Couper la musique de fond
    
    const wName = data.winnerName ? data.winnerName.toUpperCase() : "PERSONNE";
    
    victoryOverlay = document.createElement('div');
    victoryOverlay.style.position = 'absolute';
    victoryOverlay.style.top = '0';
    victoryOverlay.style.left = '0';
    victoryOverlay.style.width = '100%';
    victoryOverlay.style.height = '100%';
    victoryOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    victoryOverlay.style.display = 'flex';
    victoryOverlay.style.flexDirection = 'column';
    victoryOverlay.style.justifyContent = 'center';
    victoryOverlay.style.alignItems = 'center';
    victoryOverlay.style.zIndex = '2000';
    
    const text = document.createElement('h1');
    text.innerText = `👑 VICTOIRE DE ${wName} 👑`;
    text.style.color = '#FFD700';
    text.style.fontFamily = "'Inter', Arial, sans-serif";
    text.style.fontSize = '64px';
    text.style.textAlign = 'center';
    text.style.textShadow = '0px 5px 15px rgba(0,0,0,1)';
    
    const countDownInfo = document.createElement('p');
    countDownInfo.innerText = "La prochaine bataille débute dans 10 secondes...";
    countDownInfo.style.color = '#fff';
    countDownInfo.style.fontFamily = "'Inter', Arial, sans-serif";
    countDownInfo.style.fontSize = '24px';
    
    victoryOverlay.appendChild(text);
    victoryOverlay.appendChild(countDownInfo);
    document.body.appendChild(victoryOverlay);
});

socket.on('game_restart', () => {
    if (victoryOverlay) {
        victoryOverlay.remove();
        victoryOverlay = null;
    }
    const lobby = document.getElementById('lobby-screen');
    if (lobby) lobby.style.display = 'flex'; // Force le retour au menu !
});

// Déplacement du Killfeed en Bas à Gauche selon la directive
socket.on('player_killed', (data) => {
    let killfeed = document.getElementById('killfeed');
    if (!killfeed) {
        killfeed = document.createElement('div');
        killfeed.id = 'killfeed';
        killfeed.style.position = 'absolute';
        // Placé en bas à gauche
        killfeed.style.bottom = '25px';
        killfeed.style.left = '25px'; 
        killfeed.style.color = 'white';
        killfeed.style.fontFamily = "'Inter', Arial, sans-serif";
        killfeed.style.pointerEvents = 'none';
        killfeed.style.zIndex = '1000';
        killfeed.style.display = 'flex';
        killfeed.style.flexDirection = 'column-reverse'; // Nouvelles lignes s'ajoutent par-dessus/empilent dans le bon sens géométrique
        document.body.appendChild(killfeed);
    }
    const notif = document.createElement('div');
    notif.innerText = data.message;
    notif.style.backgroundColor = 'rgba(25, 20, 45, 0.8)'; // Couleur sombre plus élégante pour log
    notif.style.backdropFilter = 'blur(5px)';
    notif.style.padding = '12px 20px';
    notif.style.marginTop = '8px'; // Margin top pr que le reverse marche proprement
    notif.style.borderRadius = '8px';
    notif.style.fontWeight = 'bold';
    notif.style.boxShadow = '0px 4px 15px rgba(0,0,0,0.4)';
    notif.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    
    // Entrée par la gauche
    notif.style.transform = 'translateX(-20px)';
    notif.style.opacity = '0';
    
    // On met au début pour flex column-reverse!
    killfeed.appendChild(notif);
    
    requestAnimationFrame(() => { 
        notif.style.transform = 'translateX(0)';
        notif.style.opacity = '1';
    });
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(-20px)';
        setTimeout(() => notif.remove(), 400); 
    }, 4000);
});

// Offscreen Canvas for static Deep Space Background (Performance + Aesthetics)
const bgCanvas = document.createElement('canvas');
bgCanvas.width = CANVAS_WIDTH;
bgCanvas.height = CANVAS_HEIGHT;
const bgCtx = bgCanvas.getContext('2d', { alpha: false });

function preRenderBackground() {
    bgCtx.fillStyle = '#050212';
    bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Profondeur : Nébuleuses (Bokeh)
    for (let i = 0; i < 6; i++) {
        const cx = Math.random() * CANVAS_WIDTH;
        const cy = Math.random() * CANVAS_HEIGHT;
        const r = 400 + Math.random() * 600;
        const grad = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const colors = [
            'rgba(120, 0, 255, 0.08)',
            'rgba(0, 150, 255, 0.06)',
            'rgba(255, 0, 100, 0.05)'
        ];
        grad.addColorStop(0, colors[Math.floor(Math.random() * colors.length)]);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Grille Cyber-Moderne pointillée
    const step = 60;
    bgCtx.fillStyle = 'rgba(100, 150, 255, 0.15)';
    for (let x = 0; x < CANVAS_WIDTH; x+= step) {
        for (let y = 0; y < CANVAS_HEIGHT; y+= step) {
            bgCtx.beginPath();
            bgCtx.arc(x, y, 2, 0, Math.PI*2);
            bgCtx.fill();
        }
    }
    
    // Vignette / Shadow sur les bordures du monde
    const vignette = bgCtx.createRadialGradient(
        CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT*0.3,
        CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH*0.6
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.85)');
    bgCtx.fillStyle = vignette;
    bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Bordure lumineuse externe
    bgCtx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
    bgCtx.lineWidth = 10;
    bgCtx.strokeRect(5, 5, CANVAS_WIDTH-10, CANVAS_HEIGHT-10);
    // Glow interne
    bgCtx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
    bgCtx.lineWidth = 30;
    bgCtx.strokeRect(20, 20, CANVAS_WIDTH-40, CANVAS_HEIGHT-40);
}

preRenderBackground();

function drawGameObjects() {
    for (let i = 0; i < (currentGameState.orbs || []).length; i++) {
        const orb = currentGameState.orbs[i];
        
        const isLoot = orb.isLoot === true;
        const radius = isLoot ? 15 * 1.8 : 10;
        const blur = isLoot ? 40 : 20;

        ctx.beginPath(); 
        ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
        ctx.shadowBlur = blur; 
        ctx.shadowColor = orb.color; 
        ctx.fillStyle = orb.color;
        ctx.fill(); 
        ctx.closePath();
    }
    for (let i = 0; i < (currentGameState.coins || []).length; i++) {
        const coin = currentGameState.coins[i];
        ctx.beginPath(); ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2);
        ctx.shadowBlur = 0; 
        ctx.fillStyle = '#F1C40F'; ctx.fill(); 
        
        ctx.lineWidth = 5; ctx.strokeStyle = '#000000'; ctx.stroke(); // Contour noir extérieur
        ctx.lineWidth = 3; ctx.strokeStyle = '#F39C12'; ctx.stroke(); // Bordure plus foncée
        ctx.closePath();
        
        ctx.font = "bold 14px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 3; ctx.strokeStyle = "#000000"; ctx.strokeText("$", coin.x, coin.y);
        ctx.fillStyle = "#ffffff"; ctx.fillText("$", coin.x, coin.y);
    }
    for (let i = 0; i < (currentGameState.chests || []).length; i++) {
        const chest = currentGameState.chests[i];
        const w = 60, h = 45;
        const cx = chest.x - w/2;
        const cy = chest.y - h/2;
        
        let cost = 5;
        let cBody = '#CD7F32'; let cGlow = '#8B4513';
        if (chest.type === 'Argent') { cost = 10; cBody = '#C0C0C0'; cGlow = '#A9A9A9'; }
        if (chest.type === 'Or') { cost = 15; cBody = '#FFD700'; cGlow = '#FFA500'; }

        // Base glowing
        ctx.shadowBlur = 35; ctx.shadowColor = cGlow; ctx.fillStyle = cBody;
        ctx.fillRect(cx, cy, w, h);
        
        // Base visual distinction
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, w, h);
        
        // Lid detail
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(cx, cy, w, h * 0.4); 
        ctx.beginPath(); ctx.moveTo(cx, cy + h * 0.4); ctx.lineTo(cx + w, cy + h * 0.4);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
        
        // Lock center
        ctx.beginPath(); ctx.moveTo(cx + w/2 - 5, cy + h*0.4); ctx.lineTo(cx + w/2 + 5, cy + h*0.4);
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4; ctx.stroke();

        // Label text cost with black outline perfectly scaled
        ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 4; ctx.strokeStyle = "#000000"; ctx.strokeText(cost.toString(), chest.x, chest.y + 8);
        ctx.fillStyle = "#FFFFFF"; ctx.fillText(cost.toString(), chest.x, chest.y + 8);
    }
    ctx.shadowBlur = 0;
}

function renderLoop() {
    requestAnimationFrame(renderLoop);

    // Dessiner le fond mis en cache (très rapide)
    ctx.drawImage(bgCanvas, 0, 0);
    drawGameObjects();

    for (const socketId in currentGameState.players) {
        const player = currentGameState.players[socketId];
        if (player.isDead) continue;
        
        const isGhost = player.activeBuff === 'Fantôme';
        const isInvincible = player.activeBuff === 'Invincibilité';
        const isMagnet = player.activeBuff === 'Aimant';
        
        if (isGhost) ctx.globalAlpha = 0.4;

        const hLen = player.history.length;
        const spacing = 3; 
        const segmentsToDraw = Math.min(player.score, Math.floor(hLen / spacing));
        
        ctx.shadowBlur = 25;
        ctx.shadowColor = isInvincible ? '#FFD700' : player.color;
        ctx.fillStyle = player.color;
        
        for (let i = 0; i < segmentsToDraw; i++) {
            const hIndex = (i + 1) * spacing - 1; 
            if (hIndex < hLen) {
                const pt = player.history[hIndex];
                const r = 22 * (1 - (i / player.score) * 0.4);
                
                ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
                if (isInvincible) { ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4; ctx.stroke(); }
                ctx.closePath();
            }
        }
        ctx.shadowBlur = 0;

        ctx.beginPath(); ctx.arc(player.x, player.y, 25, 0, Math.PI * 2); ctx.fillStyle = player.color; ctx.fill();
        ctx.strokeStyle = isInvincible ? '#FFD700' : '#fff'; ctx.lineWidth = isInvincible ? 6 : 3; ctx.stroke(); ctx.closePath();

        if (isMagnet) {
            ctx.beginPath(); ctx.arc(player.x, player.y, 35, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)'; ctx.lineWidth = 4;
            ctx.setLineDash([8, 12]); ctx.stroke(); ctx.setLineDash([]); ctx.closePath();
        }
        
        ctx.font = "35px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(player.emoji || "🐍", player.x, player.y);
        
        ctx.font = "16px Arial"; ctx.fillStyle = "#ffffff";
        ctx.fillText(`${player.pseudo} : ${player.score}`, player.x, player.y - 40);
        
        ctx.globalAlpha = 1.0;
    }
}

renderLoop();

socket.on('lobby_update', (players) => {
    const countEl = document.getElementById('player-count');
    const listEl = document.getElementById('player-list');
    if (countEl && listEl) {
        countEl.innerText = `${players.length} joueur(s) prêt(s)`;
        listEl.innerHTML = '';
        players.forEach(p => {
            const li = document.createElement('li');
            li.style.color = p.color || '#FFF';
            li.style.textShadow = '1px 1px 2px black';
            li.style.marginBottom = '5px';
            li.innerText = `${p.emoji || '🐍'} ${p.pseudo}`;
            listEl.appendChild(li);
        });
    }
});

const btnStart = document.getElementById('btn-start');
if (btnStart) {
    btnStart.addEventListener('click', async () => {
        AudioManager.unlock(); // Débloquer l'audio du navigateur sur interaction utilisateur
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen();
            }
        } catch(e) {
            console.warn("Fullscreen refusé ou non supporté");
        }
        socket.emit('start_game_request');
    });
}

socket.on('countdown_start', (seconds) => {
    const lobby = document.getElementById('lobby-screen');
    if (lobby) lobby.style.display = 'none';

    const cdScreen = document.getElementById('countdown-screen');
    const cdNum = document.getElementById('countdown-number');
    
    if (cdScreen && cdNum) {
        cdScreen.style.display = 'flex';
        cdNum.innerText = seconds;
        cdNum.classList.add('pulse-anim');
        AudioManager.playTick(false); // Premier tick au chargement
        
        let remaining = seconds;
        const interval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                cdNum.innerText = remaining;
                AudioManager.playTick(false);
                cdNum.classList.remove('pulse-anim');
                void cdNum.offsetWidth; 
                cdNum.classList.add('pulse-anim');
            } else if (remaining === 0) {
                cdNum.innerText = "GO !";
                AudioManager.playTick(true); // Son final de "GO!"
                cdNum.classList.remove('pulse-anim');
                void cdNum.offsetWidth; 
                cdNum.classList.add('pulse-anim');
            } else {
                clearInterval(interval);
            }
        }, 1000);
    }
});

socket.on('game_started', () => {
    const lobby = document.getElementById('lobby-screen');
    if (lobby) lobby.style.display = 'none';
    
    AudioManager.startBgm(); // Démarrer la musique d'ambiance
    
    const cdScreen = document.getElementById('countdown-screen');
    if (cdScreen) {
        cdScreen.style.opacity = '0';
        cdScreen.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => cdScreen.style.display = 'none', 500);
    }
});
