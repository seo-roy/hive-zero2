const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const stageSelectOverlay = document.getElementById('stage-select-overlay');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreEl = document.getElementById('score-val');
const waveEl = document.getElementById('wave-val');
const ammoEl = document.getElementById('ammo-val');
const hpBar = document.getElementById('hp-bar');
const staminaBar = document.getElementById('stamina-bar');

let WIDTH, HEIGHT;

const ASSETS = {
    hero: new Image(), grunt: new Image(), wasp: new Image(),
    beast: new Image(), item_hp: new Image(), item_gun: new Image(),
    healer: new Image(), worm: new Image(), monsterbig: new Image(),
    electric: new Image(), lighting: new Image(), invincibility: new Image(),
    shotgun: new Image(),
    spaceBg: new Image(),
    stageTile1: new Image(), stageTile3: new Image(), stageTile5: new Image(),
    stageTile7: new Image(), stageTile8: new Image(),
    pixelHouse: new Image(), pixelTank: new Image(), pixelHeli: new Image(),
    pixelWarning: new Image(), pixelArmored: new Image(), pixelSpider: new Image(),
    chest: new Image()
};
ASSETS.hero.src = 'hero.png';
ASSETS.spaceBg.src = 'space_bg.png';
ASSETS.stageTile1.src = 'Stage Tile Lv. 1 (House).png';
ASSETS.stageTile3.src = 'Stage Tile Lv. 3 (Squad).png';
ASSETS.stageTile5.src = 'Stage Tile Lv. 5 (Helicopter).png';
ASSETS.stageTile7.src = 'Stage Tile Lv. 7 (Armored).png';
ASSETS.stageTile8.src = 'Stage Tile Lv. 8 (Warning).png';
ASSETS.pixelHouse.src = 'Pixel Icon_ House.png';
ASSETS.pixelTank.src = 'Pixel Icon_ Tank_Vehicle.png';
ASSETS.pixelHeli.src = 'Pixel Icon_ Helicopter.png';
ASSETS.pixelWarning.src = 'Pixel Icon_ Warning Sign.png';
ASSETS.pixelArmored.src = 'Pixel Icon_ Armored Figure.png';
ASSETS.pixelSpider.src = 'Pixel Icon_ Mechanical Spider.png';
ASSETS.chest.src = 'Advanced_Chest__Open.png';
ASSETS.grunt.src = 'grunt.png';
ASSETS.wasp.src = 'wasp.png';
ASSETS.beast.src = 'beast.png';
ASSETS.item_hp.src = 'item_hp.png';
ASSETS.item_gun.src = 'item_gun.png';
ASSETS.healer.src = 'healer.png';
ASSETS.worm.src = 'worm.png';
ASSETS.monsterbig.src = 'monsterbig.png';
ASSETS.electric.src = 'electric.png';
ASSETS.lighting.src = 'lighting.png';
ASSETS.invincibility.src = 'Invincibility.png';
ASSETS.shotgun.src = 'shotgun.png';

let persistent = {
    coins: 0, highScore: 0, highWave: 0, totalKills: 0, gamesPlayed: 0,
    upgrades: { maxHp: 0, damage: 0, speed: 0, luck: 0 }
};

function loadPersistent() {
    try {
        const saved = localStorage.getItem('hiveZeroSave');
        if (saved) persistent = { ...persistent, ...JSON.parse(saved) };
    } catch (e) {}
}

function savePersistent() {
    try { localStorage.setItem('hiveZeroSave', JSON.stringify(persistent)); } catch (e) {}
}

const WEAPONS = {
    rifle: { name: 'RIFLE', fireRate: 0.15, damage: 10, ammo: 30, spread: 0.05, projectiles: 1, speed: 1500, size: 4, color: '#0ff' },
    shotgun: { name: 'SHOTGUN', fireRate: 0.6, damage: 8, ammo: 8, spread: 0.3, projectiles: 6, speed: 1200, size: 5, color: '#ff0' },
    laser: { name: 'LASER', fireRate: 0.12, damage: 1, ammo: 100, spread: 0.02, projectiles: 1, speed: 1800, size: 2, color: '#f0f' },
    rocket: { name: 'ROCKET', fireRate: 1.0, damage: 120, ammo: 6, spread: 0, projectiles: 1, speed: 700, size: 14, color: '#f80', explosive: true, explosionRadius: 180 }
};

const BASE_COIN = 4;
const BOSS_COIN_MULT = 3;
const TREASURE_COIN_MULT = 5;
const REVIVE_COIN_COST = 25;

const UPGRADES = [
    { id: 'hp_boost', name: 'VITALITY', desc: '+30 Max HP', icon: 'hp', cost: 12, apply: () => { game.squad.forEach(s => { s.maxHp += 30; s.hp = s.maxHp; }); hpBar.style.width = '100%'; }},
    { id: 'damage', name: 'FIREPOWER', desc: '+25% Damage', icon: 'gun', cost: 18, apply: () => { game.squad.forEach(s => s.bulletDamage *= 1.25); }},
    { id: 'fire_rate', name: 'RAPIDFIRE', desc: '+20% Fire Rate', icon: 'gun', cost: 16, apply: () => { game.squad.forEach(s => s.fireRate *= 0.8); }},
    { id: 'ammo', name: 'DEEP POCKETS', desc: '+50% Ammo', icon: 'gun', cost: 14, apply: () => { game.squad.forEach(s => { s.maxAmmo = Math.floor(s.maxAmmo * 1.5); s.ammo = s.maxAmmo; }); }},
    { id: 'speed', name: 'SWIFT', desc: '+15% Speed', icon: 'hero', cost: 10, apply: () => { game.squad.forEach(s => { s.speed *= 1.15; if (s.baseSpeed) s.speed = Math.min(s.speed, s.baseSpeed * 2); }); }},
    { id: 'movement_speed', name: 'AGILITY', desc: '+25% Movement Speed', icon: 'hero', cost: 14, apply: () => { game.squad.forEach(s => { s.speed *= 1.25; if (s.baseSpeed) s.speed = Math.min(s.speed, s.baseSpeed * 2); }); }},
    { id: 'regen', name: 'REGENERATION', desc: 'Slow HP Regen', icon: 'hp', cost: 22, apply: () => { game.squad.forEach(s => s.hasRegen = true); }},
    { id: 'piercing', name: 'PIERCING', desc: 'Bullets Pierce', icon: 'gun', cost: 28, apply: () => { game.squad.forEach(s => s.piercing = (s.piercing || 0) + 1); }},
    { id: 'shotgun', name: 'SHOTGUN', desc: 'Spread Weapon', icon: 'gun', cost: 32, apply: () => { game.squad.forEach(s => s.setWeapon('shotgun')); }},
    { id: 'laser', name: 'LASER GUN', desc: 'Rapid Fire', icon: 'gun', cost: 30, apply: () => { game.squad.forEach(s => s.setWeapon('laser')); }},
    { id: 'rocket', name: 'ROCKET', desc: 'Explosive', icon: 'gun', cost: 45, apply: () => { game.squad.forEach(s => s.setWeapon('rocket')); }},
    { id: 'crit', name: 'CRITICAL', desc: '+15% Crit', icon: 'gun', cost: 20, apply: () => { game.squad.forEach(s => s.critChance = (s.critChance || 0.05) + 0.15); }},
    { id: 'magnet', name: 'MAGNET', desc: 'Attract Loot', icon: 'hp', cost: 18, apply: () => { game.lootMagnet = (game.lootMagnet || 100) + 150; }}
];

let game = {
    active: false, over: false, paused: false,
    lastTime: 0, time: 0,
    camera: { x: 0, y: 0 },
    score: 0, wave: 1, enemiesSpawned: 0, coins: 0,
    state: 'COMBAT', shake: 0, spawnTimer: 0,
    entities: [], squad: [], projectiles: [],
    skillEffects: [], particles: [], loots: [],
    damageNumbers: [], muzzleFlashes: [], footprints: [],
    environmentObjects: [], waveDrops: [],
    upgradeChoices: [], showUpgradeUI: false, invalidUpgradeMessage: '', invalidUpgradeMessageTimer: 0,
    showStageSelect: false, stageLevel: 1,
    clearedStages: [], currentStageId: 0, currentStageVariant: 'normal',
    treasureChestSpawned: false, treasureCollected: false,
    objectiveActive: false, objectiveSpawned: false, objectiveInteractTimer: 0,
    objectiveX: 0, objectiveY: 0, objectiveW: 60, objectiveH: 50,
    invalidStageMessage: '', invalidStageMessageTimer: 0,
    combo: 0, comboTimer: 0, maxCombo: 0,
    lootMagnet: 100, warnings: [], killsThisWave: 0,
    difficulty: 1.0, extraLives: 0, lastCoinRevive: null, stageSelectLastTap: null
};

// 스테이지 맵: id, x, y (비율 0~1), level, icon, adjacent(인접 노드 id 배열)
// 규칙 1: 가장 왼쪽(id 0)이 시작 스테이지. 규칙 2: 클리어한 스테이지에 인접한 스테이지만 선택 가능.
const STAGE_MAP_NODES = [
    { id: 0, x: 0.06, y: 0.5, level: 1, icon: 'home', adjacent: [1, 2] },
    { id: 1, x: 0.14, y: 0.35, level: 2, icon: 'grunt', adjacent: [3, 4] },
    { id: 2, x: 0.14, y: 0.65, level: 2, icon: 'robot', adjacent: [4, 5] },
    { id: 3, x: 0.22, y: 0.25, level: 3, icon: 'rock', adjacent: [6, 7] },
    { id: 4, x: 0.22, y: 0.5, level: 3, icon: 'tower', adjacent: [7, 8] },
    { id: 5, x: 0.22, y: 0.75, level: 3, icon: 'grunt', adjacent: [8, 9] },
    { id: 6, x: 0.30, y: 0.18, level: 4, icon: 'tank', adjacent: [10, 11] },
    { id: 7, x: 0.30, y: 0.42, level: 4, icon: 'console', adjacent: [11, 12] },
    { id: 8, x: 0.30, y: 0.58, level: 4, icon: 'robot', adjacent: [12, 13] },
    { id: 9, x: 0.30, y: 0.82, level: 4, icon: 'rock', adjacent: [13, 14] },
    { id: 10, x: 0.38, y: 0.12, level: 5, icon: 'heli', adjacent: [15, 16] },
    { id: 11, x: 0.38, y: 0.32, level: 5, icon: 'tower', adjacent: [16, 17] },
    { id: 12, x: 0.38, y: 0.5, level: 5, icon: 'console', adjacent: [17, 18] },
    { id: 13, x: 0.38, y: 0.68, level: 5, icon: 'rock', adjacent: [18, 19] },
    { id: 14, x: 0.38, y: 0.88, level: 5, icon: 'grunt', adjacent: [19, 20] },
    { id: 15, x: 0.46, y: 0.08, level: 6, icon: 'warning', adjacent: [21, 22] },
    { id: 16, x: 0.46, y: 0.24, level: 6, icon: 'tank', adjacent: [22, 23] },
    { id: 17, x: 0.46, y: 0.42, level: 6, icon: 'robot', adjacent: [23, 24] },
    { id: 18, x: 0.46, y: 0.58, level: 6, icon: 'console', adjacent: [24, 25] },
    { id: 19, x: 0.46, y: 0.76, level: 6, icon: 'tower', adjacent: [25, 26] },
    { id: 20, x: 0.46, y: 0.92, level: 6, icon: 'rock', adjacent: [26, 27] },
    { id: 21, x: 0.54, y: 0.04, level: 7, icon: 'boss', adjacent: [28] },
    { id: 22, x: 0.54, y: 0.18, level: 7, icon: 'warning', adjacent: [28, 29] },
    { id: 23, x: 0.54, y: 0.34, level: 7, icon: 'heli', adjacent: [29, 30] },
    { id: 24, x: 0.54, y: 0.5, level: 7, icon: 'console', adjacent: [30, 31] },
    { id: 25, x: 0.54, y: 0.66, level: 7, icon: 'tank', adjacent: [31, 32] },
    { id: 26, x: 0.54, y: 0.82, level: 7, icon: 'robot', adjacent: [32, 33] },
    { id: 27, x: 0.54, y: 0.96, level: 7, icon: 'rock', adjacent: [33] },
    { id: 28, x: 0.62, y: 0.12, level: 8, icon: 'warning', adjacent: [34, 35] },
    { id: 29, x: 0.62, y: 0.28, level: 8, icon: 'tower', adjacent: [35, 36] },
    { id: 30, x: 0.62, y: 0.44, level: 8, icon: 'console', adjacent: [36, 37] },
    { id: 31, x: 0.62, y: 0.56, level: 8, icon: 'robot', adjacent: [37, 38] },
    { id: 32, x: 0.62, y: 0.72, level: 8, icon: 'tank', adjacent: [38, 39] },
    { id: 33, x: 0.62, y: 0.88, level: 8, icon: 'warning', adjacent: [39] },
    { id: 34, x: 0.70, y: 0.08, level: 9, icon: 'boss', adjacent: [40] },
    { id: 35, x: 0.70, y: 0.22, level: 9, icon: 'heli', adjacent: [40, 41] },
    { id: 36, x: 0.70, y: 0.38, level: 9, icon: 'rock', adjacent: [41, 42] },
    { id: 37, x: 0.70, y: 0.5, level: 9, icon: 'console', adjacent: [42, 43] },
    { id: 38, x: 0.70, y: 0.62, level: 9, icon: 'tower', adjacent: [43, 44] },
    { id: 39, x: 0.70, y: 0.78, level: 9, icon: 'robot', adjacent: [44] },
    { id: 40, x: 0.78, y: 0.18, level: 10, icon: 'warning', adjacent: [45, 46] },
    { id: 41, x: 0.78, y: 0.32, level: 10, icon: 'tank', adjacent: [46, 47] },
    { id: 42, x: 0.78, y: 0.46, level: 10, icon: 'console', adjacent: [47, 48] },
    { id: 43, x: 0.78, y: 0.54, level: 10, icon: 'rock', adjacent: [48, 49] },
    { id: 44, x: 0.78, y: 0.68, level: 10, icon: 'grunt', adjacent: [49] },
    { id: 45, x: 0.86, y: 0.14, level: 11, icon: 'boss', adjacent: [50] },
    { id: 46, x: 0.86, y: 0.28, level: 11, icon: 'warning', adjacent: [50, 51] },
    { id: 47, x: 0.86, y: 0.42, level: 11, icon: 'heli', adjacent: [51, 52] },
    { id: 48, x: 0.86, y: 0.5, level: 11, icon: 'console', adjacent: [52, 53] },
    { id: 49, x: 0.86, y: 0.62, level: 11, icon: 'tower', adjacent: [53] },
    { id: 50, x: 0.94, y: 0.22, level: 12, icon: 'warning', adjacent: [54] },
    { id: 51, x: 0.94, y: 0.36, level: 12, icon: 'robot', adjacent: [54, 55] },
    { id: 52, x: 0.94, y: 0.48, level: 12, icon: 'rock', adjacent: [55, 56] },
    { id: 53, x: 0.94, y: 0.58, level: 12, icon: 'boss', adjacent: [56] },
    { id: 54, x: 0.98, y: 0.32, level: 12, icon: 'boss', adjacent: [] },
    { id: 55, x: 0.98, y: 0.44, level: 12, icon: 'warning', adjacent: [] },
    { id: 56, x: 0.98, y: 0.52, level: 12, icon: 'boss', adjacent: [] }
];

function getStageMapNodes() { return STAGE_MAP_NODES; }

function getStageNodeScreenPos(n) {
    if (!WIDTH || !HEIGHT || WIDTH < 100 || HEIGHT < 100) {
        return { x: 0.5, y: 0.5 };
    }
    const totalRows = 12;
    const maxCols = 8;
    const mapPad = 16;
    const headerH = isMobile ? 52 : 64;
    const footerH = 40;
    const mapLeft = mapPad;
    const mapTop = headerH + mapPad;
    const mapWidth = Math.max(1, WIDTH - mapPad * 2);
    const mapHeight = Math.max(1, HEIGHT - headerH - mapPad * 2 - footerH);
    const row = Math.min(totalRows - 1, n.level - 1);
    const rowNodes = STAGE_MAP_NODES.filter(m => m.level === n.level).sort((a, b) => a.id - b.id);
    const col = rowNodes.findIndex(m => m.id === n.id);
    if (col < 0) return { x: 0.5, y: 0.5 };
    const rowLen = rowNodes.length;
    const offset = (maxCols - rowLen) / 2;
    const pixelX = mapLeft + (offset + col + 0.5) / maxCols * mapWidth;
    const pixelY = mapTop + (row + 0.5) / totalRows * mapHeight;
    return { x: Math.max(0, Math.min(1, pixelX / WIDTH)), y: Math.max(0, Math.min(1, pixelY / HEIGHT)) };
}

function getSelectableStageIds() {
    const cleared = game.clearedStages || [];
    const set = new Set(cleared);
    const selectable = new Set();
    if (cleared.length === 0) {
        selectable.add(0);
        return selectable;
    }
    cleared.forEach(id => {
        const node = STAGE_MAP_NODES.find(n => n.id === id);
        if (node && node.adjacent) node.adjacent.forEach(adjId => { if (!set.has(adjId)) selectable.add(adjId); });
    });
    return selectable;
}

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

if (isMobile) document.body.classList.add('mobile');
else document.body.classList.add('desktop');

let debugText = '';

