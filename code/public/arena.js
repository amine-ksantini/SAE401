const socket = io();

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

function drawHexagon(x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const rad = (Math.PI / 3) * i;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](x + size * Math.cos(rad), y + size * Math.sin(rad));
    }
    ctx.closePath();
    ctx.stroke();
}

function drawHexGrid() {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 2; 
    const hw = Math.sqrt(3) * HEX_SIZE;
    const hh = 2 * HEX_SIZE;
    const cols = Math.ceil(CANVAS_WIDTH / hw) + 1;
    const rows = Math.ceil(CANVAS_HEIGHT / (hh * 0.75)) + 1;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let x = col * hw;
            let y = row * hh * 0.75;
            if (row % 2 === 1) x += hw / 2;
            drawHexagon(x, y, HEX_SIZE);
        }
    }
}

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
        ctx.shadowBlur = 15; ctx.shadowColor = coin.color; ctx.fillStyle = coin.color;
        ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke(); ctx.closePath();
    }
    for (let i = 0; i < (currentGameState.chests || []).length; i++) {
        const chest = currentGameState.chests[i];
        ctx.shadowBlur = 20; ctx.shadowColor = chest.color; ctx.fillStyle = chest.color;
        ctx.fillRect(chest.x - 15, chest.y - 12, 30, 24);
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(chest.x - 15, chest.y - 12, 30, 24);
        ctx.beginPath(); ctx.moveTo(chest.x - 15, chest.y); ctx.lineTo(chest.x + 15, chest.y);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
    }
    ctx.shadowBlur = 0;
}

function renderLoop() {
    requestAnimationFrame(renderLoop);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    drawHexGrid();
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
        ctx.fillText("🐍", player.x, player.y);
        
        ctx.font = "16px Arial"; ctx.fillStyle = "#ffffff";
        ctx.fillText(`${player.pseudo} : ${player.score}`, player.x, player.y - 40);
        
        ctx.globalAlpha = 1.0;
    }
}

renderLoop();
