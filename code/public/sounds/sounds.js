/**
 * =========================================================
 * EMOJI SLITHER — Gestionnaire de Sons (Web Audio API)
 * Compatible iOS Safari (unlock synchrone + buffer silencieux)
 * =========================================================
 */

const AudioManager = (() => {
    let ctx = null;
    let isUnlocked = false;

    // -------------------------------------------------------
    // UNLOCK — DOIT être appelé synchronement dans un handler
    // de geste utilisateur (touchstart / click) pour iOS Safari
    // -------------------------------------------------------
    function unlock() {
        if (isUnlocked) return;

        ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Buffer silencieux d'un sample : déverrouille iOS
        const silentBuffer = ctx.createBuffer(1, 1, 22050);
        const silentSource = ctx.createBufferSource();
        silentSource.buffer = silentBuffer;
        silentSource.connect(ctx.destination);
        silentSource.start(0);

        // Reprendre si suspendu (iOS 17+, Chrome mobile)
        if (ctx.state === 'suspended') ctx.resume();

        isUnlocked = true;
        console.log('[AudioManager] Déverrouillé :', ctx.state);
    }

    // -------------------------------------------------------
    // Utilitaires internes
    // -------------------------------------------------------
    function playTone(freq, type, duration, volume = 0.4, delay = 0) {
        if (!ctx || !isUnlocked) return;
        if (ctx.state === 'suspended') ctx.resume();

        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration + 0.05);
    }

    function playNoise(duration, volume = 0.3) {
        if (!ctx || !isUnlocked) return;
        if (ctx.state === 'suspended') ctx.resume();

        const bufSize = ctx.sampleRate * duration;
        const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data    = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        source.stop(ctx.currentTime + duration);
    }

    // ======================
    //  SONS PERSONNELS (📱)
    // ======================

    /** Pop court — Manger un orbe */
    function playOrb() {
        playTone(880, 'sine', 0.08, 0.3);
        playTone(1200, 'sine', 0.06, 0.15, 0.04);
    }

    /** Ding — Ramasser une pièce */
    function playCoin() {
        playTone(1046, 'sine', 0.12, 0.35);
        playTone(1318, 'sine', 0.10, 0.30, 0.07);
        playTone(1568, 'sine', 0.08, 0.20, 0.14);
    }

    /** Fanfare courte — Ouvrir un coffre */
    function playChest() {
        playTone(523,  'square', 0.08, 0.25);
        playTone(659,  'square', 0.08, 0.25, 0.09);
        playTone(784,  'square', 0.08, 0.25, 0.18);
        playTone(1046, 'square', 0.15, 0.35, 0.27);
    }

    /** Mort — Son dramatique sur le smartphone */
    function playDeath() {
        playTone(440, 'sawtooth', 0.04, 0.4);
        playTone(370, 'sawtooth', 0.04, 0.4, 0.05);
        playTone(311, 'sawtooth', 0.04, 0.4, 0.10);
        playTone(261, 'sawtooth', 0.04, 0.4, 0.15);
        playTone(220, 'sawtooth', 0.25, 0.5, 0.20);
        playNoise(0.15, 0.2);
    }

    // ======================
    //  SONS GLOBAUX (🖥️)
    // ======================

    /** Bip — Décompte */
    function playTick(isFinal = false) {
        if (isFinal) {
            playTone(800,  'sine', 0.08, 0.5);
            playTone(1000, 'sine', 0.10, 0.5, 0.09);
            playTone(1200, 'sine', 0.12, 0.5, 0.18);
            playTone(1600, 'sine', 0.25, 0.6, 0.27);
        } else {
            playTone(700, 'sine', 0.08, 0.4);
        }
    }

    /** Victoire finale */
    function playVictory() {
        const melody = [523, 659, 784, 1046, 784, 1046, 1318];
        melody.forEach((freq, i) => {
            playTone(freq, 'sine', 0.2, 0.5, i * 0.18);
        });
        playTone(523,  'sine', 0.8, 0.4,  melody.length * 0.18);
        playTone(659,  'sine', 0.8, 0.3,  melody.length * 0.18);
        playTone(784,  'sine', 0.8, 0.3,  melody.length * 0.18);
        playTone(1046, 'sine', 0.8, 0.35, melody.length * 0.18);
    }

    /** Musique d'ambiance — Boucle techno */
    let bgmInterval = null;
    let bgmRunning  = false;

    function playBgmBeat() {
        if (!ctx || !isUnlocked) return;
        const bpm  = 128;
        const step = 60 / bpm;

        // Kick drum
        [0, 2, 4, 6].forEach(beat => {
            const t = ctx.currentTime + beat * step;
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t); osc.stop(t + 0.25);
        });

        // Hi-hat
        for (let i = 0; i < 8; i++) {
            const t       = ctx.currentTime + i * step * 0.5;
            const bufSize = ctx.sampleRate * 0.05;
            const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data    = buf.getChannelData(0);
            for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const hpf = ctx.createBiquadFilter();
            hpf.type = 'highpass'; hpf.frequency.value = 6000;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.06, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            src.connect(hpf); hpf.connect(g); g.connect(ctx.destination);
            src.start(t); src.stop(t + 0.06);
        }

        // Basse
        [65, 65, 65, 82, 82, 65, 65, 98].forEach((freq, i) => {
            playTone(freq, 'sawtooth', step * 0.4, 0.12, i * step * 0.5);
        });
    }

    function startBgm() {
        if (bgmRunning) return;
        bgmRunning = true;
        const loopMs = (60 / 128) * 8 * 1000;
        playBgmBeat();
        bgmInterval = setInterval(() => { if (bgmRunning) playBgmBeat(); }, loopMs);
    }

    function stopBgm() {
        bgmRunning = false;
        if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
    }

    // API publique
    return { unlock, playOrb, playCoin, playChest, playDeath, playTick, playVictory, startBgm, stopBgm };
})();