const Input = {
    keys: {}, mouse: { x: 0, y: 0, down: false }, lastMove: 0,
    touch: { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dirX: 0, dirY: 0 },
    
    init() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && game.active && !game.paused) {
                const leader = game.squad.find(p => p.isLeader);
                if (leader) leader.dash();
            }
            if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
                if (game.showUpgradeUI) selectUpgrade(parseInt(e.code.slice(-1)) - 1);
            }
            if (e.code === 'Digit4' || e.code === 'KeyS') {
                if (game.showUpgradeUI) selectUpgrade(3);
            }
            if (e.code === 'KeyM') game.showMinimap = !game.showMinimap;
            if (e.code === 'Escape' && game.active) game.paused = !game.paused;
            // 디버그: H키로 힐러 추가, T키로 테스트 몬스터 스폰
            if (e.code === 'KeyH' && game.active && !game.paused) {
                const leader = game.squad[0];
                if (leader) {
                    const healer = new Player(leader.x + 50, leader.y, false, leader);
                    healer.skillType = 'HEAL';
                    healer.bulletDamage = leader.bulletDamage;
                    healer.maxHp = leader.maxHp;
                    healer.hp = healer.maxHp;
                    game.squad.push(healer);
                }
            }
            if (e.code === 'KeyT' && game.active && !game.paused) {
                const leader = game.squad[0];
                if (leader) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 200;
                    const types = ['worm', 'titan', 'electric'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    const e = new Enemy(leader.x + Math.cos(angle) * dist, leader.y + Math.sin(angle) * dist, type);
                    game.entities.push(e);
                }
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.code === 'KeyR') game.squad.forEach(p => p.reload());
        });

        canvas.addEventListener('mousemove', e => {
            const r = canvas.getBoundingClientRect();
            const scaleX = (r.width > 0) ? canvas.width / r.width : 1;
            const scaleY = (r.height > 0) ? canvas.height / r.height : 1;
            this.mouse.x = (e.clientX - r.left) * scaleX;
            this.mouse.y = (e.clientY - r.top) * scaleY;
            this.lastMove = performance.now();
        });
        const handleCanvasClick = (clientX, clientY) => {
            const r = canvas.getBoundingClientRect();
            const scaleX = (r.width > 0) ? canvas.width / r.width : 1;
            const scaleY = (r.height > 0) ? canvas.height / r.height : 1;
            const cx = (clientX - r.left) * scaleX;
            const cy = (clientY - r.top) * scaleY;
            if (game.showUpgradeUI) {
                const choice = getUpgradeChoiceAt(cx, cy);
                if (choice !== -1) selectUpgrade(choice);
            } else if (game.showStageSelect) {
                const hit = getStageNodeAt(cx, cy);
                if (hit) selectStage(hit.node);
            }
        };
        canvas.addEventListener('mousedown', e => {
            this.mouse.down = true;
            handleCanvasClick(e.clientX, e.clientY);
        });
        canvas.addEventListener('click', e => {
            handleCanvasClick(e.clientX, e.clientY);
        });
        canvas.addEventListener('mouseup', () => { this.mouse.down = false; });
        this.initTouch();
    },

    initTouch() {
        const self = this;
        const maxJoyDist = 60;
        
        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scaleX = (rect.width > 0) ? canvas.width / rect.width : 1;
            const scaleY = (rect.height > 0) ? canvas.height / rect.height : 1;
            const canvasX = (touch.clientX - rect.left) * scaleX;
            const canvasY = (touch.clientY - rect.top) * scaleY;
            
            if (game.showUpgradeUI) {
                const choice = getUpgradeChoiceAt(canvasX, canvasY);
                if (choice !== -1) { selectUpgrade(choice); return; }
            }
            if (game.showStageSelect) {
                game.stageSelectLastTap = { t: performance.now(), x: canvasX, y: canvasY, cx: canvasX, cy: canvasY };
                const hit = getStageNodeAt(canvasX, canvasY);
                if (hit) { selectStage(hit.node); return; }
            }
            if (game.paused || !game.active) return;
            
            self.touch.active = true;
            self.touch.startX = canvasX;
            self.touch.startY = canvasY;
            self.touch.currentX = canvasX;
            self.touch.currentY = canvasY;
            self.touch.dirX = 0;
            self.touch.dirY = 0;
        }, { passive: false });
        
        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (!self.touch.active || game.paused || !game.active) return;
            
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scaleX = (rect.width > 0) ? canvas.width / rect.width : 1;
            const scaleY = (rect.height > 0) ? canvas.height / rect.height : 1;
            const canvasX = (touch.clientX - rect.left) * scaleX;
            const canvasY = (touch.clientY - rect.top) * scaleY;
            
            self.touch.currentX = canvasX;
            self.touch.currentY = canvasY;
            
            const dx = canvasX - self.touch.startX;
            const dy = canvasY - self.touch.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                const factor = Math.min(dist, maxJoyDist) / maxJoyDist;
                self.touch.dirX = (dx / dist) * factor;
                self.touch.dirY = (dy / dist) * factor;
            } else {
                self.touch.dirX = 0;
                self.touch.dirY = 0;
            }
        }, { passive: false });
        
        canvas.addEventListener('touchend', function(e) {
            e.preventDefault();
            self.touch.active = false;
            self.touch.dirX = 0;
            self.touch.dirY = 0;
        }, { passive: false });
        
        canvas.addEventListener('touchcancel', function(e) {
            self.touch.active = false;
            self.touch.dirX = 0;
            self.touch.dirY = 0;
        }, { passive: false });

        const btnDash = document.getElementById('btn-dash');
        const btnReload = document.getElementById('btn-reload');
        const btnPause = document.getElementById('btn-pause');

        if (btnDash) {
            btnDash.addEventListener('touchstart', function(e) {
                e.preventDefault(); e.stopPropagation();
                const leader = game.squad.find(p => p.isLeader);
                if (leader && game.active && !game.paused) leader.dash();
            }, { passive: false });
        }

        if (btnReload) {
            btnReload.addEventListener('touchstart', function(e) {
                e.preventDefault(); e.stopPropagation();
                game.squad.forEach(p => p.reload());
            }, { passive: false });
        }

        if (btnPause) {
            btnPause.addEventListener('touchstart', function(e) {
                e.preventDefault(); e.stopPropagation();
                if (game.active) game.paused = !game.paused;
            }, { passive: false });
        }

        document.addEventListener('gesturestart', e => e.preventDefault());
    },

    getMoveDirection() {
        if (this.touch.active) return { x: this.touch.dirX, y: this.touch.dirY, active: true };
        return { x: 0, y: 0, active: false };
    }
};

class Warning {
    constructor(x, y, type = 'enemy') {
        this.x = x; this.y = y; this.type = type;
        this.life = 1.5; this.maxLife = 1.5;
    }
    update(dt) { this.life -= dt; }
    draw(ctx) {
        const alpha = (Math.sin(game.time * 15) + 1) / 2;
        const screenX = this.x - game.camera.x;
        const screenY = this.y - game.camera.y;
        const margin = 50;
        const clampedX = Math.max(margin, Math.min(WIDTH - margin, screenX));
        const clampedY = Math.max(margin, Math.min(HEIGHT - margin, screenY));
        
        if (screenX < 0 || screenX > WIDTH || screenY < 0 || screenY > HEIGHT) {
            ctx.save();
            ctx.translate(clampedX, clampedY);
            ctx.rotate(Math.atan2(screenY - clampedY, screenX - clampedX));
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(15, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
}

class Entity {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.vx = 0; this.vy = 0;
        this.dead = false; this.hp = 100; this.maxHp = 100;
        this.facingRight = true;
    }
    applyGravity(dt) { this.x += this.vx * dt; this.y += this.vy * dt; }
}

// 고정 배경에 맞춘 크기 (화면 비율에 맞게 축소)
const ENTITY_SCALE = 0.72;

class Player extends Entity {
    constructor(x, y, isLeader = false, followTarget = null) {
        const scale = (isMobile ? 0.6 : 1) * ENTITY_SCALE;
        super(x, y, 60 * scale, 90 * scale);
        this.isLeader = isLeader;
        this.followTarget = followTarget;
        const baseSpeed = 200;
        this.speed = baseSpeed * (1 + persistent.upgrades.speed * 0.03);
        this.baseSpeed = baseSpeed; // 기본 속도 저장 (최대 2배 제한용)
        this.scale = scale;
        this.weapon = 'rifle';
        this.fireRate = WEAPONS.rifle.fireRate;
        this.bulletDamage = WEAPONS.rifle.damage * (1 + persistent.upgrades.damage * 0.05);
        this.ammo = WEAPONS.rifle.ammo;
        this.maxAmmo = WEAPONS.rifle.ammo;
        this.maxHp = 100 + persistent.upgrades.maxHp * 10;
        this.hp = this.maxHp;
        this.reloading = false;
        this.lastShot = 0;
        this.skillType = null;
        this.skillTimer = 0;
        this.skillCooldown = 1.0;
        this.skillLevel = 1;
        this.skillTimer = 0;
        this.footprintTimer = 0;
        this.dashCooldown = 1.5;
        this.dashTimer = 0;
        this.isDashing = false;
        this.dashDuration = 0.15;
        this.dashSpeed = 800;
        this.dashDir = { x: 0, y: 0 };
        this.hasRegen = false;
        this.piercing = 0;
        this.critChance = 0.05;
        this.invulnerable = 0;
        this.invulnerableTimer = 0; // 무적물약 타이머
        
        // 부드러운 움직임을 위한 변수
        this.targetVx = 0;
        this.targetVy = 0;
        
        // 새로운 CD 게이지 시스템 (Rage 게이지)
        this.rageGauge = 0; // 0에서 시작
        this.maxRageGauge = 100;
        this.rageMode = false; // 강력한 공격 모드
        this.rageModeTimer = 0; // 강력한 공격 모드 지속 시간
        this.lastDamageTime = 0; // 마지막으로 데미지를 받은 시간
        this.rageDamageMultiplier = 2.5; // 강력한 공격 모드 데미지 배수
    }

    setWeapon(weaponId) {
        const w = WEAPONS[weaponId];
        if (!w) return;
        this.weapon = weaponId;
        this.fireRate = w.fireRate;
        this.maxAmmo = w.ammo;
        this.ammo = w.ammo;
    }

    dash() {
        if (this.dashTimer > 0 || this.isDashing) return;
        
        let dx, dy;
        const moveDir = Input.getMoveDirection();
        if (moveDir.active && (Math.abs(moveDir.x) > 0.1 || Math.abs(moveDir.y) > 0.1)) {
            dx = moveDir.x; dy = moveDir.y;
        } else {
            const nearest = this.getNearestEnemy();
            if (nearest) { dx = this.x - nearest.x; dy = this.y - nearest.y; }
            else if (!isMobile) {
                dx = Input.mouse.x + game.camera.x - (this.x + this.w / 2);
                dy = Input.mouse.y + game.camera.y - (this.y + this.h / 2);
            } else { dx = this.facingRight ? 1 : -1; dy = 0; }
        }
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            this.dashDir = { x: dx / dist, y: dy / dist };
            this.isDashing = true;
            this.dashDurationTimer = this.dashDuration;
            this.invulnerable = this.dashDuration + 0.1;
            game.shake = 8;
            for (let i = 0; i < 10; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#0ff'));
        }
    }

    update(dt) {
        if (this.dead) return;

        if (this.isDashing) {
            this.vx = this.dashDir.x * this.dashSpeed;
            this.vy = this.dashDir.y * this.dashSpeed;
            this.dashDurationTimer -= dt;
            if (this.dashDurationTimer <= 0) {
                this.isDashing = false;
                this.dashTimer = this.dashCooldown;
            }
        } else {
            this.dashTimer = Math.max(0, this.dashTimer - dt);
            
            if (this.isLeader) {
                const moveDir = Input.getMoveDirection();
                
                if (moveDir.active && (Math.abs(moveDir.x) > 0.1 || Math.abs(moveDir.y) > 0.1)) {
                    this.targetVx = moveDir.x * this.speed;
                    this.targetVy = moveDir.y * this.speed;
                    if (Math.abs(moveDir.x) > 0.1) this.facingRight = moveDir.x > 0;
                } else if (!isMobile) {
                    const targetX = Input.mouse.x + game.camera.x;
                    const targetY = Input.mouse.y + game.camera.y;
                    const dx = targetX - (this.x + this.w / 2);
                    const dy = targetY - (this.y + this.h / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const isMouseMoving = (performance.now() - Input.lastMove) < 500; // 감지 시간 증가
                    if (dist > 5 && isMouseMoving) { // 거리 임계값 감소
                        this.targetVx = (dx / dist) * this.speed;
                        this.targetVy = (dy / dist) * this.speed;
                        this.facingRight = (dx > 0);
                    } else { 
                        // 멈출 때도 부드럽게
                        this.targetVx *= 0.9;
                        this.targetVy *= 0.9;
                    }
                } else { this.targetVx = 0; this.targetVy = 0; }
                
                // 즉각적이고 부드러운 움직임 (lerpFactor를 매우 높게)
                const lerpFactor = 25.0; // 즉각적인 반응
                this.vx += (this.targetVx - this.vx) * Math.min(1, lerpFactor * dt);
                this.vy += (this.targetVy - this.vy) * Math.min(1, lerpFactor * dt);
            } else {
                // 팔로워 캐릭터: 체인 형태로 바로 앞 멤버만 따라감 (겹침 방지)
                let target = null;
                const myIdx = game.squad.indexOf(this);
                const frontMember = myIdx > 0 ? game.squad[myIdx - 1] : null;
                
                if (frontMember && !frontMember.dead) {
                    target = frontMember;
                    this.followTarget = frontMember;
                } else if (this.followTarget && !this.followTarget.dead) {
                    target = this.followTarget;
                } else {
                    // 앞 멤버가 없으면 리더를 따라감
                    const leader = game.squad.find(p => p.isLeader && !p.dead);
                    if (leader) {
                        target = leader;
                        this.followTarget = leader;
                    }
                }
                
                if (target) {
                    const dx = target.x - this.x;
                    const dy = target.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // 거리 임계값을 줄여서 더 가까이서도 따라가도록
                    const followDistance = 50;
                    if (dist > followDistance) {
                        // 타겟을 따라가기
                        this.targetVx = (dx / dist) * this.speed * 1.2;
                        this.targetVy = (dy / dist) * this.speed * 1.2;
                        this.facingRight = (dx > 0);
                    } else if (dist > 25) {
                        // 가까이 있지만 약간 멀면 천천히 따라가기
                        this.targetVx = (dx / dist) * this.speed * 0.6;
                        this.targetVy = (dy / dist) * this.speed * 0.6;
                        this.facingRight = (dx > 0);
                    } else {
                        // 매우 가까우면 멈춤
                        this.targetVx = 0;
                        this.targetVy = 0;
                    }
                    
                    // 즉각적이고 부드러운 움직임
                    const lerpFactor = 20.0;
                    this.vx += (this.targetVx - this.vx) * Math.min(1, lerpFactor * dt);
                    this.vy += (this.targetVy - this.vy) * Math.min(1, lerpFactor * dt);
                } else {
                    // 타겟이 없으면 멈춤 (하지만 다음 프레임에서 다시 찾을 것)
                    this.targetVx = 0;
                    this.targetVy = 0;
                    const lerpFactor = 20.0;
                    this.vx += (this.targetVx - this.vx) * Math.min(1, lerpFactor * dt);
                    this.vy += (this.targetVy - this.vy) * Math.min(1, lerpFactor * dt);
                }
            }
        }

        this.invulnerable = Math.max(0, this.invulnerable - dt);

        if (this.hasRegen && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 1 * dt);
            if (this.isLeader) hpBar.style.width = (this.hp / this.maxHp * 100) + '%';
        }
        
        // Rage 게이지 시스템 (리더만)
        if (this.isLeader) {
            const timeSinceLastDamage = game.time - this.lastDamageTime;
            
            // Rage 모드 중
            if (this.rageMode) {
                this.rageModeTimer -= dt;
                // 게이지가 줄어듦
                this.rageGauge = Math.max(0, this.rageGauge - (this.maxRageGauge / 10.0) * dt);
                
                if (this.rageModeTimer <= 0) {
                    this.rageMode = false;
                    this.rageGauge = 0; // 게이지 초기화
                }
            } else {
                // 공격받지 않으면 게이지 증가 (3초 후부터 증가 시작)
                if (timeSinceLastDamage > 3.0) {
                    const chargeRate = 15.0; // 초당 증가량
                    this.rageGauge = Math.min(this.maxRageGauge, this.rageGauge + chargeRate * dt);
                    
                    // 게이지가 풀로 차면 Rage 모드 활성화
                    if (this.rageGauge >= this.maxRageGauge) {
                        this.rageMode = true;
                        this.rageModeTimer = 10.0; // 10초간 지속
                        this.rageGauge = this.maxRageGauge; // 풀 상태 유지
                        game.shake = 15;
                        // 번쩍이는 효과
                        for (let i = 0; i < 30; i++) {
                            const p = new Particle(this.x + this.w/2, this.y + this.h/2, '#ff0');
                            p.vx = (Math.random() - 0.5) * 600;
                            p.vy = (Math.random() - 0.5) * 600;
                            p.life = 1.0;
                            game.particles.push(p);
                        }
                        game.damageNumbers.push(new DamageNumber(this.x + this.w/2, this.y, 'RAGE MODE!', true));
                    }
                } else {
                    // 데미지를 받으면 게이지 감소
                    this.rageGauge = Math.max(0, this.rageGauge - 30 * dt);
                }
            }
        }

        this.footprintTimer -= dt;
        if (this.footprintTimer <= 0 && (Math.abs(this.vx) > 10 || Math.abs(this.vy) > 10)) {
            game.footprints.push(new Footprint(this.x + this.w/2, this.y + this.h, Math.atan2(this.vy, this.vx)));
            this.footprintTimer = 0.3;
        }

        if (this.ammo <= 0 && !this.reloading) this.reload();

        // 화면에 보이는 적만 체크
        const hasTarget = game.entities.some(e => (e instanceof Enemy || e instanceof TreasureChest) && !e.dead && isOnScreen(e));
        // 자동 공격 (마우스 클릭 없이)
        const shouldFire = hasTarget;
        
        if (shouldFire && !this.reloading && this.ammo > 0 && !game.showUpgradeUI && !game.paused) {
            if (game.time - this.lastShot > this.fireRate) this.shoot();
        }

        if (this.reloading && game.time > this.reloadEndTime) {
            this.ammo = this.maxAmmo;
            this.reloading = false;
        }

        if (this.skillType) {
            this.skillTimer -= dt;
            // 화면에 보이는 적이 있을 때만 스킬 사용
            const hasVisibleEnemy = game.entities.some(e => (e instanceof Enemy || e instanceof TreasureChest) && !e.dead && isOnScreen(e));
            if (this.skillTimer <= 0 && (hasVisibleEnemy || this.skillType === 'HEAL')) {
                this.triggerSkill();
                this.skillTimer = (this.skillType === 'HEAL') ? 2.5 : this.skillCooldown;
            }
        }
        this.applyGravity(dt);

        // 카메라 고정 모드: 캐릭터가 화면 안에서만 이동하도록
        const margin = 15;
        if (this.x < margin) { this.x = margin; this.vx = 0; }
        if (this.x > WIDTH - this.w - margin) { this.x = WIDTH - this.w - margin; this.vx = 0; }
        if (this.y < margin) { this.y = margin; this.vy = 0; }
        if (this.y > HEIGHT - this.h - margin) { this.y = HEIGHT - this.h - margin; this.vy = 0; }
    }

    triggerSkill() {
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        if (this.skillType === 'NOVA') {
            if (game.skillEffects.some(fx => fx.type === 'NOVA' && fx.owner === this)) return;
            const nova = new SkillEffect(cx, cy, 'NOVA', this.bulletDamage * 0.2);
            nova.owner = this;
            game.skillEffects.push(nova);
        } else if (this.skillType === 'SHOCKWAVE') {
            const target = this.getNearestEnemy();
            const angle = target ? Math.atan2(target.y + target.h/2 - cy, target.x + target.w/2 - cx) : (this.facingRight ? 0 : Math.PI);
            game.skillEffects.push(new SkillEffect(cx, cy, 'SHOCKWAVE', this.bulletDamage * 0.4, angle));
        } else if (this.skillType === 'CHAINLIGHTNING') {
            // 스킬 레벨에 따라 몬스터 수 증가 (5~10개)
            const baseChains = 5;
            // 레벨 1: 5개, 레벨 2: 6개, ... 레벨 6: 10개 (최대)
            const maxChains = Math.min(10, baseChains + (this.skillLevel - 1));
            const chainDamage = this.bulletDamage * 0.6;
            // 10개 이후(레벨 6 이상) 레벨업 시 데미지 3%씩 증가
            const damageMultiplier = this.skillLevel > 6 ? 1 + (this.skillLevel - 6) * 0.03 : 1;
            
            const chainEffect = new SkillEffect(cx, cy, 'CHAINLIGHTNING', chainDamage * damageMultiplier);
            chainEffect.owner = this;
            chainEffect.maxChains = maxChains;
            chainEffect.chainRange = 700;
            game.skillEffects.push(chainEffect);
        } else if (this.skillType === 'HEAL') {
            game.squad.forEach(m => { if (!m.dead) m.hp = Math.min(m.maxHp, m.hp + 8); });
            game.skillEffects.push(new SkillEffect(cx, cy, 'HEAL', 0));
            if (game.squad[0]) hpBar.style.width = (game.squad[0].hp / game.squad[0].maxHp * 100) + '%';
        }
    }

    getNearestEnemy() {
        let nearest = null, minDist = Infinity;
        game.entities.forEach(e => {
            const isTarget = (e instanceof Enemy && !e.dead) || (e instanceof TreasureChest && !e.dead);
            if (isTarget && isOnScreen(e)) {
                const dist = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
                if (dist < minDist) { minDist = dist; nearest = e; }
            }
        });
        return nearest;
    }

    shoot() {
        const w = WEAPONS[this.weapon];
        const cx = this.x + this.w / 2, cy = this.y + this.h / 3;
        let target = this.getNearestEnemy();
        // 화면에 보이지 않으면 공격하지 않음
        if (!target || !isOnScreen(target)) return;
        
        let baseAngle = Math.atan2(target.y + target.h/2 - cy, target.x + target.w/2 - cx);

        const isCrit = Math.random() < this.critChance;
        let damage = this.bulletDamage * (isCrit ? 2 : 1);
        
        // Rage 모드일 때 데미지 배수 적용
        if (this.isLeader && this.rageMode) {
            damage *= this.rageDamageMultiplier;
        }

        for (let i = 0; i < w.projectiles; i++) {
            const spread = (Math.random() - 0.5) * w.spread * 2;
            let bulletColor = w.color;
            let bulletSize = w.size;
            // Rage 모드일 때 총알 색상과 크기 변경
            if (this.isLeader && this.rageMode) {
                bulletColor = '#ff0'; // 노란색
                bulletSize = w.size * 1.3; // 크기 증가
            }
            const p = new Projectile(cx, cy, baseAngle + spread, w.speed, damage * 0.7, true, bulletSize, bulletColor);
            p.piercing = this.piercing;
            p.isCrit = isCrit;
            if (w.explosive) p.explosive = true;
            game.projectiles.push(p);
        }

        game.muzzleFlashes.push(new MuzzleFlash(cx + Math.cos(baseAngle) * 30, cy + Math.sin(baseAngle) * 30, baseAngle));
        
        this.ammo--;
        this.lastShot = game.time;
        if (this.isLeader) {
            updateAmmoUI();
            game.shake = w.explosive ? 8 : 3;
        }
    }

    reload() {
        if (this.reloading || this.ammo === this.maxAmmo) return;
        this.reloading = true;
        this.reloadEndTime = game.time + 1.0;
    }

    takeDamage(amount) {
        if (this.invulnerable > 0) return;
        this.hp -= amount;
        this.invulnerable = 0.1;
        game.combo = 0;
        
        // Rage 게이지 시스템: 데미지를 받으면 시간 기록
        if (this.isLeader) {
            this.lastDamageTime = game.time;
        }
        
        if (this.hp <= 0 && this.isLeader) {
            this.hp = 0;
            if (game.extraLives > 0) {
                game.extraLives--;
                this.hp = this.maxHp;
                this.dead = false;
                this.invulnerable = 2.0;
                game.damageNumbers.push(new DamageNumber(this.x + this.w/2, this.y, 'EXTRA LIFE!', true));
            } else if (game.coins >= REVIVE_COIN_COST) {
                const before = game.coins;
                game.coins -= REVIVE_COIN_COST;
                game.lastCoinRevive = { spent: REVIVE_COIN_COST, before, after: game.coins };
                this.hp = 1;
                this.dead = false;
                this.invulnerable = 2.0;
            } else {
                this.dead = true;
                endGame();
            }
        } else if (this.hp <= 0) {
            this.hp = 0; this.dead = true;
        }
        if (this.isLeader) hpBar.style.width = (this.hp / this.maxHp * 100) + '%';
    }

    draw(ctx) {
        if (this.isDashing) {
            ctx.globalAlpha = 0.3;
            for (let i = 1; i <= 3; i++) {
                ctx.fillStyle = '#0ff';
                ctx.fillRect(this.x - this.dashDir.x * 20 * i, this.y - this.dashDir.y * 20 * i, this.w, this.h);
            }
            ctx.globalAlpha = 1;
        }

        if (this.invulnerable > 0 && Math.floor(game.time * 20) % 2 === 0) ctx.globalAlpha = 0.5;

        ctx.save();
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        ctx.translate(cx, cy);
        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.isLeader) {
            // Rage 모드일 때 번쩍이는 효과
            if (this.rageMode) {
                const flash = Math.sin(game.time * 20) * 0.5 + 0.5;
                ctx.shadowBlur = 50 + flash * 30;
                ctx.shadowColor = `rgba(255, ${255 * flash}, 0, 1)`;
            } else {
                ctx.shadowBlur = 30 + Math.sin(game.time * 6) * 15;
                ctx.shadowColor = '#0ff';
            }
        }

        // 스킬 타입별로 다른 이미지 사용
        let charImg = null;
        if (this.skillType === 'HEAL' && ASSETS.healer.complete && ASSETS.healer.naturalWidth > 0) {
            charImg = ASSETS.healer;
        } else if (this.skillType === 'NOVA' && ASSETS.electric.complete && ASSETS.electric.naturalWidth > 0) {
            charImg = ASSETS.electric;
        } else if (this.skillType === 'CHAINLIGHTNING' && ASSETS.lighting.complete && ASSETS.lighting.naturalWidth > 0) {
            charImg = ASSETS.lighting;
        } else if (this.skillType === 'SHOCKWAVE' && ASSETS.shotgun.complete && ASSETS.shotgun.naturalWidth > 0) {
            charImg = ASSETS.shotgun;
        } else if (ASSETS.hero.complete && ASSETS.hero.naturalWidth > 0) {
            charImg = ASSETS.hero;
        }
        
        if (charImg) {
            const imgW = 90 * this.scale, imgH = 100 * this.scale;
            ctx.drawImage(charImg, -imgW/2, -imgH/2, imgW, imgH);
        } else {
            ctx.fillStyle = this.isLeader ? '#0ff' : '#08f';
            ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
        }
        
        ctx.restore();
        ctx.globalAlpha = 1;

        if (this.skillType) {
            const colors = { NOVA: '#0ff', SHOCKWAVE: '#fff', CHAINLIGHTNING: '#aaf', HEAL: '#0f0' };
            ctx.fillStyle = colors[this.skillType] || '#fff';
            ctx.beginPath(); ctx.arc(this.x + this.w/2, this.y - 15, 5, 0, Math.PI * 2); ctx.fill();
        }

        if (this.reloading) {
            const progress = 1 - (this.reloadEndTime - game.time);
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x, this.y - 20, this.w, 6);
            ctx.fillStyle = '#0ff';
            ctx.fillRect(this.x, this.y - 20, this.w * Math.max(0, progress), 6);
        }
    }
}

