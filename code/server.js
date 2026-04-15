const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

const gameState = {
    players: {},    
    arenaId: null,
    orbs: [],       
    coins: [],      
    chests: []      
};

let gameStatus = 'waiting'; // 'waiting', 'playing', 'game_over'
let waitTimeout = null;

const TICK_RATE = 60; 
const TICK_INTERVAL = 1000 / TICK_RATE; 

const MAP_WIDTH = 3000;
const MAP_HEIGHT = 2000;

const MAX_ORBS = 180;
const MAX_COINS = 50;  
const MAX_CHESTS = 5;  
const ORB_RADIUS = 15;
const COIN_RADIUS = 10;
const CHEST_RADIUS = 15;
const HEAD_RADIUS = 25; 
const BODY_RADIUS = 20;

const RECORD_DIST = 10; 
const RECORD_DIST_SQ = RECORD_DIST * RECORD_DIST;
const HISTORY_MULTIPLIER = 3; 

let orbIdCounter = 0; let coinIdCounter = 0; let chestIdCounter = 0;

function spawnOrb() {
    // Évite des fuites memoire de timers pendents de l'ancienne partie
    if (gameState.orbs.length >= MAX_ORBS || gameStatus === 'game_over') return;
    const colors = ['#ff0055', '#00aaff', '#00ffaa', '#ffcc00', '#cc00ff'];
    gameState.orbs.push({
        id: orbIdCounter++,
        x: Math.random() * (MAP_WIDTH - 40) + 20,
        y: Math.random() * (MAP_HEIGHT - 40) + 20,
        color: colors[Math.floor(Math.random() * colors.length)]
    });
}

function spawnCoin() {
    if (gameState.coins.length >= MAX_COINS || gameStatus === 'game_over') return;
    gameState.coins.push({
        id: coinIdCounter++,
        x: Math.random() * (MAP_WIDTH - 60) + 30,
        y: Math.random() * (MAP_HEIGHT - 60) + 30,
        color: '#FFD700'
    });
}

function spawnChest() {
    if (gameState.chests.length >= MAX_CHESTS || gameStatus === 'game_over') return;
    const types = ['Bronze', 'Argent', 'Or'];
    const type = types[Math.floor(Math.random() * types.length)];
    gameState.chests.push({
        id: chestIdCounter++,
        x: Math.random() * (MAP_WIDTH - 60) + 30,
        y: Math.random() * (MAP_HEIGHT - 60) + 30,
        type: type,
        color: type === 'Or' ? '#FFA500' : type === 'Argent' ? '#C0C0C0' : '#CD7F32'
    });
}

for (let i = 0; i < MAX_ORBS; i++) spawnOrb();
for (let i = 0; i < MAX_COINS; i++) spawnCoin();
for (let i = 0; i < MAX_CHESTS; i++) spawnChest();

function killPlayer(socketId, killerName) {
    const p = gameState.players[socketId];
    if (!p || p.isDead || gameStatus !== 'playing') return;

    // --- 1. Calcul du butin ---
    const lootCount = Math.max(1, Math.floor(p.score * (Math.random() * 0.2 + 0.3)));
    
    // --- 2. Effet d'explosion sphérique depuis la position précise du décès (tête) ---
    for (let i = 0; i < lootCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 60; // Dispersion des orbes de 0 à 60 pixels
        
        const explodedX = p.x + Math.cos(angle) * distance;
        const explodedY = p.y + Math.sin(angle) * distance;
        
        // --- 3. Ajout dans gameState.orbs avec format strictement identique à la génération serveur ---
        gameState.orbs.push({
            id: 'loot_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 1000000),
            x: Math.max(20, Math.min(MAP_WIDTH - 20, explodedX)), // Verrouillage d'arène
            y: Math.max(20, Math.min(MAP_HEIGHT - 20, explodedY)),
            color: p.color,
            isLoot: true
        });
    }

    // --- 4. Modification de l'Etat de Mort à la toute fin ---
    p.isDead = true; 
    p.activeBuff = null; 

    if (gameState.arenaId) {
        const killerObj = gameState.players[killerName];
        const killerPseudo = killerName === 'Le Mur' ? 'Le Mur' : (killerObj ? killerObj.pseudo : 'Inconnu');
        const victimPseudo = p.pseudo;
        
        const msg = killerName === 'Le Mur' ? `💀 ${victimPseudo} s'est écrasé` : `${killerPseudo} 🔪 ${victimPseudo}`;
        io.to(gameState.arenaId).emit('player_killed', { message: msg });
    }
    
    io.to(socketId).emit('you_died');
}

