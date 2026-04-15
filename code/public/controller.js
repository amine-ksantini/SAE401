const socket = io();

// UI Elements
const statusText = document.getElementById('statusText');
const scoreVal = document.getElementById('scoreVal');
const coinsVal = document.getElementById('coinsVal');
const actionBtn = document.getElementById('actionBtn');

const loginScreen = document.getElementById('loginScreen');
const joinBtn = document.getElementById('joinBtn');
const pseudoInput = document.getElementById('pseudoInput');

const uiHeader = document.getElementById('uiHeader');
const uiItem = document.getElementById('uiItem');
const joystickZone = document.getElementById('joystick-zone');

// Portée stricte (Global Scope)
let currentAngle = 0;
let currentForce = 0;
let isMoving = false; 
let manager = null;

// La boucle réseau
const SEND_TICK_RATE = 60;
setInterval(() => {
    if (isMoving && currentForce > 0) {
        socket.emit('controller_input', {
            angle: currentAngle,
            force: currentForce
        });
    }
}, 1000 / SEND_TICK_RATE);

function initJoystick() {
    if (manager) {
        manager.destroy();
    }
    
    manager = nipplejs.create({
        zone: joystickZone,
        mode: 'dynamic', // Autorise de cliquer n'importe où sur l'écran
        color: '#9c88ff',
        size: 150
    });

    manager.on('move', (evt, data) => {
        if (data.angle && data.force !== undefined) {
            // Assigne strictement les variables globales sans créer de redéclaration (Pas de "let" ici) !
            currentAngle = data.angle.radian;
            currentForce = data.force; 
            isMoving = true;
        }
    });

    manager.on('end', () => {
        currentAngle = 0;
        currentForce = 0;
        isMoving = false;
        
        socket.emit('controller_input', { angle: 0, force: 0 });
    });
}

// ---------------------------------------------------------
// Validation Menu
// ---------------------------------------------------------
joinBtn.onclick = () => {
    let pseudo = pseudoInput.value.trim();
    if (!pseudo) pseudo = "Anonyme";
    
    // 1. Masquer l'écran d'accueil
    loginScreen.style.display = 'none';
    
    // 2. Afficher la zone de NippleJS (display block permet de reprendre sa vraie taile CSS vh/vw)
    uiHeader.style.display = 'flex';
    uiItem.style.display = 'flex';
    joystickZone.style.display = 'block';

    // 3. FORCE LE REFLOW : C'est ce qui oblige le layout synchronisé sur les navigateurs webkits (iOS/Android)
    joystickZone.offsetHeight;
    
    // 4. Initialisation saine (sans setTimeout bancal)
    initJoystick();
    
    // 5. Validation serveur
    socket.emit('register_controller', { pseudo: pseudo });
};

socket.on('controller_registered', (data) => {
    console.log(`[Controller] Registré (ID: ${data.id})`);
    statusText.innerText = "✅ Connecté ! Joystick actif.";
    statusText.style.color = "#4CAF50";
});

socket.on('disconnect', () => {
    statusText.innerText = "❌ Connexion perdue.";
    statusText.style.color = "#FF5252";
});

socket.on('ui_update', (data) => {
    if (scoreVal) scoreVal.innerText = data.score;
    if (coinsVal) coinsVal.innerText = data.coins;
    
    if (data.activeBuff) {
        actionBtn.innerText = `${data.activeBuff}: ${data.buffRemaining}s`;
        actionBtn.style.backgroundColor = '#FFD700'; 
        actionBtn.style.color = '#000';
        actionBtn.style.border = '2px solid #FFD700';
        actionBtn.disabled = true;
    } else if (data.activeItem) {
        actionBtn.innerText = "⚡ Activer " + data.activeItem;
        actionBtn.classList.add('active');
        actionBtn.style.backgroundColor = ''; 
        actionBtn.style.color = '';
        actionBtn.style.border = '';
        actionBtn.disabled = false;
    } else {
        actionBtn.innerText = "Aucun Bonus";
        actionBtn.classList.remove('active');
        actionBtn.style.backgroundColor = ''; 
        actionBtn.style.color = '';
        actionBtn.style.border = '';
        actionBtn.disabled = true;
    }
});

actionBtn.onclick = () => {
    if (!actionBtn.disabled) {
        socket.emit('activate_bonus');
        if ("vibrate" in navigator) navigator.vibrate(200);
        actionBtn.disabled = true;
        actionBtn.innerText = "Activation...";
    }
}

socket.on('you_died', () => {
    isMoving = false;
    if (manager) manager.destroy();
    if (joystickZone) joystickZone.style.display = 'none';
    
    uiHeader.style.display = 'none';
    uiItem.style.display = 'none';
    
    statusText.innerHTML = "<h2 style='margin:10px 0;'>💀 ÉLIMINÉ</h2><p style='color:#ccc; font-weight:normal;'>Mode spectateur actif</p>";
    statusText.style.color = "#FF5252";
    socket.emit('controller_input', { angle: 0, force: 0 });
});

socket.on('game_over', (data) => {
    isMoving = false;
    if (manager) manager.destroy();
    if (joystickZone) joystickZone.style.display = 'none';
    
    uiHeader.style.display = 'none';
    uiItem.style.display = 'none';
    
    if (data.winnerId === socket.id) {
        if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
        statusText.innerHTML = "<h2 style='margin:10px 0; color:#FFD700;'>🏆 TU AS GAGNÉ !</h2><p style='color:#ccc; font-weight:normal;'>Redémarrage en cours...</p>";
        statusText.style.color = "#FFD700";
    } else {
        statusText.innerHTML = `<h2 style='margin:10px 0;'>Fin de partie</h2><p style='color:#ccc; font-weight:normal;'>La couronne de la victoire revient à ${data.winnerName}</p>`;
        statusText.style.color = "#FF5252";
    }
});

socket.on('game_restart', () => {
    uiHeader.style.display = 'flex';
    uiItem.style.display = 'flex';
    joystickZone.style.display = 'block';
    
    // De nouveau, forcer le Reflow avant l'initialisation après le restart automatique
    joystickZone.offsetHeight;

    initJoystick();
    
    statusText.innerHTML = "✅ Reprise ! Survis !";
    statusText.style.color = "#4CAF50";
});