class Enemy extends Entity {
    constructor(x, y, type, lootDrop = null) {
        const scale = (isMobile ? 0.6 : 1) * ENTITY_SCALE;
        super(x, y, 50 * scale, 80 * scale);
        this.type = type;
        this.lootDrop = lootDrop;
        this.state = 'CHASE';
        this.stateTimer = 0;
        this.attackTimer = 0;
        this.scale = scale;
        
        this.aiTimer = 0;
        this.flankAngle = 0;
        this.dodgeTimer = 0;
        this.dodgeDir = { x: 0, y: 0 };
        this.chargeTimer = 0;
        this.isCharging = false;
        this.zigzagPhase = Math.random() * Math.PI * 2;
        this.groupId = Math.floor(Math.random() * 3);
        this.aggressionLevel = 0.5 + Math.random() * 0.5;
        this.lastPlayerPos = { x: 0, y: 0 };
        this.predictedPos = { x: 0, y: 0 };
        
        // Worm 패턴용 변수
        if (type === 'worm') {
            this.burrowed = Math.random() > 0.5; // 시작 시 땅 속에 있을 수도 있음
            this.burrowTimer = this.burrowed ? (2.0 + Math.random() * 2.0) : (1.5 + Math.random() * 1.0);
            this.burrowCooldown = 2.0 + Math.random() * 2.0;
            this.surfacePos = { x: x, y: y };
        } else {
            this.burrowed = false;
            this.burrowTimer = undefined;
        }
        
        // Electric 패턴용 변수
        if (type === 'electric') {
            this.electricCharge = 0;
            this.electricCooldown = 3.0;
            this.electricTimer = 1.0 + Math.random() * 1.0; // 첫 공격까지 시간
        } else {
            this.electricTimer = undefined;
            this.electricCharge = 0;
        }
        
        // Titan 패턴용 변수
        if (type === 'titan') {
            this.slamTimer = 2.0 + Math.random() * 2.0; // 첫 강타까지 시간
            this.slamCooldown = 4.0;
        } else {
            this.slamTimer = undefined;
        }

        const L = game.stageLevel || 1;
        const waveBonus = 1 + (L - 1) * 0.48;
        const dmgBonus = 1 + (L - 1) * 0.18;
        
        const stats = {
            grunt: { hp: 55 * waveBonus, speed: 95 + L * 8, score: 100, coins: BASE_COIN, w: 70, h: 90, damage: (6 + L * 2) * dmgBonus },
            wasp: { hp: 35 * waveBonus, speed: 165 + L * 12, score: 150, coins: Math.floor(BASE_COIN * 1.2), w: 50, h: 50, damage: (5 + L * 1.5) * dmgBonus },
            beast: { hp: 450 * waveBonus, speed: 55 + L * 5, score: 1000, coins: Math.floor(BASE_COIN * 6), w: 150, h: 130, damage: (18 + L * 3) * dmgBonus },
            sniper: { hp: 40 * waveBonus, speed: 65 + L * 5, score: 200, coins: Math.floor(BASE_COIN * 1.5), w: 60, h: 80, damage: (14 + L * 3) * dmgBonus },
            bomber: { hp: 50 * waveBonus, speed: 145 + L * 14, score: 250, coins: Math.floor(BASE_COIN * 2), w: 50, h: 50, damage: (28 + L * 4) * dmgBonus },
            worm: { hp: 90 * waveBonus, speed: 125 + L * 10, score: 180, coins: Math.floor(BASE_COIN * 2), w: 60, h: 40, damage: (10 + L * 2.5) * dmgBonus },
            titan: { hp: 700 * waveBonus, speed: 32 + L * 2.5, score: 1500, coins: Math.floor(BASE_COIN * 8), w: 180, h: 160, damage: (28 + L * 4) * dmgBonus },
            electric: { hp: 70 * waveBonus, speed: 105 + L * 9, score: 220, coins: Math.floor(BASE_COIN * 2.2), w: 55, h: 55, damage: (12 + L * 2.5) * dmgBonus },
            boss: { hp: 1800 + L * 750, speed: 42 + L * 5, score: 5000, coins: BASE_COIN * BOSS_COIN_MULT, w: 200, h: 180, damage: (24 + L * 5) * dmgBonus }
        };

        const s = stats[type] || stats.grunt;
        this.hp = s.hp; this.maxHp = s.hp; this.speed = s.speed;
        this.score = s.score; this.coins = s.coins; this.damage = s.damage;
        this.w = s.w * scale; this.h = s.h * scale;
    }

    predictPlayerPosition(target, dt) {
        const predictionTime = 0.5;
        return {
            x: target.x + target.vx * predictionTime,
            y: target.y + target.vy * predictionTime
        };
    }

    checkIncomingBullets() {
        for (const p of game.projectiles) {
            if (!p.isPlayer) continue;
            const dx = this.x + this.w/2 - p.x;
            const dy = this.y + this.h/2 - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 300) continue;
            
            const bulletAngle = Math.atan2(p.vy, p.vx);
            const toEnemyAngle = Math.atan2(dy, dx);
            let angleDiff = Math.abs(bulletAngle - toEnemyAngle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
            
            if (angleDiff < 0.5 && dist < 150) {
                return { dodge: true, angle: bulletAngle };
            }
        }
        return { dodge: false };
    }

    update(dt) {
        if (this.dead) return;

        if (!isOnScreen(this)) {
            const cx = WIDTH / 2;
            const cy = HEIGHT / 2;
            const toCenterX = cx - (this.x + this.w / 2);
            const toCenterY = cy - (this.y + this.h / 2);
            const d = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
            const speedMult = this.type === 'boss' ? 5.5 : 1.1;
            if (d > 5) {
                this.vx = (toCenterX / d) * this.speed * speedMult;
                this.vy = (toCenterY / d) * this.speed * speedMult;
            } else {
                this.vx = 0;
                this.vy = 0;
            }
            this.facingRight = toCenterX > 0;
            this.applyGravity(dt);
            return;
        }

        let target = game.squad.find(p => !p.dead);
        let minD = Infinity;
        game.squad.forEach(p => {
            if (p.dead) return;
            const d = (p.x - this.x) ** 2 + (p.y - this.y) ** 2;
            if (d < minD) { minD = d; target = p; }
        });
        if (!target) return;

        const dx = target.x - this.x, dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / dist, dirY = dy / dist;

        this.predictedPos = this.predictPlayerPosition(target, dt);

        const bulletCheck = this.checkIncomingBullets();
        if (bulletCheck.dodge && this.dodgeTimer <= 0 && Math.random() < 0.7) {
            this.dodgeTimer = 0.3;
            const perpAngle = bulletCheck.angle + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
            this.dodgeDir = { x: Math.cos(perpAngle), y: Math.sin(perpAngle) };
        }

        if (this.dodgeTimer > 0) {
            this.dodgeTimer -= dt;
            this.vx = this.dodgeDir.x * this.speed * 2;
            this.vy = this.dodgeDir.y * this.speed * 2;
            this.applyGravity(dt);
            return;
        }

        this.aiTimer -= dt;

        if (this.type === 'grunt') {
            this.updateGruntAI(dt, target, dist, dirX, dirY);
        } else if (this.type === 'wasp') {
            this.updateWaspAI(dt, target, dist, dirX, dirY);
        } else if (this.type === 'beast') {
            this.updateBeastAI(dt, target, dist, dirX, dirY);
        } else if (this.type === 'sniper') {
            this.updateSniperAI(dt, target, dist, dirX, dirY);
        } else if (this.type === 'bomber') {
            this.updateBomberAI(dt, target, dist, dirX, dirY);
        } else if (this.type === 'worm') {
            this.updateWormAI(dt, target, dist, dirX, dirY);
        } else if (this.type === 'titan') {
            this.updateTitanAI(dt, target, dist, dirX, dirY);
        } else if (this.type === 'electric') {
            this.updateElectricAI(dt, target, dist, dirX, dirY);
        } else if (this.type === 'boss') {
            this.updateBossAI(dt, target, dist, dirX, dirY);
        }

        this.facingRight = this.vx > 0 || (this.vx === 0 && dx > 0);
        this.applyGravity(dt);

        if (this.type === 'boss' && isOnScreen(this)) {
            const margin = 15;
            if (this.x < margin) { this.x = margin; this.vx = Math.max(0, this.vx); }
            if (this.x > WIDTH - this.w - margin) { this.x = WIDTH - this.w - margin; this.vx = Math.min(0, this.vx); }
            if (this.y < margin) { this.y = margin; this.vy = Math.max(0, this.vy); }
            if (this.y > HEIGHT - this.h - margin) { this.y = HEIGHT - this.h - margin; this.vy = Math.min(0, this.vy); }
        }
    }