io.on('connection', (socket) => {
    socket.on('register_arena', () => {
        gameState.arenaId = socket.id;
        socket.emit('arena_registered');
    });

    socket.on('register_controller', (data) => {
        // Enregistre en tant que spectateur mort si la partie est finie ou non connectée
        const isGameFinished = (gameStatus === 'game_over');
        
        gameState.players[socket.id] = {
            id: socket.id,
            pseudo: data.pseudo || "Anonyme",
            x: 1500 + (Math.random() * 200 - 100),
            y: 1000 + (Math.random() * 200 - 100),
            angle: 0,
            force: 0,
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
            score: 3, 
            coins: 0,
            activeItem: null,  
            activeBuff: null,  
            buffEndTime: 0,    
            history: [],
            isDead: isGameFinished 
        };

        socket.emit('controller_registered', { id: socket.id });

        if (isGameFinished) {
            io.to(socket.id).emit('you_died'); // Force le spectateur par sécurité
        }

        if (gameState.arenaId) {
            io.to(gameState.arenaId).emit('player_joined', gameState.players[socket.id]);
        }
    });

    socket.on('controller_input', (inputData) => {
        const player = gameState.players[socket.id];
        if (player && !player.isDead && gameStatus === 'playing') {
            player.angle = inputData.angle;
            player.force = inputData.force;
        }
    });

    socket.on('activate_bonus', () => {
        const p = gameState.players[socket.id];
        if (p && !p.isDead && p.activeItem && gameStatus === 'playing') {
            p.activeBuff = p.activeItem; 
            p.activeItem = null;         
            p.buffEndTime = Date.now() + 10000; 
        }
    });

    socket.on('disconnect', () => {
        if (socket.id === gameState.arenaId) {
            gameState.arenaId = null;
        } else if (gameState.players[socket.id]) {
            delete gameState.players[socket.id];
            if (gameState.arenaId) io.to(gameState.arenaId).emit('player_left', socket.id);
        }
    });
});

function getDistanceSq(x1, y1, x2, y2) {
    const dx = x1 - x2; const dy = y1 - y2; return dx * dx + dy * dy;
}

let lastTime = Date.now();

function resetGame() {
    gameState.orbs = []; gameState.coins = []; gameState.chests = [];
    orbIdCounter = 0; coinIdCounter = 0; chestIdCounter = 0;
    
    // Le statut DOIT être waiting pour the spawn autorisés
    gameStatus = 'waiting'; 
    
    for (let i = 0; i < MAX_ORBS; i++) spawnOrb();
    for (let i = 0; i < MAX_COINS; i++) spawnCoin();
    for (let i = 0; i < MAX_CHESTS; i++) spawnChest();
    
    for (const socketId in gameState.players) {
        const p = gameState.players[socketId];
        p.isDead = false;
        p.score = 3;
        // p.coins = 0; // Conservation des pièces comme demandé tacitement pr futur shop
        p.activeItem = null;
        p.activeBuff = null;
        p.buffEndTime = 0;
        p.history = [];
        p.x = 1500 + (Math.random() * 800 - 400); // Espacement plus grand au spawn !
        p.y = 1000 + (Math.random() * 800 - 400);
        p.angle = 0;
        p.force = 0;
        
        io.to(p.id).emit('game_restart'); // Refraîchit le front mobile
    }
    
    if (gameState.arenaId) {
        io.to(gameState.arenaId).emit('game_restart'); // Retire le filtre arène
    }
}

