/**
 * =========================================================
 * EMOJI SLITHER — Gestionnaire de Sons (Web Audio API)
 * Sons 100% synthétiques, aucun fichier externe nécessaire.
 * =========================================================
 */

const AudioManager = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    // --- Utilitaire de base ---
    function playTone(freq, type, duration, volume = 0.4, delay = 0) {
        const c = getCtx();
        const osc   = c.createOscillator();
        const gain  = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type      = type;
        osc.frequency.setValueAtTime(freq, c.currentTime + delay);
        gain.gain.setValueAtTime(0, c.currentTime + delay);
        gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + duration);
        osc.start(c.currentTime + delay);
        osc.stop(c.currentTime + delay + duration + 0.05);
    }

    function playNoise(duration, volume = 0.3) {
        const c = getCtx();
        const bufSize = c.sampleRate * duration;
        const buffer  = c.createBuffer(1, bufSize, c.sampleRate);
        const data    = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
        const source = c.createBufferSource();
        source.buffer = buffer;
        const gain = c.createGain();
        gain.gain.setValueAtTime(volume, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
        source.connect(gain);
        gain.connect(c.destination);
        source.start();
        source.stop(c.currentTime + duration);
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
        playTone(1318, 'sine', 0.10, 0.3, 0.07);
        playTone(1568, 'sine', 0.08, 0.2, 0.14);
    }

    /** Fanfare courte — Ouvrir un coffre */
    function playChest() {
        playTone(523,  'square', 0.08, 0.25);
        playTone(659,  'square', 0.08, 0.25, 0.09);
        playTone(784,  'square', 0.08, 0.25, 0.18);
        playTone(1046, 'square', 0.15, 0.35, 0.27);
    }

    /** Mort — Son dramatique de défaite sur le smartphone */
    function playDeath() {
        // Descente dramatique
        playTone(440, 'sawtooth', 0.04, 0.4);
        playTone(370, 'sawtooth', 0.04, 0.4, 0.05);
        playTone(311, 'sawtooth', 0.04, 0.4, 0.10);
        playTone(261, 'sawtooth', 0.04, 0.4, 0.15);
        playTone(220, 'sawtooth', 0.25, 0.5, 0.20);
        // Bruit d'impact
        playNoise(0.15, 0.2);
    }

    // ======================
    //  SONS GLOBAUX (🖥️)
    // ======================

    /** Bip — Décompte */
    function playTick(isFinal = false) {
        if (isFinal) {
            // "GO!" — Montée brillante
            playTone(800,  'sine', 0.08, 0.5);
            playTone(1000, 'sine', 0.10, 0.5, 0.09);
            playTone(1200, 'sine', 0.12, 0.5, 0.18);
            playTone(1600, 'sine', 0.25, 0.6, 0.27);
        } else {
            playTone(700, 'sine', 0.08, 0.4);
        }
    }

    /** Victoire finale — Pour tout le monde sur l'arène */
    function playVictory() {
        const melody = [523, 659, 784, 1046, 784, 1046, 1318];
        melody.forEach((freq, i) => {
            playTone(freq, 'sine', 0.2, 0.5, i * 0.18);
        });
        // Accord final
        playTone(523,  'sine', 0.8, 0.4, melody.length * 0.18);
        playTone(659,  'sine', 0.8, 0.3, melody.length * 0.18);
        playTone(784,  'sine', 0.8, 0.3, melody.length * 0.18);
        playTone(1046, 'sine', 0.8, 0.35, melody.length * 0.18);
    }

    /** Musique d'ambiance — Boucle survoltée */
    let bgmInterval = null;
    let bgmRunning = false;

    function playBgmBeat() {
        const c = getCtx();
        const bpm = 128;
        const step = 60 / bpm;

        // Kick drum synthétique
        const kickFreqs = [0, 2, 4, 6];
        kickFreqs.forEach(beat => {
            const t = c.currentTime + beat * step;
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.connect(gain); gain.connect(c.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t); osc.stop(t + 0.25);
        });

        // Hi-hat synthétique
        for (let i = 0; i < 8; i++) {
            const t = c.currentTime + i * step * 0.5;
            const bufSize = c.sampleRate * 0.05;
            const buf = c.createBuffer(1, bufSize, c.sampleRate);
            const data = buf.getChannelData(0);
            for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;
            const src = c.createBufferSource();
            src.buffer = buf;
            const hpf = c.createBiquadFilter();
            hpf.type = 'highpass';
            hpf.frequency.value = 6000;
            const g = c.createGain();
            g.gain.setValueAtTime(0.06, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            src.connect(hpf); hpf.connect(g); g.connect(c.destination);
            src.start(t); src.stop(t + 0.06);
        }

        // Ligne de basse pulsée
        const bassNotes = [65, 65, 65, 82, 82, 65, 65, 98];
        bassNotes.forEach((freq, i) => {
            const t = c.currentTime + i * step * 0.5;
            playTone(freq, 'sawtooth', step * 0.4, 0.12, i * step * 0.5);
        });
    }

    function startBgm() {
        if (bgmRunning) return;
        bgmRunning = true;
        const bpm = 128;
        const loopDuration = (60 / bpm) * 8 * 1000; // 8 beats par boucle
        playBgmBeat();
        bgmInterval = setInterval(() => {
            if (!bgmRunning) return;
            playBgmBeat();
        }, loopDuration);
    }

    function stopBgm() {
        bgmRunning = false;
        if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
    }

    // API publique
    return {
        unlock: () => getCtx(),
        playOrb,
        playCoin,
        playChest,
        playDeath,
        playTick,
        playVictory,
        startBgm,
        stopBgm
    };
})();