    updateGruntAI(dt, target, dist, dirX, dirY) {
        this.stateTimer -= dt;
        
        const nearbyGrunts = game.entities.filter(e => 
            e instanceof Enemy && e.type === 'grunt' && !e.dead && e !== this &&
            Math.sqrt((e.x - this.x)**2 + (e.y - this.y)**2) < 200
        );
        
        if (this.stateTimer <= 0) {
            this.stateTimer = 0.8 + Math.random() * 1.2;
            
            if (dist < 100) {
                this.state = 'ATTACK';
            } else if (dist < 250 && nearbyGrunts.length >= 2) {
                this.state = 'FLANK';
                this.flankAngle = (this.groupId - 1) * Math.PI / 3;
            } else if (dist > 400) {
                this.state = 'CHASE';
            } else {
                const r = Math.random();
                if (r < 0.4) this.state = 'CHARGE';
                else if (r < 0.7) this.state = 'STRAFE';
                else this.state = 'CHASE';
            }
        }

        let tx = 0, ty = 0;
        const speedMult = this.state === 'CHARGE' ? 1.8 : 1;

        if (this.state === 'CHASE' || this.state === 'CHARGE') {
            const pdx = this.predictedPos.x - this.x;
            const pdy = this.predictedPos.y - this.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            tx = pdx / pdist; ty = pdy / pdist;
        } else if (this.state === 'FLANK') {
            const flankX = target.x + Math.cos(Math.atan2(dirY, dirX) + this.flankAngle) * 150;
            const flankY = target.y + Math.sin(Math.atan2(dirY, dirX) + this.flankAngle) * 150;
            const fdx = flankX - this.x, fdy = flankY - this.y;
            const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
            tx = fdx / fdist; ty = fdy / fdist;
        } else if (this.state === 'STRAFE') {
            tx = -dirY; ty = dirX;
            if (Math.sin(game.time * 3 + this.groupId) > 0) { tx = -tx; ty = -ty; }
        } else if (this.state === 'ATTACK') {
            tx = dirX; ty = dirY;
        }

        this.vx = tx * this.speed * speedMult;
        this.vy = ty * this.speed * speedMult;

        if (dist < 70) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                target.takeDamage(this.damage);
                this.attackTimer = 0.4;
                game.shake = 5;
            }
        }
    }

    updateWaspAI(dt, target, dist, dirX, dirY) {
        this.zigzagPhase += dt * 8;
        
        if (this.state !== 'DIVE' && dist < 300 && Math.random() < 0.02) {
            this.state = 'DIVE';
            this.chargeTimer = 0.5;
        }

        if (this.state === 'DIVE') {
            this.chargeTimer -= dt;
            const pdx = this.predictedPos.x - this.x;
            const pdy = this.predictedPos.y - this.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            this.vx = (pdx / pdist) * this.speed * 2;
            this.vy = (pdy / pdist) * this.speed * 2;
            
            if (this.chargeTimer <= 0 || dist < 50) {
                this.state = 'EVADE';
                this.stateTimer = 0.8;
            }
        } else if (this.state === 'EVADE') {
            this.stateTimer -= dt;
            this.vx = -dirX * this.speed;
            this.vy = -dirY * this.speed;
            if (this.stateTimer <= 0) this.state = 'APPROACH';
        } else {
            const zigzag = Math.sin(this.zigzagPhase) * 0.8;
            const perpX = -dirY, perpY = dirX;
            this.vx = (dirX + perpX * zigzag) * this.speed;
            this.vy = (dirY + perpY * zigzag) * this.speed;
        }

        if (dist < 60) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                target.takeDamage(this.damage);
                this.attackTimer = 0.3;
                this.state = 'EVADE';
                this.stateTimer = 0.5;
            }
        }
    }

    updateBeastAI(dt, target, dist, dirX, dirY) {
        this.stateTimer -= dt;

        if (this.state !== 'CHARGE' && this.stateTimer <= 0) {
            if (dist < 400 && dist > 150) {
                this.state = 'CHARGE';
                this.chargeTimer = 0.3;
                this.isCharging = false;
                game.warnings.push(new Warning(this.x, this.y, 'charge'));
            } else if (dist <= 150) {
                this.state = 'ATTACK';
                this.stateTimer = 1;
            } else {
                this.state = 'CHASE';
                this.stateTimer = 1.5;
            }
        }

        if (this.state === 'CHARGE') {
            this.chargeTimer -= dt;
            if (this.chargeTimer > 0) {
                this.vx = dirX * this.speed * 0.2;
                this.vy = dirY * this.speed * 0.2;
            } else if (!this.isCharging) {
                this.isCharging = true;
                this.chargeDir = { x: dirX, y: dirY };
                this.chargeTimer = 1.5;
                game.shake = 8;
            } else {
                this.vx = this.chargeDir.x * this.speed * 3;
                this.vy = this.chargeDir.y * this.speed * 3;
                this.chargeTimer -= dt;
                
                if (dist < 80) {
                    target.takeDamage(this.damage * 1.5);
                    this.state = 'RECOVER';
                    this.stateTimer = 1.5;
                }
                
                if (this.chargeTimer <= 0) {
                    this.state = 'RECOVER';
                    this.stateTimer = 1.2;
                }
            }
        } else if (this.state === 'RECOVER') {
            this.vx *= 0.9;
            this.vy *= 0.9;
        } else if (this.state === 'ATTACK') {
            this.vx = dirX * this.speed;
            this.vy = dirY * this.speed;
            if (dist < 100) {
                this.attackTimer -= dt;
                if (this.attackTimer <= 0) {
                    target.takeDamage(this.damage);
                    this.attackTimer = 0.8;
                    game.shake = 10;
                }
            }
        } else {
            this.vx = dirX * this.speed;
            this.vy = dirY * this.speed;
        }
    }

    updateSniperAI(dt, target, dist, dirX, dirY) {
        const optimalDist = 350;
        
        if (dist < optimalDist - 50) {
            this.vx = -dirX * this.speed * 1.2;
            this.vy = -dirY * this.speed * 1.2;
        } else if (dist > optimalDist + 50) {
            this.vx = dirX * this.speed;
            this.vy = dirY * this.speed;
        } else {
            const strafe = Math.sin(game.time * 2) * 0.5;
            this.vx = -dirY * this.speed * strafe;
            this.vy = dirX * this.speed * strafe;
        }

        this.attackTimer -= dt;
        if (this.attackTimer <= 0 && dist < 500) {
            const bulletSpeed = 450; // 2배 느리게 (900 -> 450)
            const timeToHit = dist / bulletSpeed;
            const leadX = target.x + target.vx * timeToHit;
            const leadY = target.y + target.vy * timeToHit;
            const angle = Math.atan2(leadY - this.y - this.h/2, leadX - this.x - this.w/2);
            
            for (let i = 0; i < 2; i++) {
                setTimeout(() => {
                    if (!this.dead) {
                        game.projectiles.push(new Projectile(
                            this.x + this.w/2, this.y + this.h/2,
                            angle + (Math.random() - 0.5) * 0.1,
                            bulletSpeed, this.damage, false, 6, '#f44'
                        ));
                    }
                }, i * 100);
            }
            this.attackTimer = 1.2;
        }
    }

    updateBomberAI(dt, target, dist, dirX, dirY) {
        const speedMult = dist < 200 ? 1.5 : 1;
        
        const pdx = this.predictedPos.x - this.x;
        const pdy = this.predictedPos.y - this.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        
        this.vx = (pdx / pdist) * this.speed * speedMult;
        this.vy = (pdy / pdist) * this.speed * speedMult;
        
        if (dist < 50) this.explode();
    }

    updateWormAI(dt, target, dist, dirX, dirY) {
        // 땅 속 패턴: 땅 속에 숨었다가 나타나서 공격
        if (this.burrowTimer === undefined) {
            this.burrowed = Math.random() > 0.5;
            this.burrowTimer = this.burrowed ? (2.0 + Math.random() * 2.0) : (1.5 + Math.random() * 1.0);
        }
        this.burrowTimer -= dt;
        
        if (this.burrowed) {
            // 땅 속에 있을 때
            if (this.burrowTimer <= 0) {
                // 나타나기
                this.burrowed = false;
                // 타겟 근처로 이동
                const angle = Math.random() * Math.PI * 2;
                const spawnDist = 100 + Math.random() * 150;
                this.x = target.x + Math.cos(angle) * spawnDist;
                this.y = target.y + Math.sin(angle) * spawnDist;
                this.burrowTimer = 1.5 + Math.random() * 1.0; // 공격 시간
                game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#8b4513'));
            }
            // 땅 속에서는 이동하지 않음
            this.vx = 0;
            this.vy = 0;
        } else {
            // 지상에 있을 때
            if (this.burrowTimer <= 0) {
                // 다시 땅 속으로
                this.burrowed = true;
                this.burrowTimer = this.burrowCooldown || (2.0 + Math.random() * 2.0);
                game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#654321'));
            } else {
                // 타겟을 향해 빠르게 이동
                this.vx = dirX * this.speed * 1.5;
                this.vy = dirY * this.speed * 1.5;
                
                // 근접 공격
                if (dist < 60) {
                    if (this.attackTimer === undefined) this.attackTimer = 0;
                    this.attackTimer -= dt;
                    if (this.attackTimer <= 0) {
                        target.takeDamage(this.damage);
                        this.attackTimer = 0.4;
                        game.shake = 4;
                    }
                }
            }
        }
    }

    updateTitanAI(dt, target, dist, dirX, dirY) {
        // 느리지만 강력한 대형 몬스터
        if (this.slamTimer === undefined) this.slamTimer = 2.0;
        this.slamTimer -= dt;
        
        // 느리게 타겟을 향해 이동
        this.vx = dirX * this.speed;
        this.vy = dirY * this.speed;
        
        // 지면 강타 공격
        if (this.slamTimer <= 0 && dist < 200) {
            this.slamTimer = this.slamCooldown || 4.0;
            
            // 강타 전 경고
            game.warnings.push(new Warning(this.x + this.w/2, this.y + this.h/2, 'slam'));
            
            // 현재 위치 저장 (클로저 문제 방지)
            const self = this;
            const slamX = this.x + this.w / 2;
            const slamY = this.y + this.h / 2;
            const slamDamage = this.damage;
            const targetX = target.x;
            const targetY = target.y;
            
            setTimeout(() => {
                if (!self.dead && game.active) {
                    // 현재 거리 재계산 (타겟은 항상 리더)
                    const currentTarget = game.squad.find(p => !p.dead);
                    if (!currentTarget) return;
                    const currentDist = Math.sqrt((currentTarget.x - self.x)**2 + (currentTarget.y - self.y)**2);
                    if (currentDist < 250) {
                        // 원형 충격파 발사
                        for (let i = 0; i < 8; i++) {
                            const angle = (i / 8) * Math.PI * 2;
                            const p = new Projectile(slamX, slamY, angle, 150, slamDamage * 0.8, false, 10, '#8b4513'); // 2배 느리게
                            p.life = 1.5;
                            game.projectiles.push(p);
                        }
                        game.shake = 20;
                        
                        // 근처 플레이어에게 데미지
                        game.squad.forEach(p => {
                            if (p.dead) return;
                            const d = Math.sqrt((p.x + p.w/2 - slamX)**2 + (p.y + p.h/2 - slamY)**2);
                            if (d < 150) {
                                p.takeDamage(slamDamage * (1 - d/150));
                            }
                        });
                    }
                }
            }, 800);
        }
        
        // 근접 공격
        if (dist < 120) {
            if (this.attackTimer === undefined) this.attackTimer = 0;
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                target.takeDamage(this.damage);
                this.attackTimer = 1.2;
                game.shake = 12;
            }
        }
    }

    updateElectricAI(dt, target, dist, dirX, dirY) {
        // 전기 공격 몬스터
        if (this.electricTimer === undefined) {
            this.electricTimer = 1.0 + Math.random() * 1.0;
            this.electricCharge = 0;
        }
        this.electricTimer -= dt;
        
        // 타겟을 향해 이동
        this.vx = dirX * this.speed;
        this.vy = dirY * this.speed;
        
        // 전기 충전 효과 감소
        if (this.electricCharge > 0) {
            this.electricCharge = Math.max(0, this.electricCharge - dt * 2);
        }
        
        // 전기 공격
        if (this.electricTimer <= 0 && dist < 400) {
            this.electricTimer = this.electricCooldown || 3.0;
            this.electricCharge = 1.0;
            
            const cx = this.x + this.w / 2;
            const cy = this.y + this.h / 2;
            
            // 타겟을 향한 전기 발사
            const angle = Math.atan2(target.y + target.h/2 - cy, target.x + target.w/2 - cx);
            
            // 메인 전기 볼트
            const mainBolt = new Projectile(cx, cy, angle, 400, this.damage, false, 8, '#ffff00'); // 2배 느리게
            mainBolt.life = 2.0;
            game.projectiles.push(mainBolt);
            
            // 주변 전기 스파크
            for (let i = 0; i < 3; i++) {
                const spread = (Math.random() - 0.5) * 0.3;
                const spark = new Projectile(cx, cy, angle + spread, 300, this.damage * 0.5, false, 5, '#00ffff'); // 2배 느리게
                spark.life = 1.5;
                game.projectiles.push(spark);
            }
            
            // 전기 이펙트 파티클
            for (let i = 0; i < 10; i++) {
                const p = new Particle(cx, cy, '#ffff00');
                p.vx = (Math.random() - 0.5) * 300;
                p.vy = (Math.random() - 0.5) * 300;
                p.life = 0.3;
                game.particles.push(p);
            }
        }
        
        // 근접 공격
        if (dist < 70) {
            if (this.attackTimer === undefined) this.attackTimer = 0;
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                target.takeDamage(this.damage * 0.7);
                this.attackTimer = 0.5;
                game.shake = 3;
            }
        }
    }

    updateBossAI(dt, target, dist, dirX, dirY) {
        this.stateTimer -= dt;
        this.attackTimer -= dt;
        
        if (this.stateTimer <= 0) {
            this.stateTimer = 2 + Math.random() * 2;
            const r = Math.random();
            if (r < 0.25) this.state = 'CHASE';
            else if (r < 0.5) this.state = 'STRAFE';
            else if (r < 0.75) this.state = 'SUMMON';
            else this.state = 'BARRAGE';
        }

        if (this.state === 'CHASE') {
            this.vx = dirX * this.speed * 1.3;
            this.vy = dirY * this.speed * 1.3;
        } else if (this.state === 'STRAFE') {
            this.vx = -dirY * this.speed;
            this.vy = dirX * this.speed;
        } else if (this.state === 'SUMMON' || this.state === 'BARRAGE') {
            this.vx *= 0.95;
            this.vy *= 0.95;
        }

        if (dist < 120) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                target.takeDamage(this.damage);
                this.attackTimer = 0.6;
                game.shake = 15;
            }
        }

        if (this.attackTimer <= 0) {
            this.bossAttack(target);
            this.attackTimer = 1.0 + Math.random() * 0.5;
        }
    }

    explode() {
        if (this.exploded) return;
        this.exploded = true; this.dead = true;
        game.shake = 15;
        game.squad.forEach(p => {
            if (p.dead) return;
            const d = Math.sqrt((p.x + p.w/2 - this.x - this.w/2)**2 + (p.y + p.h/2 - this.y - this.h/2)**2);
            if (d < 180) p.takeDamage(this.damage * (1 - d/180));
        });
        for (let i = 0; i < 30; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#f80'));
        game.damageNumbers.push(new DamageNumber(this.x + this.w/2, this.y, 'BOOM!', true));
    }

    bossAttack(target) {
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        const pattern = Math.floor(Math.random() * 5);
        
        const bossRef = this;
        if (pattern === 0) {
            const a = Math.atan2(target.y - cy, target.x - cx);
            for (let i = 0; i < 9; i++) {
                const p = new Projectile(cx, cy, a - 0.6 + i * 0.15, 200, 15, false, 8, '#f00');
                p.isBossProjectile = true;
                p.owner = bossRef;
                p.life = 10;
                game.projectiles.push(p);
            }
        } else if (pattern === 1) {
            for (let i = 0; i < 16; i++) {
                setTimeout(() => {
                    if (!bossRef.dead) {
                        const p = new Projectile(bossRef.x + bossRef.w/2, bossRef.y + bossRef.h/2, game.time * 5 + i * Math.PI / 8, 175, 12, false, 6, '#ff0');
                        p.isBossProjectile = true;
                        p.owner = bossRef;
                        p.life = 10;
                        game.projectiles.push(p);
                    }
                }, i * 50);
            }
        } else if (pattern === 2) {
            for (let i = 0; i < 4; i++) {
                const p = new Projectile(cx, cy, Math.atan2(target.y - cy, target.x - cx) + (i - 1.5) * 0.4, 100, 18, false, 10, '#f80');
                p.homing = true;
                p.homingStrength = 4;
                p.isBossProjectile = true;
                p.owner = bossRef;
                p.life = 10;
                game.projectiles.push(p);
            }
        } else if (pattern === 3) {
            for (let i = 0; i < 3; i++) {
                const a = Math.random() * Math.PI * 2;
                const type = Math.random() > 0.5 ? 'wasp' : 'bomber';
                game.entities.push(new Enemy(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100, type));
            }
        } else {
            for (let i = 0; i < 20; i++) {
                const p = new Projectile(cx, cy, i * Math.PI / 10, 125, 10, false, 5, '#f0f');
                p.isBossProjectile = true;
                p.owner = bossRef;
                p.life = 10;
                game.projectiles.push(p);
            }
        }
    }

    takeDamage(dmg, isCrit = false) {
        // Worm이 땅 속에 있을 때는 데미지를 받지 않음
        if (this.type === 'worm' && this.burrowed) {
            return;
        }
        
        this.hp -= dmg;
        game.damageNumbers.push(new DamageNumber(this.x + this.w/2 + (Math.random() - 0.5) * 30, this.y, dmg, isCrit));
        game.particles.push(new HitSpark(this.x + this.w/2, this.y + this.h/2, isCrit ? '#ff0' : '#fff'));

        if (this.hp <= 0) {
            this.hp = 0; this.dead = true;
            if (this.type === 'boss') {
                game.projectiles.forEach(proj => { if (proj.owner === this) proj.remove = true; });
            }
            game.score += this.score * (1 + game.combo * 0.1);
            game.coins += this.coins;
            game.combo++;
            game.comboTimer = 3.0;
            if (game.combo > game.maxCombo) game.maxCombo = game.combo;
            game.killsThisWave++;
            persistent.totalKills++;
            scoreEl.innerText = Math.floor(game.score);
            
            for (let i = 0; i < 12; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#fa0'));
            
            if (this.type === 'bomber') this.explode();
            else if (this.type === 'boss') {
                for (let i = 0; i < 3; i++) {
                    game.loots.push(new Loot(this.x + this.w/2 + (Math.random() - 0.5) * 150, this.y + this.h/2 + (Math.random() - 0.5) * 150, ['hp', 'gun', 'squad', 'invincibility'][i]));
                }
            } else if (this.lootDrop) {
                game.loots.push(new Loot(this.x + this.w/2, this.y + this.h/2, this.lootDrop));
            } else if (Math.random() < 0.025 + persistent.upgrades.luck * 0.05) {
                game.loots.push(new Loot(this.x + this.w/2, this.y + this.h/2, ['hp', 'gun'][Math.floor(Math.random() * 2)]));
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        ctx.translate(cx, cy);
        if (!this.facingRight) ctx.scale(-1, 1);

        if (this.type === 'beast' && this.state === 'CHARGE' && this.chargeTimer > 0 && !this.isCharging) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#f00';
        }

        let img = null;
        if (this.type === 'grunt') img = ASSETS.grunt;
        else if (this.type === 'wasp') img = ASSETS.wasp;
        else if (this.type === 'beast' || this.type === 'boss') img = ASSETS.beast;
        else if (this.type === 'sniper') img = ASSETS.grunt;
        else if (this.type === 'bomber') img = ASSETS.wasp;
        else if (this.type === 'worm') img = ASSETS.worm;
        else if (this.type === 'titan') img = ASSETS.monsterbig;
        else if (this.type === 'electric') img = ASSETS.electric;

        // Worm은 땅 속에 있을 때 반투명하게
        if (this.type === 'worm' && this.burrowed) {
            ctx.globalAlpha = 0.3;
        }
        
        if (img && img.complete && img.naturalWidth > 0) {
            if (this.type === 'sniper') ctx.filter = 'hue-rotate(180deg)';
            if (this.type === 'bomber') ctx.filter = 'hue-rotate(30deg) saturate(2)';
            if (this.type === 'electric') ctx.filter = 'brightness(1.3) saturate(1.5)';
            
            if (this.type === 'beast') ctx.drawImage(img, -80 * this.scale, -70 * this.scale, 160 * this.scale, 140 * this.scale);
            else if (this.type === 'boss') ctx.drawImage(img, -100 * this.scale, -90 * this.scale, 200 * this.scale, 180 * this.scale);
            else if (this.type === 'titan') ctx.drawImage(img, -90 * this.scale, -80 * this.scale, 180 * this.scale, 160 * this.scale);
            else if (this.type === 'wasp' || this.type === 'bomber' || this.type === 'electric') ctx.drawImage(img, -30 * this.scale, -30 * this.scale, 60 * this.scale, 60 * this.scale);
            else if (this.type === 'worm') ctx.drawImage(img, -35 * this.scale, -25 * this.scale, 70 * this.scale, 50 * this.scale);
            else ctx.drawImage(img, -40 * this.scale, -50 * this.scale, 80 * this.scale, 100 * this.scale);
            
            ctx.filter = 'none';
        } else {
            const colors = { grunt: '#0f0', wasp: '#ff0', beast: '#f0f', boss: '#f0f', sniper: '#a00', bomber: '#f80', worm: '#8b4513', titan: '#4a4a4a', electric: '#ffff00' };
            ctx.fillStyle = colors[this.type] || '#0f0';
            if (this.type === 'bomber' || this.type === 'electric') {
                ctx.beginPath(); ctx.arc(0, 0, this.w/2, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            }
        }
        
        // Electric 몬스터 전기 효과
        if (this.type === 'electric' && this.electricCharge > 0) {
            ctx.globalAlpha = this.electricCharge * 0.5;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffff00';
            ctx.beginPath();
            ctx.arc(0, 0, this.w/2 + 10, 0, Math.PI * 2);
            ctx.stroke();
            // electricCharge는 update 메서드에서 감소시키므로 여기서는 그리기만 함
            ctx.shadowBlur = 0;
        }
        
        ctx.globalAlpha = 1;

        ctx.shadowBlur = 0;

        if (this.type === 'boss') {
            const flash = Math.sin(game.time * 10) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(255, 0, 0, ${flash})`;
            ctx.lineWidth = 6;
            ctx.strokeRect(-this.w/2 - 3, -this.h/2 - 3, this.w + 6, this.h + 6);
        }

        if (this.lootDrop) {
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 4;
            ctx.strokeRect(-this.w/2 - 2, -this.h/2 - 2, this.w + 4, this.h + 4);
        }

        ctx.fillStyle = '#500';
        ctx.fillRect(-this.w/2, -this.h/2 - 12, this.w, 8);
        ctx.fillStyle = this.type === 'boss' ? '#f0f' : '#0f0';
        ctx.fillRect(-this.w/2, -this.h/2 - 12, this.w * Math.max(0, this.hp / this.maxHp), 8);

        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, angle, speed, damage, isPlayer, size, color) {
        this.x = x; this.y = y;
        this.lastX = x; this.lastY = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.speed = speed; this.damage = damage;
        this.isPlayer = isPlayer;
        this.size = size || 4;
        this.color = color || (isPlayer ? '#0ff' : '#f00');
        this.remove = false; this.life = 2.0;
        this.homing = false; this.homingStrength = 3;
        this.trail = [];
        this.piercing = 0; this.hitList = [];
        this.explosive = false; this.isCrit = false;
}

    update(dt) {
        this.lastX = this.x;
        this.lastY = this.y;
        this.trail.push({ x: this.x, y: this.y, life: 0.1 });
        this.trail = this.trail.filter(t => { t.life -= dt; return t.life > 0; });

        if (this.homing) {
            const targets = this.isPlayer ? game.entities.filter(e => e instanceof Enemy && !e.dead && isOnScreen(e)) : game.squad.filter(p => !p.dead && p.isLeader);
            let nearest = null, minD = Infinity;
            targets.forEach(t => { const d = (t.x - this.x)**2 + (t.y - this.y)**2; if (d < minD) { minD = d; nearest = t; } });
            if (nearest) {
                const ta = Math.atan2(nearest.y + (nearest.h||0)/2 - this.y, nearest.x + (nearest.w||0)/2 - this.x);
                let ca = Math.atan2(this.vy, this.vx);
                let diff = ta - ca;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                ca += diff * this.homingStrength * dt;
                this.vx = Math.cos(ca) * this.speed;
                this.vy = Math.sin(ca) * this.speed;
            } else {
                this.homing = false;
            }
        }
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.life -= dt;
        
        if (this.isBossProjectile) {
            const margin = 500;
            if (this.x < game.camera.x - margin || this.x > game.camera.x + WIDTH + margin ||
                this.y < game.camera.y - margin || this.y > game.camera.y + HEIGHT + margin) {
                this.remove = true;
            }
        } else if (this.life <= 0) {
            this.remove = true;
        }
    }

    draw(ctx) {
        this.trail.forEach(t => {
            ctx.globalAlpha = t.life * 5;
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(t.x, t.y, this.size * 0.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15; ctx.shadowColor = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    onHit() {
        if (this.explosive) {
            const w = WEAPONS.rocket;
            const radius = w.explosionRadius || 180;
            game.shake = 20;
            
            game.explosionFlash = 0.15;
            
            game.entities.forEach(e => {
                if (e.dead || this.hitList.includes(e)) return;
                const ew = e.w || 40, eh = e.h || 40;
                const dist = Math.sqrt((e.x + ew/2 - this.x)**2 + (e.y + eh/2 - this.y)**2);
                if (dist < radius) {
                    const falloff = 1 - (dist / radius) * 0.5;
                    e.takeDamage(this.damage * falloff, this.isCrit);
                    this.hitList.push(e);
                }
            });
            
            for (let i = 0; i < 40; i++) {
                const p = new Particle(this.x, this.y, ['#f80', '#ff0', '#f00', '#fff'][Math.floor(Math.random() * 4)]);
                p.vx *= 1.5;
                p.vy *= 1.5;
                p.life = 0.8;
                game.particles.push(p);
            }
            
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const smoke = new Particle(this.x + Math.cos(angle) * 30, this.y + Math.sin(angle) * 30, '#555');
                smoke.vx = Math.cos(angle) * 200;
                smoke.vy = Math.sin(angle) * 200;
                smoke.life = 0.6;
                game.particles.push(smoke);
            }
            
            game.skillEffects.push(new ExplosionRing(this.x, this.y, radius));
        }
    }
}

class ExplosionRing {
    constructor(x, y, radius) {
        this.x = x; this.y = y;
        this.maxRadius = radius;
        this.life = 0; this.maxLife = 0.3;
        this.remove = false;
    }
    update(dt) {
        this.life += dt;
        if (this.life >= this.maxLife) this.remove = true;
    }
    draw(ctx) {
        const p = this.life / this.maxLife;
        const r = this.maxRadius * p;
        const alpha = 1 - p;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        ctx.strokeStyle = '#f80';
        ctx.lineWidth = 8 * (1 - p);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();
        
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
        gradient.addColorStop(0, `rgba(255, 200, 50, ${alpha * 0.5})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

function isOnScreen(entity) {
    const margin = 100;
    return entity.x + entity.w > game.camera.x - margin &&
           entity.x < game.camera.x + WIDTH + margin &&
           entity.y + entity.h > game.camera.y - margin &&
           entity.y < game.camera.y + HEIGHT + margin;
}

class SkillEffect {
    constructor(x, y, type, damage, angle = 0) {
        this.x = x; this.y = y; this.type = type;
        this.damage = damage; this.angle = angle;
        this.life = 0; this.remove = false;
        this.hitList = []; this.owner = null;
        const scrMax = Math.max(WIDTH || 800, HEIGHT || 600);
        this.maxRadius = type === 'SHOCKWAVE' ? scrMax * 0.5 : scrMax * 1.2;
        this.maxLife = type === 'NOVA' ? 3.0 : (type === 'CHAINLIGHTNING' ? 0.5 : 0.6);
        
        if (type === 'CHAINLIGHTNING') {
            this.chainTargets = [];
            this.chainBuilt = false;
            this.maxChains = 5;
            this.chainRange = 500;
        }
    }
    
    update(dt) {
        this.life += dt;
        if (this.life >= this.maxLife) this.remove = true;
        const p = this.life / this.maxLife;
        
        if (this.type === 'NOVA') {
            const r = this.maxRadius * p;
            game.entities.forEach(e => {
                if (e.dead || this.hitList.includes(e)) return;
                if (!isOnScreen(e)) return;
                if (Math.sqrt((e.x - this.x)**2 + (e.y - this.y)**2) < r) { 
                    e.takeDamage(this.damage); 
                    this.hitList.push(e);
                }
            });
        } else if (this.type === 'CHAINLIGHTNING') {
            if (!this.chainBuilt) {
                this.chainBuilt = true;
                
                let lastX = this.x;
                let lastY = this.y;
                const hitEnemies = [];
                
                for (let i = 0; i < this.maxChains; i++) {
                    let nearest = null;
                    let minDist = this.chainRange;
                    
                    for (let j = 0; j < game.entities.length; j++) {
                        const e = game.entities[j];
                        if (!(e instanceof Enemy) || e.dead || hitEnemies.includes(e)) continue;
                        if (!isOnScreen(e)) continue;
                        
                        const ex = e.x + e.w / 2;
                        const ey = e.y + e.h / 2;
                        const dist = Math.sqrt((ex - lastX) ** 2 + (ey - lastY) ** 2);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = e;
                        }
                    }
                    
                    if (nearest) {
                        const ex = nearest.x + nearest.w / 2;
                        const ey = nearest.y + nearest.h / 2;
                        
                        this.chainTargets.push({
                            startX: lastX,
                            startY: lastY,
                            endX: ex,
                            endY: ey
                        });
                        
                        hitEnemies.push(nearest);
                        const dmgMult = 1 - i * 0.1;
                        nearest.takeDamage(this.damage * dmgMult);
                        
                        for (let k = 0; k < 4; k++) {
                            const spark = new Particle(ex, ey, '#aaf');
                            spark.life = 0.3;
                            game.particles.push(spark);
                        }
                        
                        lastX = ex;
                        lastY = ey;
                    } else {
                        break;
                    }
                }
                
                if (this.chainTargets.length === 0) {
                    game.damageNumbers.push(new DamageNumber(this.x, this.y - 30, 'NO TARGET', false));
                }
            }
        } else if (this.type === 'SHOCKWAVE') {
            const r = this.maxRadius * p;
            game.entities.forEach(e => {
                if (e.dead || this.hitList.includes(e)) return;
                if (!isOnScreen(e)) return;
                const dx = e.x + e.w/2 - this.x, dy = e.y + e.h/2 - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                let diff = Math.atan2(dy, dx) - this.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(dist - r) < 50 && Math.abs(diff) < 0.5) { e.takeDamage(this.damage); this.hitList.push(e); }
            });
        }
    }
    
    draw(ctx) {
        const p = this.life / this.maxLife;
        const a = Math.max(0, 1 - p);
        
        ctx.save();
        
        if (this.type === 'NOVA') {
            ctx.globalAlpha = a;
            ctx.beginPath(); 
            ctx.arc(this.x, this.y, this.maxRadius * p, 0, Math.PI * 2);
            ctx.strokeStyle = '#0ff'; 
            ctx.lineWidth = 5; 
            ctx.shadowBlur = 20; 
            ctx.shadowColor = '#0ff'; 
            ctx.stroke();
        } else if (this.type === 'CHAINLIGHTNING') {
            if (this.chainTargets.length > 0) {
                const pulseAlpha = 0.5 + Math.sin(this.life * 30) * 0.3;
                ctx.globalAlpha = Math.max(0.3, a) * pulseAlpha;
                
                for (let c = 0; c < this.chainTargets.length; c++) {
                    const chain = this.chainTargets[c];
                    const dx = chain.endX - chain.startX;
                    const dy = chain.endY - chain.startY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 1) continue;
                    
                    const segments = Math.max(4, Math.floor(dist / 30));
                    const points = [{x: chain.startX, y: chain.startY}];
                    
                    for (let i = 1; i < segments; i++) {
                        const t = i / segments;
                        let px = chain.startX + dx * t;
                        let py = chain.startY + dy * t;
                        
                        const perpX = -dy / dist;
                        const perpY = dx / dist;
                        const jitter = (Math.random() - 0.5) * 35;
                        px += perpX * jitter;
                        py += perpY * jitter;
                        
                        points.push({x: px, y: py});
                    }
                    points.push({x: chain.endX, y: chain.endY});
                    
                    ctx.strokeStyle = '#4488ff';
                    ctx.lineWidth = 6;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#aaf';
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.stroke();
                    
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#fff';
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.stroke();
                    
                    ctx.fillStyle = '#fff';
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#aaf';
                    ctx.beginPath();
                    ctx.arc(chain.endX, chain.endY, 8, 0, Math.PI * 2);
                    ctx.fill();
                    
                    if (c === 0) {
                        ctx.beginPath();
                        ctx.arc(chain.startX, chain.startY, 6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else {
                ctx.globalAlpha = a;
                const sparkCount = 8;
                for (let i = 0; i < sparkCount; i++) {
                    const angle = (i / sparkCount) * Math.PI * 2;
                    const radius = 30 * p;
                    const sx = this.x + Math.cos(angle) * radius;
                    const sy = this.y + Math.sin(angle) * radius;
                    
                    ctx.fillStyle = '#88f';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#aaf';
                    ctx.beginPath();
                    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.shadowBlur = 0;
        } else if (this.type === 'SHOCKWAVE') {
            ctx.globalAlpha = a;
            ctx.translate(this.x, this.y); 
            ctx.rotate(this.angle);
            for (let i = 0; i < 12; i++) {
                const ang = -0.5 + i / 11;
                ctx.fillStyle = '#fff';
                ctx.beginPath(); 
                ctx.arc(Math.cos(ang) * this.maxRadius * p, Math.sin(ang) * this.maxRadius * p, 6, 0, Math.PI * 2); 
                ctx.fill();
            }
        } else if (this.type === 'HEAL') {
            ctx.globalAlpha = a;
            ctx.beginPath(); 
            ctx.arc(this.x, this.y, 60 * p, 0, Math.PI * 2);
            ctx.strokeStyle = '#0f0'; 
            ctx.lineWidth = 5; 
            ctx.shadowBlur = 20; 
            ctx.shadowColor = '#0f0'; 
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

class TreasureChest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 300;
        this.h = 240;
        this.type = 'treasureChest';
        this.dead = false;
        this.breakTime = 5;
        this.damageAccumulator = 0;
        this.lastHitTime = 0;
    }
    takeDamage(amount) {
        if (this.dead) return;
        this.lastHitTime = game.time;
    }
    update(dt) {
        if (this.dead) return;
        if (game.time - this.lastHitTime < 0.2) {
            this.damageAccumulator += dt;
            if (this.damageAccumulator >= this.breakTime) {
                this.dead = true;
                const treasureCoins = BASE_COIN * TREASURE_COIN_MULT;
                if (game.extraLives > 0) {
                    game.coins += treasureCoins;
                    game.damageNumbers.push(new DamageNumber(this.x + this.w/2, this.y + this.h/2, `+${treasureCoins} COINS`, true));
                    game.treasureCollected = true;
                } else if (Math.random() < 0.5) {
                    const loot = new Loot(this.x + this.w / 2 - 20, this.y + this.h / 2 - 20, 'extra_life');
                    loot.fromTreasureChest = true;
                    game.loots.push(loot);
                } else {
                    game.coins += treasureCoins;
                    game.damageNumbers.push(new DamageNumber(this.x + this.w/2, this.y + this.h/2, `+${treasureCoins} COINS`, true));
                    game.treasureCollected = true;
                }
                for (let i = 0; i < 15; i++) {
                    game.particles.push(new Particle(this.x + this.w / 2, this.y + this.h / 2, '#ffd700'));
                }
            }
        } else {
            this.damageAccumulator = 0;
        }
    }
    draw(ctx) {
        if (this.dead) return;
        if (this.damageAccumulator > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x, this.y + this.h + 8, this.w, 10);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(this.x, this.y + this.h + 8, this.w * (this.damageAccumulator / this.breakTime), 10);
        }
        const img = ASSETS.chest;
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, this.x, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = 'rgba(80, 60, 40, 0.9)';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.strokeStyle = '#a08040';
            ctx.strokeRect(this.x, this.y, this.w, this.h);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 42px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('보물', this.x + this.w / 2, this.y + this.h / 2 + 15);
            ctx.textAlign = 'left';
        }
    }
}

class Loot {
    constructor(x, y, type) {
        const scale = isMobile ? 0.7 : 1;
        this.x = x; this.y = y; 
        this.w = 40 * scale; this.h = 40 * scale;
        this.type = type; this.scale = scale;
        this.vx = (Math.random() - 0.5) * 150;
        this.vy = (Math.random() - 0.5) * 150;
    }
    update(dt) {
        const leader = game.squad[0];
        if (leader && !leader.dead) {
            const dx = leader.x + leader.w/2 - this.x;
            const dy = leader.y + leader.h/2 - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const noEnemiesLeft = !game.entities.some(e => e instanceof Enemy && !e.dead);

            if (noEnemiesLeft && dist > 1) {
                const pullSpeed = this.fromTreasureChest ? 420 : 840;
                this.vx = (dx / dist) * pullSpeed;
                this.vy = (dy / dist) * pullSpeed;
            } else if (dist < (game.lootMagnet || 100)) {
                const t = 1 - (dist / (game.lootMagnet || 100));
                const magnetStrength = 100 + Math.pow(t, 2) * 1500;
                if (dist > 1) {
                    this.vx += (dx / dist) * magnetStrength * dt;
                    this.vy += (dy / dist) * magnetStrength * dt;
                }
                const maxSpeed = 200 + t * 800;
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (currentSpeed > maxSpeed) {
                    this.vx = (this.vx / currentSpeed) * maxSpeed;
                    this.vy = (this.vy / currentSpeed) * maxSpeed;
                }
            }
        }
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.vx *= 0.98; this.vy *= 0.98;
        const b = 50;
        if (this.x < game.camera.x + b) { this.x = game.camera.x + b; this.vx = Math.abs(this.vx); }
        if (this.x > game.camera.x + WIDTH - b) { this.x = game.camera.x + WIDTH - b; this.vx = -Math.abs(this.vx); }
        if (this.y < game.camera.y + b) { this.y = game.camera.y + b; this.vy = Math.abs(this.vy); }
        if (this.y > game.camera.y + HEIGHT - b) { this.y = game.camera.y + HEIGHT - b; this.vy = -Math.abs(this.vy); }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + Math.sin(game.time * 5) * 5);
        const s = 1 + Math.sin(game.time * 10) * 0.1;
        ctx.scale(s, s);
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.type === 'hp' || this.type === 'extra_life' ? '#ff0' : (this.type === 'gun' ? '#0ff' : (this.type === 'invincibility' ? '#ff0' : '#ff0'));
        let img = this.type === 'hp' || this.type === 'extra_life' ? ASSETS.item_hp : (this.type === 'gun' ? ASSETS.item_gun : (this.type === 'invincibility' ? ASSETS.invincibility : ASSETS.hero));
        const size = 40 * this.scale;
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -size/2, -size/2, size, size);
        } else {
            ctx.fillStyle = ctx.shadowColor;
            ctx.fillRect(-size/2, -size/2, size, size);
        }
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${10 * this.scale}px Arial`;
        ctx.textAlign = 'center';
        const labels = { hp: 'CD RESET', gun: 'UPGRADE', squad: 'ALLY', invincibility: 'INVINCIBLE', extra_life: 'LIFE' };
        ctx.fillText(labels[this.type] || '', 0, 35 * this.scale);
        ctx.textAlign = 'left';
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 400;
        this.vy = (Math.random() - 0.5) * 400;
        this.life = 0.5;
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; }
    draw(ctx) { ctx.globalAlpha = this.life * 2; ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, 4, 4); ctx.globalAlpha = 1; }
}

class DamageNumber {
    constructor(x, y, damage, isCrit = false) {
        this.x = x; this.y = y;
        this.damage = typeof damage === 'string' ? damage : Math.round(damage);
        this.isCrit = isCrit; this.life = 1.0;
        this.vy = -80; this.vx = (Math.random() - 0.5) * 50;
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vy += 100 * dt; this.life -= dt; }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.life * 2);
        ctx.font = `bold ${this.isCrit ? 24 : 16}px Arial`;
        ctx.fillStyle = this.isCrit ? '#ff0' : '#fff';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.strokeText(this.damage, this.x, this.y);
        ctx.fillText(this.damage, this.x, this.y);
        ctx.restore();
    }
}

class HitSpark {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.sparks = Array.from({length: 6}, () => ({
            x: 0, y: 0, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, life: 0.3
        }));
        this.life = 0.5;
    }
    update(dt) { this.life -= dt; this.sparks.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }); }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        this.sparks.forEach(s => {
            if (s.life <= 0) return;
            ctx.globalAlpha = s.life * 3; ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    }
}

class MuzzleFlash {
    constructor(x, y, angle) { this.x = x; this.y = y; this.angle = angle; this.life = 0.05; }
    update(dt) { this.life -= dt; }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        g.addColorStop(0, 'rgba(255,255,200,1)'); g.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(10, 0, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class Footprint {
    constructor(x, y, angle) { this.x = x; this.y = y; this.angle = angle; this.life = 3; }
    update(dt) { this.life -= dt; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.globalAlpha = this.life * 0.05; ctx.fillStyle = '#0a0a15';
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class EnvironmentObject {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.scale = 0.5 + Math.random();
        this.rotation = Math.random() * Math.PI * 2;
        this.alpha = 0.2 + Math.random() * 0.3;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha; ctx.fillStyle = '#151525';
        if (this.type === 'debris') ctx.fillRect(-20 * this.scale, -10 * this.scale, 40 * this.scale, 20 * this.scale);
        else for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.arc((Math.random() - 0.5) * 30 * this.scale, (Math.random() - 0.5) * 30 * this.scale, 8 * this.scale, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

function showUpgradeSelection() {
    game.lastStageVariant = game.currentStageVariant;
    game.showUpgradeUI = true;
    game.paused = true;
    game.upgradeChoices = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
}

function selectUpgrade(index) {
    if (index === 3) {
        game.showUpgradeUI = false;
        game.showStageSelect = true;
        return;
    }
    if (index < 0 || index >= game.upgradeChoices.length) return;
    const up = game.upgradeChoices[index];
    const cost = up.cost || 0;
    if (game.coins < cost) {
        game.invalidUpgradeMessage = `코인이 부족합니다 (필요: ${cost})`;
        game.invalidUpgradeMessageTimer = 2;
        return;
    }
    game.coins -= cost;
    up.apply();
    game.showUpgradeUI = false;
    game.showStageSelect = true;
}

function getUpgradeChoiceAt(mx, my) {
    const cardW = isMobile ? 150 : 200;
    const cardH = isMobile ? 200 : 280;
    const gap = isMobile ? 15 : 30;
    const startX = (WIDTH - cardW * 3 - gap * 2) / 2;
    const startY = (HEIGHT - cardH) / 2;
    for (let i = 0; i < 3; i++) {
        const cx = startX + i * (cardW + gap);
        if (mx >= cx && mx <= cx + cardW && my >= startY && my <= startY + cardH) return i;
    }
    const skipW = 120, skipH = 44;
    const skipX = WIDTH / 2 - skipW / 2, skipY = HEIGHT - 80;
    if (mx >= skipX && mx <= skipX + skipW && my >= skipY && my <= skipY + skipH) return 3;
    return -1;
}

function getStageNodeAt(mx, my) {
    if (!WIDTH || !HEIGHT) return null;
    const nodes = getStageMapNodes();
    const selectable = getSelectableStageIds();
    const headerH = isMobile ? 52 : 64;
    const mapPad = 16;
    const mapFooterH = 40;
    const mapTop = headerH + mapPad;
    const mapH = HEIGHT - headerH - mapPad * 2 - mapFooterH;
    const gridCols = 8, gridRows = 12;
    const cellW = (WIDTH - mapPad * 2) / gridCols;
    const cellH = mapH / gridRows;
    const halfCell = Math.max(cellW, cellH) * 0.6;
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (!selectable.has(n.id)) continue;
        const pos = getStageNodeScreenPos(n);
        const cx = pos.x * WIDTH;
        const cy = pos.y * HEIGHT;
        if (mx >= cx - halfCell && mx <= cx + halfCell && my >= cy - halfCell && my <= cy + halfCell) {
            return { node: n, index: i };
        }
    }
    return null;
}

function isOverSelectableStageNode(mx, my) {
    return getStageNodeAt(mx, my) !== null;
}

const STAGE_VARIANTS = [
    { id: 'normal', weight: 50 },
    { id: 'treasure', weight: 22 },
    { id: 'double_boss', weight: 18 },
    { id: 'elite', weight: 10 }
];

function rollStageVariant(excludeId) {
    const pool = excludeId ? STAGE_VARIANTS.filter(v => v.id !== excludeId) : STAGE_VARIANTS;
    if (pool.length === 0) return 'normal';
    const total = pool.reduce((s, v) => s + v.weight, 0);
    let r = Math.random() * total;
    for (const v of pool) {
        r -= v.weight;
        if (r <= 0) return v.id;
    }
    return pool[pool.length - 1].id;
}

function selectStage(node) {
    const selectable = getSelectableStageIds();
    if (!selectable.has(node.id)) {
        game.invalidStageMessage = '이전 스테이지를 먼저 클리어해주세요.';
        game.invalidStageMessageTimer = 2.5;
        return;
    }
    game.invalidStageMessage = '';
    game.invalidStageMessageTimer = 0;
    game.currentStageId = node.id;
    game.stageLevel = node.level;
    game.currentStageVariant = rollStageVariant(game.lastStageVariant);
    game.showStageSelect = false;
    game.paused = false;
    nextWave();
}

function drawUpgradeUI() {
    if (game.invalidUpgradeMessageTimer > 0) game.invalidUpgradeMessageTimer -= 0.016;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#0ff'; 
    ctx.font = `bold ${isMobile ? 24 : 36}px Arial`; 
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE UPGRADE', WIDTH / 2, isMobile ? 50 : 70);
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${isMobile ? 18 : 24}px Arial`;
    ctx.fillText(`💰 ${game.coins} 코인`, WIDTH / 2, isMobile ? 72 : 95);
    ctx.fillStyle = '#888'; 
    ctx.font = `${isMobile ? 12 : 16}px Arial`;
    ctx.fillText(isMobile ? 'Tap to select (코인 필요) | 스킵 가능' : '1,2,3 Click | 4 or S: Skip', WIDTH / 2, isMobile ? 88 : 118);

    const cardW = isMobile ? 150 : 200;
    const cardH = isMobile ? 200 : 280;
    const gap = isMobile ? 15 : 30;
    const startX = (WIDTH - cardW * 3 - gap * 2) / 2;
    const startY = (HEIGHT - cardH) / 2;

    game.upgradeChoices.forEach((up, i) => {
        const cx = startX + i * (cardW + gap);
        const cost = up.cost || 0;
        const canAfford = game.coins >= cost;
        ctx.fillStyle = canAfford ? '#1a1a2e' : '#0f0f18';
        ctx.fillRect(cx, startY, cardW, cardH);
        ctx.strokeStyle = canAfford ? '#0ff' : '#555';
        ctx.lineWidth = 2; ctx.strokeRect(cx, startY, cardW, cardH);
        if (!isMobile) {
            ctx.fillStyle = canAfford ? '#0ff' : '#555';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(`[${i + 1}]`, cx + cardW / 2, startY + 35);
        }
        ctx.fillStyle = canAfford ? '#ffd700' : '#666';
        ctx.font = `bold ${isMobile ? 14 : 16}px Arial`;
        ctx.fillText(`${cost} 코인`, cx + cardW / 2, startY + (isMobile ? 55 : 70));
        const iconImg = up.icon === 'hp' ? ASSETS.item_hp : (up.icon === 'gun' ? ASSETS.item_gun : ASSETS.hero);
        const iconY = isMobile ? startY + 65 : startY + 85;
        const iconSize = isMobile ? 50 : 60;
        if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
            ctx.globalAlpha = canAfford ? 1 : 0.5;
            ctx.drawImage(iconImg, cx + cardW/2 - iconSize/2, iconY, iconSize, iconSize);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = '#0ff'; ctx.font = `${isMobile ? 36 : 48}px Arial`;
            ctx.fillText('?', cx + cardW / 2, iconY + iconSize - 10);
        }
        ctx.fillStyle = canAfford ? '#fff' : '#888';
        ctx.font = `bold ${isMobile ? 14 : 18}px Arial`;
        ctx.fillText(up.name, cx + cardW / 2, isMobile ? startY + 145 : startY + 175);
        ctx.fillStyle = canAfford ? '#aaa' : '#555';
        ctx.font = `${isMobile ? 11 : 14}px Arial`;
        ctx.fillText(up.desc, cx + cardW / 2, isMobile ? startY + 165 : startY + 200);
    });

    const skipW = 120, skipH = 44;
    const skipX = WIDTH / 2 - skipW / 2, skipY = HEIGHT - 80;
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(skipX, skipY, skipW, skipH);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(skipX, skipY, skipW, skipH);
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('스킵 (무료)', WIDTH / 2, skipY + skipH / 2 + 5);

    if (game.invalidUpgradeMessageTimer > 0 && game.invalidUpgradeMessage) {
        ctx.fillStyle = 'rgba(180, 60, 60, 0.95)';
        ctx.fillRect(WIDTH / 2 - 150, skipY - 50, 300, 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(game.invalidUpgradeMessage, WIDTH / 2, skipY - 25);
    }
    ctx.textAlign = 'left';
}

function getStageTileAsset(level) {
    if (level <= 1) return ASSETS.stageTile1;
    if (level <= 4) return ASSETS.stageTile3;
    if (level <= 6) return ASSETS.stageTile5;
    if (level <= 7) return ASSETS.stageTile7;
    return ASSETS.stageTile8;
}

function drawStageSelectUI() {
    if (game.invalidStageMessageTimer > 0) game.invalidStageMessageTimer -= 0.016;

    const nodes = getStageMapNodes();
    const nodeW = Math.min(48, WIDTH * 0.058);
    const nodeH = Math.min(36, HEIGHT * 0.045);
    const clearedSet = new Set(game.clearedStages || []);
    const selectableSet = getSelectableStageIds();
    const highlightAvailable = game.invalidStageMessageTimer > 0;

    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const gridGrad = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 0, WIDTH/2, HEIGHT/2, WIDTH * 0.8);
    gridGrad.addColorStop(0, '#14182a');
    gridGrad.addColorStop(0.6, '#0c0e18');
    gridGrad.addColorStop(1, '#06080c');
    ctx.fillStyle = gridGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const headerH = isMobile ? 52 : 64;
    const mapPad = 16;
    const mapFooterH = 40;
    const mapTop = headerH + mapPad;
    const mapH = HEIGHT - headerH - mapPad * 2 - mapFooterH;
    const gridCols = 8, gridRows = 12;
    const cellW = (WIDTH - mapPad * 2) / gridCols;
    const cellH = mapH / gridRows;
    ctx.strokeStyle = 'rgba(50, 80, 120, 0.25)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= gridCols; c++) {
        const gx = mapPad + c * cellW;
        ctx.beginPath();
        ctx.moveTo(gx, mapTop);
        ctx.lineTo(gx, mapTop + mapH);
        ctx.stroke();
    }
    for (let r = 0; r <= gridRows; r++) {
        const gy = mapTop + r * cellH;
        ctx.beginPath();
        ctx.moveTo(mapPad, gy);
        ctx.lineTo(WIDTH - mapPad, gy);
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(20, 35, 55, 0.85)';
    ctx.fillRect(0, 0, WIDTH, headerH);
    ctx.strokeStyle = 'rgba(90, 140, 180, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, WIDTH - 2, headerH - 1);
    ctx.fillStyle = '#b0d0e8';
    ctx.font = `bold ${isMobile ? 18 : 26}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('다음 스테이지를 선택하세요', WIDTH / 2, isMobile ? 28 : 38);
    ctx.fillStyle = '#6a9aba';
    ctx.font = `${isMobile ? 10 : 12}px Arial`;
    ctx.fillText('클리어한 스테이지에 연결된 스테이지만 선택할 수 있습니다', WIDTH / 2, isMobile ? 44 : 56);

    if (game.stageSelectLastTap && (performance.now() - game.stageSelectLastTap.t) < 800) {
        const tap = game.stageSelectLastTap;
        ctx.fillStyle = 'rgba(0,255,0,0.8)';
        ctx.beginPath();
        ctx.arc(tap.cx, tap.cy, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TAP', tap.cx, tap.cy + 4);
        ctx.textAlign = 'left';
    }

    const footerH = mapFooterH;
    ctx.strokeStyle = 'rgba(70, 110, 150, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapPad, headerH + mapPad, WIDTH - mapPad * 2, HEIGHT - headerH - mapPad * 2 - footerH);
    ctx.strokeStyle = 'rgba(90, 140, 180, 0.2)';
    ctx.strokeRect(mapPad + 3, headerH + mapPad + 3, WIDTH - mapPad * 2 - 6, HEIGHT - headerH - mapPad * 2 - footerH - 6);

    ctx.strokeStyle = 'rgba(70, 100, 140, 0.35)';
    ctx.lineWidth = 1.2;
    nodes.forEach(n => {
        if (!n.adjacent) return;
        const posA = getStageNodeScreenPos(n);
        n.adjacent.forEach(adjId => {
            const b = nodes.find(m => m.id === adjId);
            if (!b) return;
            const posB = getStageNodeScreenPos(b);
            ctx.beginPath();
            ctx.moveTo(posA.x * WIDTH, posA.y * HEIGHT);
            ctx.lineTo(posB.x * WIDTH, posB.y * HEIGHT);
            ctx.stroke();
        });
    });

    const iconAssets = { home: 'pixelHouse', grunt: 'grunt', robot: 'pixelSpider', rock: 'grunt', tower: 'pixelArmored', tank: 'pixelTank', console: 'pixelArmored', heli: 'pixelHeli', warning: 'pixelWarning', boss: 'pixelWarning' };

    nodes.forEach(n => {
        const pos = getStageNodeScreenPos(n);
        const sx = pos.x * WIDTH - nodeW / 2;
        const sy = pos.y * HEIGHT - nodeH / 2;
        const cleared = clearedSet.has(n.id);
        const selectable = selectableSet.has(n.id);
        const showAsUnknown = selectable && !cleared;

        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(sx + 3, sy + 3, nodeW, nodeH);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const tileImg = getStageTileAsset(n.level);
        if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
            ctx.drawImage(tileImg, sx, sy, nodeW, nodeH);
        } else {
            ctx.fillStyle = cleared ? '#1a2a2a' : (selectable ? '#1e2a3a' : '#0f141c');
            ctx.fillRect(sx, sy, nodeW, nodeH);
        }

        if (selectable && highlightAvailable) {
            ctx.strokeStyle = '#e8c050';
            ctx.lineWidth = 2.5;
        } else if (selectable) {
            ctx.strokeStyle = '#6ab0e0';
            ctx.lineWidth = 2;
        } else if (cleared) {
            ctx.strokeStyle = '#2a7a4a';
            ctx.lineWidth = 1.5;
        } else {
            ctx.strokeStyle = '#2a2a38';
            ctx.lineWidth = 1;
        }
        ctx.strokeRect(sx, sy, nodeW, nodeH);

        ctx.textAlign = 'center';
        if (showAsUnknown) {
            ctx.fillStyle = '#a0c8e0';
            ctx.font = `bold ${isMobile ? 16 : 20}px Arial`;
            ctx.fillText('?', pos.x * WIDTH, sy + nodeH / 2 + 5);
        } else {
            ctx.fillStyle = cleared ? '#8aca9a' : '#6a8a9a';
            ctx.font = `bold ${isMobile ? 10 : 11}px Arial`;
            ctx.fillText('Lv.' + n.level, pos.x * WIDTH, sy + nodeH / 2 - 7);
            const iconKey = iconAssets[n.icon];
            const iconImg = iconKey && ASSETS[iconKey];
            if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
                const iw = nodeW * 0.5, ih = nodeH * 0.45;
                ctx.drawImage(iconImg, pos.x * WIDTH - iw/2, sy + nodeH / 2 + 1, iw, ih);
            } else {
                ctx.font = '10px Arial';
                const icons = { home: '⌂', grunt: '▣', robot: '⬡', rock: '◆', tower: '▤', tank: '▥', console: '▦', heli: '✈', warning: '!', boss: '☠' };
                ctx.fillText(icons[n.icon] || '?', pos.x * WIDTH, sy + nodeH / 2 + 10);
            }
        }
    });

    ctx.fillStyle = 'rgba(25, 45, 70, 0.7)';
    ctx.fillRect(8, HEIGHT - 32, WIDTH - 16, 26);
    ctx.strokeStyle = 'rgba(80, 120, 160, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, HEIGHT - 32, WIDTH - 16, 26);
    ctx.fillStyle = '#7a9aba';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Lv = 클리어한 스테이지  |  ? = 미탐험 (선택 가능)', WIDTH / 2, HEIGHT - 15);

    if (game.invalidStageMessageTimer > 0 && game.invalidStageMessage) {
        ctx.fillStyle = 'rgba(180, 60, 60, 0.95)';
        ctx.fillRect(WIDTH / 2 - 170, HEIGHT - 58, 340, 44);
        ctx.strokeStyle = '#d05050';
        ctx.lineWidth = 2;
        ctx.strokeRect(WIDTH / 2 - 170, HEIGHT - 58, 340, 44);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(game.invalidStageMessage, WIDTH / 2, HEIGHT - 32);
    }

    ctx.textAlign = 'left';
}

function drawMinimap() {
    if (isMobile) return;
    const size = 150, margin = 20;
    const mx = WIDTH - size - margin, my = margin;
    const scale = 0.02;
    const leader = game.squad[0];
    if (!leader) return;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mx, my, size, size);
    ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, size, size);

    const centerX = mx + size / 2, centerY = my + size / 2;

    game.entities.forEach(e => {
        if (!(e instanceof Enemy) || e.dead) return;
        const dx = (e.x - leader.x) * scale, dy = (e.y - leader.y) * scale;
        if (Math.abs(dx) < size/2 && Math.abs(dy) < size/2) {
            ctx.fillStyle = e.type === 'boss' ? '#f0f' : (e.type === 'bomber' ? '#f80' : '#f00');
            ctx.beginPath();
            ctx.arc(centerX + dx, centerY + dy, e.type === 'boss' ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    game.loots.forEach(l => {
        const dx = (l.x - leader.x) * scale, dy = (l.y - leader.y) * scale;
        if (Math.abs(dx) < size/2 && Math.abs(dy) < size/2) {
            ctx.fillStyle = l.type === 'hp' || l.type === 'extra_life' ? '#ff0' : (l.type === 'gun' ? '#0ff' : (l.type === 'invincibility' ? '#ff0' : '#ff0'));
            ctx.fillRect(centerX + dx - 2, centerY + dy - 2, 4, 4);
        }
    });

    game.squad.forEach((p, i) => {
        if (p.dead) return;
        const dx = (p.x - leader.x) * scale, dy = (p.y - leader.y) * scale;
        ctx.fillStyle = i === 0 ? '#0ff' : '#08f';
        ctx.beginPath(); ctx.arc(centerX + dx, centerY + dy, 4, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#888'; ctx.font = '10px Arial';
    ctx.fillText('MINIMAP [M]', mx, my + size + 12);
}

function resize() { WIDTH = canvas.width = window.innerWidth; HEIGHT = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);

function generateEnvironment() {
    game.environmentObjects = [];
    for (let i = 0; i < 30; i++) {
        game.environmentObjects.push(new EnvironmentObject(
            (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000,
            Math.random() > 0.5 ? 'debris' : 'rubble'
        ));
    }
}

function spawnEnemies(dt) {
    if (game.state !== 'COMBAT' || game.paused) return;
    
    const variant = game.currentStageVariant || 'normal';
    const L = game.stageLevel || 1;
    let isBossWave = game.wave % 5 === 0;
    const baseCount = Math.min(12 + L * 4 + Math.floor(L * L * 0.4), 160);
    let limit = isBossWave ? 1 : baseCount;

    if (variant === 'treasure') {
        limit = 0;
        if (!game.treasureChestSpawned) {
            const leader = game.squad[0];
            if (leader) {
                const cx = leader.x + leader.w / 2 - 150;
                const cy = leader.y - 260;
                game.entities.push(new TreasureChest(cx, cy));
                game.treasureChestSpawned = true;
            }
        }
        if (game.treasureCollected) {
            if (game.currentStageId != null && !(game.clearedStages || []).includes(game.currentStageId)) {
                game.clearedStages = game.clearedStages || [];
                game.clearedStages.push(game.currentStageId);
            }
            game.treasureCollected = false;
            game.treasureChestSpawned = false;
            showUpgradeSelection();
            return;
        }
    } else if (variant === 'objective') {
        limit = Math.min(2, 2 + Math.floor(L / 4));
        if (!game.objectiveSpawned) {
            const leader = game.squad[0];
            game.objectiveSpawned = true;
            game.objectiveX = leader ? leader.x + leader.w / 2 - 30 : WIDTH / 2 - 30;
            game.objectiveY = leader ? leader.y - 80 : HEIGHT / 2 - 80;
            game.objectiveW = 60;
            game.objectiveH = 50;
        }
        const leader = game.squad[0];
        if (leader && !leader.dead && game.objectiveSpawned) {
            const ox = game.objectiveX + game.objectiveW / 2;
            const oy = game.objectiveY + game.objectiveH / 2;
            const lx = leader.x + leader.w / 2;
            const ly = leader.y + leader.h / 2;
            const dist = Math.sqrt((lx - ox) ** 2 + (ly - oy) ** 2);
            if (dist < 70) {
                game.objectiveInteractTimer = (game.objectiveInteractTimer || 0) + dt;
                if (game.objectiveInteractTimer >= 2 || (Input.keys['KeyE'])) {
                    if (game.currentStageId != null && !(game.clearedStages || []).includes(game.currentStageId)) {
                        game.clearedStages = game.clearedStages || [];
                        game.clearedStages.push(game.currentStageId);
                    }
                    game.objectiveActive = false;
                    game.objectiveSpawned = false;
                    game.objectiveInteractTimer = 0;
                    game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, 'OBJECTIVE!', true));
                    showUpgradeSelection();
                    return;
                }
            } else {
                game.objectiveInteractTimer = 0;
            }
        }
        game.objectiveActive = true;
    } else if (variant === 'double_boss') {
        limit = 2;
        isBossWave = true;
    } else if (variant === 'elite') {
        baseCount = Math.min(Math.floor(baseCount * 1.4), 150);
        limit = isBossWave ? 1 : baseCount;
    }

    if (variant !== 'treasure' && game.enemiesSpawned >= limit &&
        game.entities.filter(e => e instanceof Enemy && !e.dead).length === 0 &&
        game.loots.length === 0 && !game.objectiveActive) {
        if (game.currentStageId != null && !(game.clearedStages || []).includes(game.currentStageId)) {
            game.clearedStages = game.clearedStages || [];
            game.clearedStages.push(game.currentStageId);
        }
        showUpgradeSelection();
        return;
    }
    if (game.enemiesSpawned >= limit) return;

    game.spawnTimer -= dt;
    const spawnRate = limit <= 0 ? 999 : Math.max(0.12, 3.5 / Math.sqrt(limit));
    
    if (game.spawnTimer <= 0) {
        game.spawnTimer = isBossWave ? 0 : spawnRate;

        let type = 'grunt';
        if (isBossWave || variant === 'double_boss') type = 'boss';
        else {
            const r = Math.random();
            if (L >= 2 && r > 0.75) type = 'wasp';
            if (L >= 2 && r > 0.75) type = 'worm';
            if (L >= 3 && r > 0.70) type = 'sniper';
            if (L >= 5 && r > 0.88) type = 'bomber';
            if (L >= 3 && r > 0.81) type = 'electric';
            if (L >= 7 && r > 0.93) type = 'beast';
            if (L >= 4 && r > 0.86) type = 'titan';
            if (L >= 8) {
                if (r > 0.4) type = 'wasp';
                if (r > 0.55) type = 'worm';
                if (r > 0.60) type = 'sniper';
                if (r > 0.75) type = 'bomber';
                if (r > 0.80) type = 'electric';
                if (r > 0.88) type = 'beast';
                if (r > 0.92) type = 'titan';
            }
        }

        let drop = null;
        if (game.waveDrops.length > 0 && !isBossWave) {
            const remaining = limit - game.enemiesSpawned;
            if (Math.random() < 1 / remaining || remaining <= game.waveDrops.length) {
                drop = game.waveDrops.pop();
            }
        }

        const leader = game.squad[0];
        if (!leader) return;
        
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(WIDTH, HEIGHT) * 0.28; // 맵 크기 축소 (0.4 -> 0.28)
        const sx = leader.x + Math.cos(angle) * dist;
        const sy = leader.y + Math.sin(angle) * dist;

        const e = new Enemy(sx, sy, type, drop);
        game.entities.push(e);
        game.enemiesSpawned++;

        if (type === 'boss' || type === 'bomber' || type === 'beast' || type === 'titan') {
            game.warnings.push(new Warning(sx, sy, type));
        }
    }
}

function checkLootCollision() {
    const leader = game.squad.find(s => s.isLeader) || game.squad[0];
    if (!leader) return;

    game.loots.forEach(l => {
        const dist = Math.sqrt((l.x - leader.x - leader.w/2)**2 + (l.y - leader.y - leader.h/2)**2);
        if (dist < 50) {
            l.remove = true;
            if (l.type === 'hp') {
                // Rage 게이지를 채워주는 물약
                if (leader && !leader.rageMode) {
                    leader.rageGauge = Math.min(leader.maxRageGauge, leader.rageGauge + 50); // 50% 채움
                    game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, '+50 RAGE', true));
                } else {
                    game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, 'RAGE FULL!', true));
                }
            } else if (l.type === 'gun') {
                game.squad.forEach(s => { s.bulletDamage += 3; s.maxAmmo += 5; s.ammo = s.maxAmmo; });
                game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, 'UPGRADE!', true));
            } else if (l.type === 'invincibility') {
                // 5초간 무적 효과
                game.squad.forEach(s => {
                    s.invulnerableTimer = 5.0;
                    s.invulnerable = 0.1;
                });
                game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, 'INVINCIBLE 5s!', true));
            } else if (l.type === 'extra_life') {
                game.extraLives = (game.extraLives || 0) + 1;
                game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, '+1 LIFE!', true));
                if (l.fromTreasureChest) game.treasureCollected = true;
            } else if (l.type === 'squad') {
                const skills = ['NOVA', 'SHOCKWAVE', 'CHAINLIGHTNING', 'HEAL'];
                const usedSkills = game.squad.map(s => s.skillType).filter(s => s);
                const availableSkills = skills.filter(s => !usedSkills.includes(s));
                
                if (availableSkills.length > 0) {
                    const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
                    const last = game.squad[game.squad.length - 1];
                    // 새 캐릭터를 마지막 멤버 뒤쪽에 스폰 (겹침 방지)
                    const dx = last.x - leader.x;
                    const dy = last.y - leader.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const offset = 80; // 팔로워 간격
                    const spawnX = dist > 0.1 ? last.x + (dx / dist) * offset : last.x + offset;
                    const spawnY = dist > 0.1 ? last.y + (dy / dist) * offset : last.y;
                    const nm = new Player(spawnX, spawnY, false, last);
                    nm.bulletDamage = leader.bulletDamage;
                    nm.maxHp = leader.maxHp; nm.hp = nm.maxHp;
                    nm.maxAmmo = leader.maxAmmo; nm.ammo = nm.maxAmmo;
                    nm.weapon = leader.weapon; nm.fireRate = leader.fireRate;
                    nm.skillType = skill;
                    nm.piercing = leader.piercing;
                    nm.critChance = leader.critChance;
                    nm.hasRegen = leader.hasRegen;
                    nm.speed = leader.speed;
                    game.squad.push(nm);
                    game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, '+' + skill, true));
                } else {
                    const randomMember = game.squad.filter(s => s.skillType)[Math.floor(Math.random() * game.squad.filter(s => s.skillType).length)];
                    if (randomMember) {
                        randomMember.skillLevel++;
                        randomMember.skillCooldown *= 0.85;
                        game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, randomMember.skillType + ' LVL ' + randomMember.skillLevel + '!', true));
                    }
                }
            }
        }
    });
    game.loots = game.loots.filter(l => !l.remove);
}

function nextWave() {
    game.wave++;
    waveEl.innerText = game.wave;
    game.enemiesSpawned = 0;
    game.killsThisWave = 0;
    game.treasureChestSpawned = false;
    game.treasureCollected = false;
    game.objectiveActive = false;
    game.objectiveSpawned = false;
    game.objectiveInteractTimer = 0;
    game.waveDrops = ['hp', 'gun', 'squad', 'invincibility'];
    game.loots = [];
    game.particles = [];
    game.projectiles = [];
    game.skillEffects = [];
    game.damageNumbers = [];
    game.muzzleFlashes = [];
    game.footprints = [];
    game.warnings = [];
    const leader = game.squad[0];
    if (leader && !leader.dead) {
        leader.x = WIDTH / 2 - leader.w / 2;
        leader.y = HEIGHT / 2 - leader.h / 2;
        leader.vx = 0;
        leader.vy = 0;
        game.squad.forEach((p, i) => {
            if (p.dead) return;
            if (i === 0) return;
            p.x = leader.x - (i * 50);
            p.y = leader.y;
            p.vx = 0;
            p.vy = 0;
        });
    }
    if (game.wave > persistent.highWave) {
        persistent.highWave = game.wave;
        savePersistent();
    }
}

function checkCollisions() {
    game.projectiles.forEach(p => {
        if (!p.isPlayer || p.remove) return;
        game.entities.forEach(e => {
            if (typeof e.type === 'undefined' || e.dead || p.hitList.includes(e)) return;
            const ew = e.w || 40, eh = e.h || 40;
            if (!(e.x + ew > game.camera.x - 120 && e.x < game.camera.x + WIDTH + 120 &&
                  e.y + eh > game.camera.y - 120 && e.y < game.camera.y + HEIGHT + 120)) return;
            const ex = e.x + ew / 2;
            const ey = e.y + eh / 2;
            const hitRadius = Math.max(Math.min(ew, eh) / 2, 28) + p.size;
            let hit = false;
            const dist = Math.sqrt((p.x - ex)**2 + (p.y - ey)**2);
            if (dist < hitRadius) hit = true;
            if (!hit && p.lastX != null && (p.lastX !== p.x || p.lastY !== p.y)) {
                const steps = 5;
                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const qx = p.lastX + (p.x - p.lastX) * t;
                    const qy = p.lastY + (p.y - p.lastY) * t;
                    const d = Math.sqrt((qx - ex)**2 + (qy - ey)**2);
                    if (d < hitRadius) { hit = true; break; }
                }
            }
            if (hit) {
                e.takeDamage(p.damage, p.isCrit);
                p.hitList.push(e);
                p.onHit();
                if (p.piercing > 0) p.piercing--;
                else p.remove = true;
            }
        });
    });

    game.projectiles.forEach(p => {
        if (p.isPlayer || p.remove) return;
        game.squad.forEach(s => {
            if (s.dead) return;
            if (p.isBossProjectile && !s.isLeader) return;
            
            // 더 정확한 충돌 감지
            const sx = s.x + s.w / 2;
            const sy = s.y + s.h / 2;
            const px = p.x;
            const py = p.y;
            const dist = Math.sqrt((px - sx)**2 + (py - sy)**2);
            const hitRadius = Math.min(s.w, s.h) / 2 + p.size;
            
            if (dist < hitRadius) {
                s.takeDamage(p.damage);
                p.remove = true;
            }
        });
    });

    checkLootCollision();
}

function updateAmmoUI() {
    if (game.squad[0]) {
        const w = WEAPONS[game.squad[0].weapon];
        ammoEl.innerText = game.squad[0].reloading ? 'REL' : game.squad[0].ammo;
        document.querySelector('.weapon-name').innerText = w ? w.name : 'RIFLE';
    }
}

function drawPostProcessing() {
    const vignette = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, HEIGHT * 0.3, WIDTH/2, HEIGHT/2, HEIGHT * 0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalAlpha = 0.02;
    for (let y = 0; y < HEIGHT; y += 4) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, WIDTH, 2); }
    ctx.globalAlpha = 1;
}

function drawCrosshair() {
    if (isMobile && Input.touch.active) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(Input.touch.startX, Input.touch.startY, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(Input.touch.currentX, Input.touch.currentY, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0ff';
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(Input.touch.startX, Input.touch.startY);
        ctx.lineTo(Input.touch.currentX, Input.touch.currentY);
        ctx.stroke();
    }
    
    if (isMobile) {
        const leader = game.squad[0];
        if (leader) {
            const target = leader.getNearestEnemy();
            if (target) {
                const tx = target.x + target.w / 2 - game.camera.x;
                const ty = target.y + target.h / 2 - game.camera.y;
                ctx.strokeStyle = '#f66';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(tx, ty, 25 + Math.sin(game.time * 8) * 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        return;
    }

    const leader = game.squad[0];
    ctx.strokeStyle = leader && leader.dashTimer <= 0 ? '#0ff' : '#066';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(Input.mouse.x, Input.mouse.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Input.mouse.x - 22, Input.mouse.y); ctx.lineTo(Input.mouse.x - 8, Input.mouse.y);
    ctx.moveTo(Input.mouse.x + 8, Input.mouse.y); ctx.lineTo(Input.mouse.x + 22, Input.mouse.y);
    ctx.moveTo(Input.mouse.x, Input.mouse.y - 22); ctx.lineTo(Input.mouse.x, Input.mouse.y - 8);
    ctx.moveTo(Input.mouse.x, Input.mouse.y + 8); ctx.lineTo(Input.mouse.x, Input.mouse.y + 22);
    ctx.stroke();
    if (leader && leader.dashTimer <= 0) {
        ctx.fillStyle = '#0ff';
        ctx.beginPath(); ctx.arc(Input.mouse.x, Input.mouse.y, 3, 0, Math.PI * 2); ctx.fill();
    }
}

function drawHUD() {
    if (game.lastCoinRevive) {
        const r = game.lastCoinRevive;
        const boxY = isMobile ? 58 : 60;
        const boxH = 24;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(WIDTH / 2 - 100, boxY, 200, boxH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(WIDTH / 2 - 100, boxY, 200, boxH);
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${isMobile ? 12 : 14}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`💰 ${r.before} → ${r.after} (-${r.spent})`, WIDTH / 2, boxY + boxH - 6);
        ctx.textAlign = 'left';
    }

    if (game.combo > 1) {
        const comboScale = 1 + Math.min(game.combo * 0.02, 0.5);
        ctx.save();
        ctx.translate(WIDTH / 2, isMobile ? 100 : 150);
        ctx.scale(comboScale, comboScale);
        ctx.fillStyle = game.combo >= 10 ? '#f0f' : (game.combo >= 5 ? '#ff0' : '#fff');
        ctx.font = `bold ${isMobile ? 24 : 32}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`${game.combo}x COMBO`, 0, 0);
        ctx.fillStyle = '#aaa';
        ctx.font = `${isMobile ? 10 : 14}px Arial`;
        ctx.fillText(`+${Math.floor(game.combo * 10)}% Score`, 0, 20);
        ctx.restore();
        ctx.textAlign = 'left';
    }

    if (!isMobile) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`💰 ${game.coins}`, 20, HEIGHT - 80);
        if (game.extraLives > 0) {
            ctx.fillStyle = '#ff0';
            ctx.fillText(`❤ ${game.extraLives}`, 100, HEIGHT - 80);
        }

        ctx.fillStyle = '#0ff';
        ctx.font = '14px monospace';
        const liveSquad = game.squad.filter(p => !p.dead).length;
        ctx.fillText(`SQUAD: ${liveSquad}`, 20, HEIGHT - 55);
        
        const enemiesLeft = game.entities.filter(e => e instanceof Enemy && !e.dead).length;
        ctx.fillText(`ENEMIES: ${enemiesLeft}`, 20, HEIGHT - 35);

        ctx.fillStyle = '#666';
        ctx.font = '11px monospace';
        ctx.fillText('SPACE: Dash | R: Reload | M: Minimap | ESC: Pause', 20, HEIGHT - 12);

        const leader = game.squad[0];
        if (leader) {
            const dashPct = Math.min(1, 1 - leader.dashTimer / leader.dashCooldown);
            ctx.fillStyle = '#222';
            ctx.fillRect(WIDTH - 120, HEIGHT - 35, 100, 12);
            ctx.fillStyle = dashPct >= 1 ? '#0ff' : '#055';
            ctx.fillRect(WIDTH - 120, HEIGHT - 35, 100 * dashPct, 12);
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText('DASH', WIDTH - 118, HEIGHT - 25);
        }
    }

    // CD 게이지를 Rage 게이지로 표시
    const leader = game.squad[0];
    if (leader) {
        const ragePct = leader.rageGauge / leader.maxRageGauge;
        const staminaBarEl = document.getElementById('stamina-bar');
        if (staminaBarEl) {
            staminaBarEl.style.width = (ragePct * 100) + '%';
            // Rage 모드일 때 번쩍이는 효과
            if (leader.rageMode) {
                const flash = Math.sin(game.time * 20) * 0.5 + 0.5;
                staminaBarEl.style.background = `linear-gradient(90deg, rgba(255, ${Math.floor(255 * flash)}, 0, 1), rgba(255, ${Math.floor(200 * flash)}, 0, 1))`;
            } else {
                staminaBarEl.style.background = 'linear-gradient(90deg, #0ff, #088)';
            }
        }
    }

    const waveProgress = game.enemiesSpawned > 0 ? game.killsThisWave / game.enemiesSpawned : 0;
    ctx.fillStyle = '#222';
    ctx.fillRect(WIDTH/2 - 100, isMobile ? 50 : 20, 200, 8);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(WIDTH/2 - 100, isMobile ? 50 : 20, 200 * Math.min(1, waveProgress), 8);
}

function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${isMobile ? 36 : 48}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', WIDTH/2, HEIGHT/2 - 50);
    ctx.font = `${isMobile ? 16 : 20}px Arial`;
    ctx.fillText(isMobile ? 'Tap pause button to resume' : 'Press ESC to resume', WIDTH/2, HEIGHT/2 + 10);
    
    ctx.font = `${isMobile ? 14 : 16}px Arial`;
    ctx.fillStyle = '#0ff';
    ctx.fillText(`High Score: ${persistent.highScore}`, WIDTH/2, HEIGHT/2 + 60);
    ctx.fillText(`High Wave: ${persistent.highWave}`, WIDTH/2, HEIGHT/2 + 85);
    ctx.fillText(`Total Kills: ${persistent.totalKills}`, WIDTH/2, HEIGHT/2 + 110);
    ctx.textAlign = 'left';
}