function updateGameState(dt) {
    if (gameStatus === 'game_over') return; 

    const playersArr = Object.values(gameState.players);
    const alivePlayers = playersArr.filter(p => !p.isDead);
    
    // Check de début de partie
    if (gameStatus === 'waiting' && playersArr.length >= 2) {
        if (alivePlayers.length >= 2) {
            gameStatus = 'playing'; // La survie commence !
        }
    }
    
    // Check Fin de partie
    if (gameStatus === 'playing') {
        if (alivePlayers.length <= 1) {
            gameStatus = 'game_over';
            const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
            
            if (gameState.arenaId) {
                io.to(gameState.arenaId).emit('game_over', { 
                    winnerName: winner ? winner.pseudo : "Etrangement personne" 
                });
            }
            
            for (const p of playersArr) {
                io.to(p.id).emit('game_over', { 
                    winnerId: winner ? winner.id : null, 
                    winnerName: winner ? winner.pseudo : "Personne" 
                });
            }
            
            // Relance asynchrone ultra-safe d'exactement 10s
            if (waitTimeout) clearTimeout(waitTimeout);
            waitTimeout = setTimeout(() => {
                resetGame();
            }, 10000);
            
            return;
        }
    }

    const SPEED_MULTIPLIER = 400;
    const playersToKill = [];

    // Boucle Physique Standard
    for (const socketId in gameState.players) {
        const player = gameState.players[socketId];
        if (player.isDead) continue;
        
        if (player.activeBuff && Date.now() > player.buffEndTime) player.activeBuff = null;
        
        if (player.activeBuff === 'Aimant') {
            const MAGNET_DIST_SQ = 150 * 150;
            const MAGNET_SPEED = 500; 
            
            for (let i = 0; i < gameState.orbs.length; i++) {
                const orb = gameState.orbs[i];
                if (getDistanceSq(player.x, player.y, orb.x, orb.y) < MAGNET_DIST_SQ) {
                    const angle = Math.atan2(player.y - orb.y, player.x - orb.x);
                    orb.x += Math.cos(angle) * MAGNET_SPEED * dt;
                    orb.y += Math.sin(angle) * MAGNET_SPEED * dt;
                }
            }
            for (let i = 0; i < gameState.coins.length; i++) {
                const coin = gameState.coins[i];
                if (getDistanceSq(player.x, player.y, coin.x, coin.y) < MAGNET_DIST_SQ) {
                    const angle = Math.atan2(player.y - coin.y, player.x - coin.x);
                    coin.x += Math.cos(angle) * MAGNET_SPEED * dt;
                    coin.y += Math.sin(angle) * MAGNET_SPEED * dt;
                }
            }
        }

        if (player.force > 0) {
            const effForce = Math.min(player.force, 2); 
            const nX = player.x + Math.cos(player.angle) * effForce * SPEED_MULTIPLIER * dt;
            const nY = player.y - Math.sin(player.angle) * effForce * SPEED_MULTIPLIER * dt;
            const cX = Math.max(0, Math.min(MAP_WIDTH, nX));
            const cY = Math.max(0, Math.min(MAP_HEIGHT, nY));

            if (player.history.length === 0) {
                player.history.unshift({ x: player.x, y: player.y });
            } else {
                if (getDistanceSq(cX, cY, player.history[0].x, player.history[0].y) >= RECORD_DIST_SQ) {
                    player.history.unshift({ x: cX, y: cY });
                    const maxLen = player.score * HISTORY_MULTIPLIER;
                    if (player.history.length > maxLen) {
                        player.history.length = maxLen; 
                    }
                }
            }

            player.x = cX;
            player.y = cY;
        }

        if (player.x <= 5 || player.x >= MAP_WIDTH - 5 || player.y <= 5 || player.y >= MAP_HEIGHT - 5) {
             if (player.activeBuff !== 'Invincibilité') playersToKill.push({ id: socketId, killer: 'Le Mur' });
             continue; 
        }

        for (const otherId in gameState.players) {
            if (otherId === socketId) continue;
            const other = gameState.players[otherId];
            if (other.isDead) continue;
            if (player.activeBuff === 'Fantôme' || other.activeBuff === 'Fantôme') continue;

            const distSqH2H = getDistanceSq(player.x, player.y, other.x, other.y);
            if (distSqH2H < (HEAD_RADIUS * 2) * (HEAD_RADIUS * 2)) {
                if (player.activeBuff !== 'Invincibilité') playersToKill.push({ id: socketId, killer: otherId });
                if (other.activeBuff !== 'Invincibilité') playersToKill.push({ id: otherId, killer: socketId });
                continue; 
            }

            const collisionBody = (HEAD_RADIUS + BODY_RADIUS) * (HEAD_RADIUS + BODY_RADIUS);
            let hitBody = false;
            for (let i = HISTORY_MULTIPLIER; i < other.history.length; i += HISTORY_MULTIPLIER) {
                if (getDistanceSq(player.x, player.y, other.history[i].x, other.history[i].y) < collisionBody) {
                    if (player.activeBuff !== 'Invincibilité') playersToKill.push({ id: socketId, killer: otherId });
                    hitBody = true; break;
                }
            }
            if (hitBody) break;
        }

        const limOrbs = (HEAD_RADIUS + ORB_RADIUS) * (HEAD_RADIUS + ORB_RADIUS);
        for (let i = gameState.orbs.length - 1; i >= 0; i--) {
            if (getDistanceSq(player.x, player.y, gameState.orbs[i].x, gameState.orbs[i].y) < limOrbs) {
                gameState.orbs.splice(i, 1);
                player.score += 1;
                setTimeout(spawnOrb, 3000); // Gracefully resolved by status check
            }
        }
        
        const limCoins = (HEAD_RADIUS + COIN_RADIUS) * (HEAD_RADIUS + COIN_RADIUS);
        for (let i = gameState.coins.length - 1; i >= 0; i--) {
            if (getDistanceSq(player.x, player.y, gameState.coins[i].x, gameState.coins[i].y) < limCoins) {
                gameState.coins.splice(i, 1);
                player.coins += 1;
                setTimeout(spawnCoin, 5000 + Math.random()*2000); 
            }
        }
        
        const limChests = (HEAD_RADIUS + CHEST_RADIUS) * (HEAD_RADIUS + CHEST_RADIUS);
        for (let i = gameState.chests.length - 1; i >= 0; i--) {
            if (getDistanceSq(player.x, player.y, gameState.chests[i].x, gameState.chests[i].y) < limChests) {
                gameState.chests.splice(i, 1);
                const items = ['Aimant', 'Invincibilité', 'Fantôme'];
                player.activeItem = items[Math.floor(Math.random() * items.length)];
                setTimeout(spawnChest, 10000 + Math.random()*5000);
            }
        }
    }

    const uniqueKills = [...new Set(playersToKill.map(k=>k.id))];
    for (const killedId of uniqueKills) {
        const killInstance = playersToKill.find(k => k.id === killedId);
        killPlayer(killInstance.id, killInstance.killer);
    }
}

