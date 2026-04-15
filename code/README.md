# 🐍 Emoji Slither Battle Royale — Documentation Technique

## Table des Matières

1. [Présentation du Projet](#présentation-du-projet)
2. [Architecture Technique](#architecture-technique)
3. [Prérequis](#prérequis)
4. [Installation et Lancement Local](#installation-et-lancement-local)
5. [Structure des Fichiers](#structure-des-fichiers)
6. [Déploiement en Production (Render)](#déploiement-en-production-render)
7. [Règles du Jeu et Logique Métier](#règles-du-jeu-et-logique-métier)
8. [Système Audio](#système-audio)
9. [Guide de la Démo](#guide-de-la-démo)

---

## Présentation du Projet

**Emoji Slither Battle Royale** est un jeu multijoueur en temps réel inspiré de Slither.io, adapté en Battle Royale. Chaque joueur contrôle son serpent depuis **son propre smartphone** (qui fait office de manette), tandis que la partie est projetée sur un **grand écran commun** (l'arène).

- **Mode de jeu :** Battle Royale — le dernier serpent en vie gagne.
- **Technologie :** Node.js + Socket.IO (temps réel WebSocket).
- **Accessible à distance :** déployé sur [https://emoji-slither.onrender.com](https://emoji-slither.onrender.com).

---

## Architecture Technique

```
┌─────────────────────────────────────────────────────────┐
│                   Serveur Node.js                       │
│                   (server.js)                           │
│                                                         │
│  - Logique de jeu autoritaire (60 FPS)                  │
│  - Gestion des phases : LOBBY → COUNTDOWN → PLAYING     │
│  - Calcul des collisions, scores, bonus                 │
│  - Émissions Socket.IO ciblées                          │
└───────────────┬─────────────────────┬───────────────────┘
                │ WebSocket           │ WebSocket
                ▼                     ▼
┌──────────────────┐       ┌───────────────────────┐
│  Arène (PC/TV)   │       │  Manette (Smartphone) │
│  arena.html/.js  │       │ controller.html/.js   │
│                  │       │                       │
│ - Canvas 3000x2000       │ - Nipple.js Joystick  │
│ - Rendu 60 FPS   │       │ - Sélection Emoji     │
│ - Fond spatial   │       │ - Bouton bonus        │
│ - Leaderboard    │       │ - Jauge de buff       │
│ - Sons globaux   │       │ - Sons personnels     │
└──────────────────┘       └───────────────────────┘
```

**Le serveur fait autorité** : les clients ne calculent rien de critique. Toutes les positions, collisions et scores sont calculés côté serveur et diffusés à 60 FPS.

---

## Prérequis

| Outil | Version minimale | Utilisation |
|-------|-----------------|-------------|
| **Node.js** | v20.0.0+ | Runtime JavaScript serveur |
| **npm** | v8.0.0+ | Gestionnaire de paquets |
| **Navigateur moderne** | Chrome 90+ / Safari 15+ | Arène et Manette |

---

## Installation et Lancement Local

### 1. Cloner ou récupérer le projet

Placer le dossier `code/` n'importe où sur votre machine.

### 2. Installer les dépendances

```bash
cd code
npm install
```

Cette commande installe automatiquement :
- `express` — serveur HTTP pour servir les fichiers statiques
- `socket.io` — communication temps réel WebSocket

### 3. Lancer le serveur

```bash
node server.js
```

**Résultat attendu :**
```
[✔] Serveur démarré sur http://localhost:3000
```

### 4. Accéder au jeu

| Page | URL | Rôle |
|------|-----|------|
| **Arène** | `http://localhost:3000/arena.html` | Grand écran, projeté pour tous |
| **Manette** | `http://localhost:3000/controller.html` | Smartphone de chaque joueur |

> **Pour jouer en réseau local :** remplacer `localhost` par l'adresse IP locale du PC serveur (ex: `192.168.1.XX`). Les autres appareils du même réseau Wi-Fi peuvent alors se connecter.

---

## Structure des Fichiers

```
code/
├── server.js              # Serveur Node.js — logique de jeu complète
├── package.json           # Dépendances et scripts npm
├── .gitignore             # Exclut node_modules du dépôt Git
│
└── public/                # Fichiers statiques servis par Express
    ├── arena.html          # Page de l'arène (grand écran)
    ├── arena.js            # Logique client arène : rendu Canvas, Socket.IO
    ├── controller.html     # Page de la manette (smartphone)
    ├── controller.js       # Logique client manette : joystick, UI, sons
    ├── logo-transparent.png # Logo du jeu (fond transparent)
    └── sounds/
        └── sounds.js       # Gestionnaire audio synthétique (Web Audio API)
```

---

## Déploiement en Production (Render)

Le projet est déployé et accessible publiquement sur :

> **https://emoji-slither.onrender.com**

### Configuration Render utilisée

| Paramètre | Valeur |
|-----------|--------|
| **Type** | Web Service |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Variable d'env** | `PORT` (injecté automatiquement par Render) |

### Pourquoi ça fonctionne sans modification

Dans `server.js`, la ligne suivante permet à Render d'injecter dynamiquement son port :

```javascript
const PORT = process.env.PORT || 3000;
```

Dans les fichiers clients, Socket.IO se connecte automatiquement au bon domaine :

```javascript
const socket = io(); // Chemin relatif — fonctionne en local ET sur Render
```

> ⚠️ **Note :** En version gratuite de Render, le serveur se met en veille après 15 minutes d'inactivité. Il peut prendre 20-30 secondes à se réveiller lors du premier accès. **Ouvrir la page 2 minutes avant la démo.**

---

## Règles du Jeu et Logique Métier

### Phases de jeu

```
LOBBY ──► COUNTDOWN (5s) ──► PLAYING ──► GAME_OVER ──► LOBBY (10s)
```

| Phase | Description |
|-------|-------------|
| `LOBBY` | Les joueurs se connectent. L'admin appuie sur "Lancer la Partie". |
| `COUNTDOWN` | Décompte de 5 secondes. Les joueurs sont placés en cercle. |
| `PLAYING` | La partie est en cours. La physique tourne à 60 FPS. |
| `GAME_OVER` | Le gagnant est affiché. Réinitialisation automatique après 10 secondes. |

### Physique du Mouvement

- Le serpent **avance en permanence** (même sans input joueur) à `150 px/s`.
- Le joystick ajoute un **boost** jusqu'à `+100 px/s` (max `250 px/s`).
- La **dernière direction** est mémorisée : relâcher le joystick ne stoppe pas le serpent.

### Système de Collision

| Type | Résultat |
|------|----------|
| Tête dans le corps d'un adversaire | Mort du joueur entrant |
| Tête contre tête | Mort des deux joueurs |
| Contact avec les bords de la carte | Mort (sauf buff Invincibilité) |

### Économie (Pièces & Coffres)

Il y a toujours **exactement 3 coffres** sur la carte en permanence.

| Coffre | Coût | Rareté | Durée du bonus |
|--------|------|--------|----------------|
| 🟫 Bronze | 5 pièces | Commun | 5 secondes |
| ⬜ Argent | 10 pièces | Épique | 10 secondes |
| 🟨 Or | 15 pièces | Légendaire | 15 secondes |

### Système de Bonus (Gacha)

| Bonus | Probabilité | Effet |
|-------|-------------|-------|
| 🧲 Aimant | 50% | Attire les orbes proches automatiquement |
| 👻 Fantôme | 30% | Immunité contre les corps adverses |
| ⭐ Invincibilité | 20% | Immunité totale (murs + corps + têtes) |

---

## Système Audio

Le son est entièrement **synthétique** via l'API Web Audio du navigateur. Aucun fichier MP3 n'est nécessaire.

### Répartition des sons

| Son | Où ? | Déclencheur |
|-----|------|-------------|
| Pop (orbe) | 📱 Smartphone du joueur | Orbe collecté |
| Ding (pièce) | 📱 Smartphone du joueur | Pièce collectée |
| Fanfare (coffre) | 📱 Smartphone du joueur | Coffre ouvert |
| Mort dramatique | 📱 Smartphone du joueur | Mort du joueur |
| Bip countdown | 🖥️ Arène (tous) | Chaque seconde du décompte |
| Musique d'ambiance | 🖥️ Arène (tous) | Début de partie |
| Fanfare de victoire | 🖥️ Arène (tous) | Fin de partie |

### Note iOS Safari

Sur iPhone, l'API Web Audio exige un déverrouillage **synchrone dans le geste utilisateur**. Le code appelle `AudioManager.unlock()` comme **toute première instruction** du handler de clic, avant tout `await`, pour contourner cette restriction.

---

## Guide de la Démo

### Scénario recommandé (10 minutes)

1. **Avant la présentation :** Ouvrir `arena.html` sur le PC de démo (ou le projeter). Attendre que Render soit réveillé si nécessaire.

2. **Connexion des joueurs :** Distribuer l'URL `https://emoji-slither.onrender.com/controller.html` aux participants (QR Code recommandé). Chacun lit les règles, choisit son emoji et son pseudo.

3. **Lancement :** Appuyer sur "LANCER LA PARTIE" sur l'arène → décompte 5s → GO !

4. **Pendant la partie :** Montrer le leaderboard en temps réel, les coffres, les bonus actifs sur les manettes.

5. **Fin de partie :** La fanfare retentit, le gagnant est affiché. La partie repart automatiquement.

### QR Code pour la démo

Générer un QR Code pointant vers :
```
https://emoji-slither.onrender.com/controller.html
```

Via un service gratuit comme [qr-code-generator.com](https://www.qr-code-generator.com/) ou [qrcode.show](https://qrcode.show/).