function updateStartScreen() {
    const coinsEl = document.getElementById('coins-display');
    if (coinsEl) coinsEl.innerText = persistent.coins;
    const hsEl = document.getElementById('high-score');
    if (hsEl) hsEl.innerText = persistent.highScore;
}

function init() {
    loadPersistent();
    resize();
    Input.init();
    updateStartScreen();

    function handleStageSelectClick(clientX, clientY) {
        if (!game.showStageSelect || !stageSelectOverlay) return;
        const rect = stageSelectOverlay.getBoundingClientRect();
        let cx, cy;
        if (rect.width > 0 && rect.height > 0) {
            const scaleX = WIDTH / rect.width;
            const scaleY = HEIGHT / rect.height;
            cx = (clientX - rect.left) * scaleX;
            cy = (clientY - rect.top) * scaleY;
        } else {
            cx = clientX;
            cy = clientY;
        }
        game.stageSelectLastTap = { t: performance.now(), x: clientX, y: clientY, cx, cy };
        const hit = getStageNodeAt(cx, cy);
        if (hit) { selectStage(hit.node); }
    }
    if (stageSelectOverlay) {
        stageSelectOverlay.addEventListener('click', e => handleStageSelectClick(e.clientX, e.clientY));
        stageSelectOverlay.addEventListener('pointerup', e => {
            e.preventDefault();
            handleStageSelectClick(e.clientX, e.clientY);
        }, { passive: false });
        stageSelectOverlay.addEventListener('touchend', e => {
            e.preventDefault();
            if (e.changedTouches && e.changedTouches[0]) {
                const t = e.changedTouches[0];
                handleStageSelectClick(t.clientX, t.clientY);
            }
        }, { passive: false });
        stageSelectOverlay.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    }
    startScreen.querySelector('#start-btn').addEventListener('click', startGame);
    gameOverScreen.querySelector('#restart-btn').addEventListener('click', startGame);
    
    startScreen.querySelector('#start-btn').addEventListener('touchend', e => {
        e.preventDefault(); startGame();
    });
    gameOverScreen.querySelector('#restart-btn').addEventListener('touchend', e => {
        e.preventDefault(); startGame();
    });
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    persistent.gamesPlayed++;
    savePersistent();

    game = {
        active: true, over: false, paused: false,
        lastTime: performance.now(), time: 0,
        camera: { x: 0, y: 0 },
        score: 0, wave: 1, enemiesSpawned: 0, coins: 0,
        state: 'COMBAT', shake: 0, spawnTimer: 0,
        entities: [], squad: [], projectiles: [],
        skillEffects: [], particles: [], loots: [],
        damageNumbers: [], muzzleFlashes: [], footprints: [],
        environmentObjects: [], waveDrops: ['hp', 'gun', 'squad', 'invincibility'],
        upgradeChoices: [], showUpgradeUI: false, invalidUpgradeMessage: '', invalidUpgradeMessageTimer: 0,
        showStageSelect: false, stageLevel: 1,
        clearedStages: [], currentStageId: 0, currentStageVariant: 'normal',
        treasureChestSpawned: false, treasureCollected: false,
        objectiveActive: false, objectiveSpawned: false, objectiveInteractTimer: 0,
        objectiveX: 0, objectiveY: 0, objectiveW: 60, objectiveH: 50,
        invalidStageMessage: '', invalidStageMessageTimer: 0,
        combo: 0, comboTimer: 0, maxCombo: 0,
        lootMagnet: 100, warnings: [], killsThisWave: 0,
        showMinimap: true, difficulty: 1.0, explosionFlash: 0, extraLives: 0, lastCoinRevive: null, stageSelectLastTap: null
    };

    scoreEl.innerText = '0';
    waveEl.innerText = '1';

    const leader = new Player(WIDTH / 2, HEIGHT / 2, true, null);
    game.squad.push(leader);

    generateEnvironment();
    updateAmmoUI();
    hpBar.style.width = '100%';
    
    requestAnimationFrame(loop);
}

