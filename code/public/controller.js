const socket = io();

socket.on('play_local_sound', (type) => {
    if (type === 'orb') AudioManager.playOrb();
    if (type === 'coin') AudioManager.playCoin();
    if (type === 'chest') AudioManager.playChest();
    if (type === 'death') AudioManager.playDeath();
});

const statusText = document.getElementById('statusText');
const scoreDisplay = document.getElementById('score-display');
const coinsDisplay = document.getElementById('coins-display');
const rankDisplay = document.getElementById('rank-display');
const bonusBtn = document.getElementById('bonus-btn');
const gamepad = document.getElementById('gamepad');

const loginScreen = document.getElementById('loginScreen');
const joinBtn = document.getElementById('joinBtn');
const pseudoInput = document.getElementById('pseudoInput');
const joystickZone = document.getElementById('joystick-half');

let currentItemDuration = 10000;

const themes = {
    'default': 'theme-default',
    'Aimant': 'theme-aimant',
    'Invincibilité': 'theme-invincible',
    'Fantôme': 'theme-fantome'
};

function setTheme(buffName) {
    const card = document.getElementById('game-card');
    if (card) card.className = themes[buffName] || 'theme-default';
}

let currentAngle = 0;
let currentForce = 0;
let isMoving = false;
let manager = null;

const SEND_TICK_RATE = 20;
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
        mode: 'dynamic',
        color: '#9c88ff',
        size: 150
    });

    manager.on('move', (evt, data) => {
        if (data.angle && data.force !== undefined) {
            currentAngle = data.angle.radian;
            currentForce = data.force;
            isMoving = true;
        }
    });

    manager.on('end', () => {
        currentForce = 0;
        isMoving = false;

        socket.emit('controller_input', { angle: currentAngle, force: 0 });
    });
}

let selectedEmoji = null;
const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐒", "🐔", "🐧", "🐦", "🐤", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦀", "🐡", "🐠", "🐬", "🐳", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘"];
const emojiSelector = document.getElementById('emoji-selector');

if (emojiSelector) {
    EMOJIS.forEach(emoji => {
        const el = document.createElement('div');
        el.className = 'emoji-option';
        el.innerText = emoji;
        emojiSelector.appendChild(el);

        el.addEventListener('click', () => {
            document.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected');
            selectedEmoji = emoji;
            document.getElementById('error-message').innerText = '';
        });
    });
}


const nextBtn = document.getElementById('nextBtn');
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        document.getElementById('rulesScreen').style.display = 'none';
        loginScreen.style.display = 'flex';
    });
}


joinBtn.addEventListener('click', async () => {
    AudioManager.unlock();

    let pseudo = pseudoInput.value.trim();
    if (!pseudo) pseudo = "Anonyme";

    if (!selectedEmoji) {
        document.getElementById('error-message').innerText = "Veuillez choisir un Émoji !";
        return;
    }

    document.getElementById('error-message').innerText = '';
    document.getElementById('player-pseudo').innerText = `${selectedEmoji} ${pseudo}`;

    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            await document.documentElement.webkitRequestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (err) {
        console.warn("Le mode paysage forcé n'est pas totalement supporté.");
    }

    loginScreen.style.display = 'none';
    gamepad.style.display = 'flex';

    joystickZone.offsetHeight;

    initJoystick();

    socket.emit('register_controller', { pseudo: pseudo, emoji: selectedEmoji });
});

socket.on('join_error', (message) => {
    loginScreen.style.display = 'flex';
    gamepad.style.display = 'none';
    if (manager) manager.destroy();

    document.getElementById('error-message').innerText = message;
});

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
    if (scoreDisplay) scoreDisplay.innerText = data.score;
    if (coinsDisplay) coinsDisplay.innerText = data.coins;
    if (data.rank && rankDisplay) rankDisplay.innerText = `Rang: #${data.rank}`;

    if (data.activeBuff) {
        bonusBtn.disabled = true;
    } else if (data.activeItem) {
        currentItemDuration = data.buffDurationMs || 10000;
        let icon = "⚡";
        if (data.activeItem === 'Aimant') icon = "🧲";
        if (data.activeItem === 'Invincibilité') icon = "⭐";
        if (data.activeItem === 'Fantôme') icon = "👻";

        document.getElementById('btn-icon').innerText = icon;
        document.getElementById('btn-title').innerText = "ACTIVER";
        document.getElementById('btn-subtitle').innerText = `${data.activeItem} (${currentItemDuration / 1000}s)`;

        bonusBtn.disabled = false;
        document.getElementById('btn-progress-bar').style.display = 'none';

        setTheme(data.activeItem);
    } else {
        document.getElementById('btn-icon').innerText = "❌";
        document.getElementById('btn-title').innerText = "AUCUN";
        document.getElementById('btn-subtitle').innerText = "Bonus";
        bonusBtn.disabled = true;
        document.getElementById('btn-progress-bar').style.display = 'none';

        setTheme('default');
    }
});

bonusBtn.ontouchstart = (e) => {
    e.preventDefault();
    if (!bonusBtn.disabled) {
        socket.emit('activate_bonus');
        if ("vibrate" in navigator) navigator.vibrate(200);
        bonusBtn.disabled = true;
        animateBonusGauge(currentItemDuration);
    }
}

function animateBonusGauge(durationMs) {
    let startTime = Date.now();
    const fill = document.getElementById('btn-progress-fill');
    const bar = document.getElementById('btn-progress-bar');
    if (bar) bar.style.display = 'block';

    function updateGauge() {
        let elapsed = Date.now() - startTime;
        let percent = Math.max(0, 100 - (elapsed / durationMs) * 100);

        if (fill) fill.style.width = percent + '%';

        if (percent > 0) {
            requestAnimationFrame(updateGauge);
        } else {
            if (bar) bar.style.display = 'none';
            setTheme('default');
            document.getElementById('btn-icon').innerText = "❌";
            document.getElementById('btn-title').innerText = "AUCUN";
            document.getElementById('btn-subtitle').innerText = "Bonus";
        }
    }
    updateGauge();
}

socket.on('you_died', () => {
    isMoving = false;
    if (manager) manager.destroy();
    gamepad.style.display = 'none';

    statusText.innerHTML = "<h2 style='margin:10px 0;'>💀 ÉLIMINÉ</h2><p style='color:#ccc; font-weight:normal;'>Mode spectateur actif</p>";
    statusText.style.color = "#FF5252";
    socket.emit('controller_input', { angle: 0, force: 0 });
});

socket.on('game_over', (data) => {
    isMoving = false;
    if (manager) manager.destroy();
    gamepad.style.display = 'none';

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
    loginScreen.style.display = 'flex';
    gamepad.style.display = 'none';
    if (manager) manager.destroy();

    document.getElementById('error-message').innerText = '';
    statusText.innerText = "⏳ En attente de connexion...";
    statusText.style.color = "#ccc";
});