let tickCounter = 0;

function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000; 
    lastTime = currentTime;

    updateGameState(deltaTime);
    
    if (gameState.arenaId) {
        io.to(gameState.arenaId).emit('gameState_update', {
            players: gameState.players,
            orbs: gameState.orbs,
            coins: gameState.coins,
            chests: gameState.chests
        });
    }
    
    tickCounter++;
    if (tickCounter >= 10) {
        tickCounter = 0;
        const alivePlayers = Object.values(gameState.players).filter(p => !p.isDead);
        if (gameState.arenaId) {
            const top5 = [...alivePlayers].sort((a, b) => b.score - a.score).slice(0, 5).map(p => ({
                id: p.id, pseudo: p.pseudo, score: p.score, color: p.color
            }));
            io.to(gameState.arenaId).emit('top_players', top5);
        }

        for (const p of alivePlayers) {
            let buffRemaining = 0;
            if (p.activeBuff) buffRemaining = Math.max(0, Math.ceil((p.buffEndTime - Date.now()) / 1000));
            io.to(p.id).emit('ui_update', {
                score: p.score, coins: p.coins, activeItem: p.activeItem, activeBuff: p.activeBuff, buffRemaining: buffRemaining
            });
        }
    }
}

setInterval(gameLoop, TICK_INTERVAL);

server.listen(PORT, () => {
    console.log(`[✔] Serveur démarré sur http://localhost:${PORT}`);
});