function endGame() {
    game.active = false;
    game.over = true;
    
    persistent.coins += game.coins;
    if (game.score > persistent.highScore) persistent.highScore = Math.floor(game.score);
    if (game.wave > persistent.highWave) persistent.highWave = game.wave;
    savePersistent();

    document.getElementById('final-score').innerText = Math.floor(game.score);
    
    const statsDiv = document.getElementById('final-stats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <p>Wave: ${game.wave} | Coins: +${game.coins}</p>
            <p>Max Combo: ${game.maxCombo}x</p>
            <p>Total Coins: ${persistent.coins}</p>
        `;
    }
    
    gameOverScreen.classList.remove('hidden');
}

function loop(ts) {
    if (!game.active) return;

    const dt = Math.min((ts - game.lastTime) / 1000, 0.1);
    game.lastTime = ts;
    
    if (!game.paused && !game.showUpgradeUI && !game.showStageSelect) {
        game.time += dt;

        if (game.combo > 0) {
            game.comboTimer -= dt;
            if (game.comboTimer <= 0) game.combo = 0;
        }

        game.squad.forEach(p => p.update(dt));
        game.entities.forEach(e => e.update(dt));
        game.entities = game.entities.filter(e => !e.dead);

        spawnEnemies(dt);

        game.projectiles.forEach(p => { if (p.owner && p.owner.dead) p.remove = true; });
        game.projectiles.forEach(p => p.update(dt));
        game.projectiles = game.projectiles.filter(p => !p.remove);

        game.skillEffects.forEach(s => s.update(dt));
        game.skillEffects = game.skillEffects.filter(s => !s.remove);
        
        if (game.explosionFlash > 0) game.explosionFlash -= dt;

        game.particles.forEach(p => p.update(dt));
        game.particles = game.particles.filter(p => p.life > 0);

        game.damageNumbers.forEach(d => d.update(dt));
        game.damageNumbers = game.damageNumbers.filter(d => d.life > 0);

        game.muzzleFlashes.forEach(m => m.update(dt));
        game.muzzleFlashes = game.muzzleFlashes.filter(m => m.life > 0);

        game.footprints.forEach(f => f.update(dt));
        game.footprints = game.footprints.filter(f => f.life > 0);

        game.warnings.forEach(w => w.update(dt));
        game.warnings = game.warnings.filter(w => w.life > 0);

        game.loots.forEach(l => l.update(dt));

        checkCollisions();

        // 카메라 고정: 캐릭터가 화면 어디로든 이동할 수 있도록 (배경 고정 모드)
        game.camera.x = 0;
        game.camera.y = 0;

        if (game.shake > 0) game.shake *= 0.9;
        if (game.shake < 0.5) game.shake = 0;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 고정 배경: 캐릭터가 움직여도 배경은 화면에 고정
    if (ASSETS.spaceBg.complete && ASSETS.spaceBg.naturalWidth > 0) {
        ctx.drawImage(ASSETS.spaceBg, 0, 0, ASSETS.spaceBg.naturalWidth, ASSETS.spaceBg.naturalHeight, 0, 0, WIDTH, HEIGHT);
    } else {
        const bg = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 0, WIDTH/2, HEIGHT/2, Math.max(WIDTH, HEIGHT));
        bg.addColorStop(0, '#0a0a1a');
        bg.addColorStop(0.5, '#050510');
        bg.addColorStop(1, '#000005');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const sx = (Math.random() - 0.5) * game.shake;
    const sy = (Math.random() - 0.5) * game.shake;

    ctx.translate(-game.camera.x + sx, -game.camera.y + sy);

    game.environmentObjects.forEach(e => e.draw(ctx));
    game.footprints.forEach(f => f.draw(ctx));
    game.loots.forEach(l => l.draw(ctx));

    if (game.objectiveActive && game.objectiveSpawned) {
        const ox = game.objectiveX, oy = game.objectiveY, ow = game.objectiveW, oh = game.objectiveH;
        ctx.fillStyle = 'rgba(40, 80, 120, 0.9)';
        ctx.fillRect(ox, oy, ow, oh);
        ctx.strokeStyle = '#5ab';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, ow, oh);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('목표', ox + ow/2, oy + oh/2 - 6);
        const t = game.objectiveInteractTimer || 0;
        ctx.font = '10px Arial';
        ctx.fillText(t >= 2 ? '완료!' : (t > 0 ? Math.ceil(2 - t) + '초' : '[E] 또는 2초 대기'), ox + ow/2, oy + oh/2 + 8);
        ctx.textAlign = 'left';
    }
    
    game.entities.sort((a, b) => (a.y + a.h) - (b.y + b.h));
    game.entities.forEach(e => e.draw(ctx));
    game.squad.forEach(p => p.draw(ctx));

    game.muzzleFlashes.forEach(m => m.draw(ctx));
    game.projectiles.forEach(p => p.draw(ctx));
    game.skillEffects.forEach(s => s.draw(ctx));
    game.particles.forEach(p => p.draw(ctx));
    game.damageNumbers.forEach(d => d.draw(ctx));

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    game.warnings.forEach(w => w.draw(ctx));

    drawPostProcessing();
    
    if (game.explosionFlash > 0) {
        ctx.fillStyle = `rgba(255, 200, 100, ${game.explosionFlash * 0.5})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    
    drawCrosshair();
    drawHUD();
    
    if (game.showMinimap) drawMinimap();
    if (game.showUpgradeUI) drawUpgradeUI();
    if (game.showStageSelect) {
        document.body.classList.add('stage-select');
        if (stageSelectOverlay) {
            stageSelectOverlay.classList.remove('hidden');
            stageSelectOverlay.classList.add('active');
            const overNode = isOverSelectableStageNode(Input.mouse.x, Input.mouse.y);
            stageSelectOverlay.style.cursor = overNode ? 'pointer' : 'default';
        }
        drawStageSelectUI();
    } else {
        document.body.classList.remove('stage-select');
        if (stageSelectOverlay) {
            stageSelectOverlay.classList.add('hidden');
            stageSelectOverlay.classList.remove('active');
        }
    }
    if (game.paused && !game.showUpgradeUI && !game.showStageSelect) drawPauseScreen();

    requestAnimationFrame(loop);
}

init();