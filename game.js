const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    beast: new Image(), item_hp: new Image(), item_gun: new Image()
};
ASSETS.hero.src = 'hero.png';
ASSETS.grunt.src = 'grunt.png';
ASSETS.wasp.src = 'wasp.png';
ASSETS.beast.src = 'beast.png';
ASSETS.item_hp.src = 'item_hp.png';
ASSETS.item_gun.src = 'item_gun.png';

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
    laser: { name: 'LASER', fireRate: 0.05, damage: 3, ammo: 100, spread: 0.02, projectiles: 1, speed: 2500, size: 2, color: '#f0f' },
    rocket: { name: 'ROCKET', fireRate: 1.0, damage: 120, ammo: 6, spread: 0, projectiles: 1, speed: 700, size: 14, color: '#f80', explosive: true, explosionRadius: 180 }
};

const UPGRADES = [
    { id: 'hp_boost', name: 'VITALITY', desc: '+30 Max HP', icon: 'hp', apply: () => { game.squad.forEach(s => { s.maxHp += 30; s.hp = s.maxHp; }); hpBar.style.width = '100%'; }},
    { id: 'damage', name: 'FIREPOWER', desc: '+25% Damage', icon: 'gun', apply: () => { game.squad.forEach(s => s.bulletDamage *= 1.25); }},
    { id: 'fire_rate', name: 'RAPIDFIRE', desc: '+20% Fire Rate', icon: 'gun', apply: () => { game.squad.forEach(s => s.fireRate *= 0.8); }},
    { id: 'ammo', name: 'DEEP POCKETS', desc: '+50% Ammo', icon: 'gun', apply: () => { game.squad.forEach(s => { s.maxAmmo = Math.floor(s.maxAmmo * 1.5); s.ammo = s.maxAmmo; }); }},
    { id: 'speed', name: 'SWIFT', desc: '+15% Speed', icon: 'hero', apply: () => { game.squad.forEach(s => s.speed *= 1.15); }},
    { id: 'regen', name: 'REGENERATION', desc: 'Slow HP Regen', icon: 'hp', apply: () => { game.squad.forEach(s => s.hasRegen = true); }},
    { id: 'piercing', name: 'PIERCING', desc: 'Bullets Pierce', icon: 'gun', apply: () => { game.squad.forEach(s => s.piercing = (s.piercing || 0) + 1); }},
    { id: 'shotgun', name: 'SHOTGUN', desc: 'Spread Weapon', icon: 'gun', apply: () => { game.squad.forEach(s => s.setWeapon('shotgun')); }},
    { id: 'laser', name: 'LASER GUN', desc: 'Rapid Fire', icon: 'gun', apply: () => { game.squad.forEach(s => s.setWeapon('laser')); }},
    { id: 'rocket', name: 'ROCKET', desc: 'Explosive', icon: 'gun', apply: () => { game.squad.forEach(s => s.setWeapon('rocket')); }},
    { id: 'crit', name: 'CRITICAL', desc: '+15% Crit', icon: 'gun', apply: () => { game.squad.forEach(s => s.critChance = (s.critChance || 0.05) + 0.15); }},
    { id: 'magnet', name: 'MAGNET', desc: 'Attract Loot', icon: 'hp', apply: () => { game.lootMagnet = (game.lootMagnet || 100) + 150; }}
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
    upgradeChoices: [], showUpgradeUI: false,
    combo: 0, comboTimer: 0, maxCombo: 0,
    lootMagnet: 100, warnings: [], killsThisWave: 0,
    difficulty: 1.0
};

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
            if (e.code === 'KeyM') game.showMinimap = !game.showMinimap;
            if (e.code === 'Escape' && game.active) game.paused = !game.paused;
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.code === 'KeyR') game.squad.forEach(p => p.reload());
        });

        canvas.addEventListener('mousemove', e => {
            const r = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - r.left;
            this.mouse.y = e.clientY - r.top;
            this.lastMove = performance.now();
        });
        canvas.addEventListener('mousedown', e => {
            this.mouse.down = true;
            if (game.showUpgradeUI) {
                const choice = getUpgradeChoiceAt(e.clientX, e.clientY);
                if (choice !== -1) selectUpgrade(choice);
            }
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
            const canvasX = touch.clientX - rect.left;
            const canvasY = touch.clientY - rect.top;
            
            if (game.showUpgradeUI) {
                const choice = getUpgradeChoiceAt(canvasX, canvasY);
                if (choice !== -1) { selectUpgrade(choice); return; }
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
            const canvasX = touch.clientX - rect.left;
            const canvasY = touch.clientY - rect.top;
            
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

class Player extends Entity {
    constructor(x, y, isLeader = false, followTarget = null) {
        const scale = isMobile ? 0.6 : 1;
        super(x, y, 60 * scale, 90 * scale);
        this.isLeader = isLeader;
        this.followTarget = followTarget;
        this.speed = 200 * (1 + persistent.upgrades.speed * 0.03);
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
                    this.vx = moveDir.x * this.speed;
                    this.vy = moveDir.y * this.speed;
                    if (Math.abs(moveDir.x) > 0.1) this.facingRight = moveDir.x > 0;
                } else if (!isMobile) {
                    const targetX = Input.mouse.x + game.camera.x;
                    const targetY = Input.mouse.y + game.camera.y;
                    const dx = targetX - (this.x + this.w / 2);
                    const dy = targetY - (this.y + this.h / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const isMouseMoving = (performance.now() - Input.lastMove) < 100;
                    if (dist > 10 && isMouseMoving) {
                        this.vx = (dx / dist) * this.speed;
                        this.vy = (dy / dist) * this.speed;
                        this.facingRight = (dx > 0);
                    } else { this.vx = 0; this.vy = 0; }
                } else { this.vx = 0; this.vy = 0; }
            } else {
                if (this.followTarget && !this.followTarget.dead) {
                    const dx = this.followTarget.x - this.x;
                    const dy = this.followTarget.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 50) {
                        this.vx = (dx / dist) * this.speed * 1.2;
                        this.vy = (dy / dist) * this.speed * 1.2;
                        this.facingRight = (dx > 0);
                    } else { 
                        this.vx = 0; 
                        this.vy = 0; 
                    }
                } else {
                    const leader = game.squad.find(p => p.isLeader && !p.dead);
                    if (leader && leader !== this) {
                        const dx = leader.x - this.x;
                        const dy = leader.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 50) {
                            this.vx = (dx / dist) * this.speed * 1.2;
                            this.vy = (dy / dist) * this.speed * 1.2;
                            this.facingRight = (dx > 0);
                        } else {
                            this.vx = 0;
                            this.vy = 0;
                        }
                    }
                }
            }
        }

        this.invulnerable = Math.max(0, this.invulnerable - dt);

        if (this.hasRegen && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 3 * dt);
            if (this.isLeader) hpBar.style.width = (this.hp / this.maxHp * 100) + '%';
        }

        this.footprintTimer -= dt;
        if (this.footprintTimer <= 0 && (Math.abs(this.vx) > 10 || Math.abs(this.vy) > 10)) {
            game.footprints.push(new Footprint(this.x + this.w/2, this.y + this.h, Math.atan2(this.vy, this.vx)));
            this.footprintTimer = 0.3;
        }

        if (this.ammo <= 0 && !this.reloading) this.reload();

        const hasTarget = game.entities.some(e => e instanceof Enemy && !e.dead);
        const shouldFire = isMobile ? hasTarget : (Input.mouse.down && hasTarget);
        
        if (shouldFire && !this.reloading && this.ammo > 0 && !game.showUpgradeUI && !game.paused) {
            if (game.time - this.lastShot > this.fireRate) this.shoot();
        }

        if (this.reloading && game.time > this.reloadEndTime) {
            this.ammo = this.maxAmmo;
            this.reloading = false;
        }

        if (this.skillType) {
            this.skillTimer -= dt;
            if (this.skillTimer <= 0) {
                this.triggerSkill();
                this.skillTimer = this.skillCooldown;
            }
        }
        this.applyGravity(dt);
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
            const chainEffect = new SkillEffect(cx, cy, 'CHAINLIGHTNING', this.bulletDamage * 0.6);
            chainEffect.owner = this;
            chainEffect.maxChains = 5;
            chainEffect.chainRange = 700;
            game.skillEffects.push(chainEffect);
        } else if (this.skillType === 'HEAL') {
            game.squad.forEach(m => { if (!m.dead) m.hp = Math.min(m.maxHp, m.hp + 25); });
            game.skillEffects.push(new SkillEffect(cx, cy, 'HEAL', 0));
            if (game.squad[0]) hpBar.style.width = (game.squad[0].hp / game.squad[0].maxHp * 100) + '%';
        }
    }

    getNearestEnemy() {
        let nearest = null, minDist = Infinity;
        game.entities.forEach(e => {
            if (e instanceof Enemy && !e.dead) {
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
        let baseAngle = target ? Math.atan2(target.y + target.h/2 - cy, target.x + target.w/2 - cx) :
            (this.isLeader ? Math.atan2(Input.mouse.y + game.camera.y - cy, Input.mouse.x + game.camera.x - cx) : (this.facingRight ? 0 : Math.PI));

        const isCrit = Math.random() < this.critChance;
        const damage = this.bulletDamage * (isCrit ? 2 : 1);

        for (let i = 0; i < w.projectiles; i++) {
            const spread = (Math.random() - 0.5) * w.spread * 2;
            const p = new Projectile(cx, cy, baseAngle + spread, w.speed, damage * 0.7, true, w.size, w.color);
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
        if (this.hp <= 0) { this.hp = 0; this.dead = true; if (this.isLeader) endGame(); }
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
            ctx.shadowBlur = 30 + Math.sin(game.time * 6) * 15;
            ctx.shadowColor = '#0ff';
        }

        if (ASSETS.hero.complete && ASSETS.hero.naturalWidth > 0) {
            const imgW = 90 * this.scale, imgH = 100 * this.scale;
            ctx.drawImage(ASSETS.hero, -imgW/2, -imgH/2, imgW, imgH);
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
        const scale = isMobile ? 0.6 : 1;
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

        const waveBonus = game.wave <= 3 ? 1 + (game.wave - 1) * 0.05 : 
                          game.wave <= 7 ? 1.1 + (game.wave - 3) * 0.15 :
                          game.wave <= 10 ? 1.7 + (game.wave - 7) * 0.25 :
                          2.45 + (game.wave - 10) * 0.35;
        
        const stats = {
            grunt: { hp: 50 * waveBonus, speed: 90 + game.wave * 6, score: 100, coins: 5, w: 70, h: 90, damage: 5 + game.wave * 1.5 },
            wasp: { hp: 30 * waveBonus, speed: 160 + game.wave * 10, score: 150, coins: 8, w: 50, h: 50, damage: 4 + game.wave * 1.2 },
            beast: { hp: 400 * waveBonus, speed: 50 + game.wave * 4, score: 1000, coins: 50, w: 150, h: 130, damage: 15 + game.wave * 2.5 },
            sniper: { hp: 35 * waveBonus, speed: 60 + game.wave * 4, score: 200, coins: 15, w: 60, h: 80, damage: 12 + game.wave * 2.5 },
            bomber: { hp: 45 * waveBonus, speed: 140 + game.wave * 12, score: 250, coins: 20, w: 50, h: 50, damage: 25 + game.wave * 3.5 },
            boss: { hp: 1500 + game.wave * 600, speed: 40 + game.wave * 4, score: 5000, coins: 200, w: 200, h: 180, damage: 20 + game.wave * 4 }
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
        } else if (this.type === 'boss') {
            this.updateBossAI(dt, target, dist, dirX, dirY);
        }

        this.facingRight = this.vx > 0 || (this.vx === 0 && dx > 0);
        this.applyGravity(dt);
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
            const bulletSpeed = 900;
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
        
        if (pattern === 0) {
            const a = Math.atan2(target.y - cy, target.x - cx);
            for (let i = 0; i < 9; i++) {
                const p = new Projectile(cx, cy, a - 0.6 + i * 0.15, 400, 15, false, 8, '#f00');
                p.isBossProjectile = true;
                p.life = 10;
                game.projectiles.push(p);
            }
        } else if (pattern === 1) {
            for (let i = 0; i < 16; i++) {
                setTimeout(() => {
                    if (!this.dead) {
                        const p = new Projectile(cx, cy, game.time * 5 + i * Math.PI / 8, 350, 12, false, 6, '#ff0');
                        p.isBossProjectile = true;
                        p.life = 10;
                        game.projectiles.push(p);
                    }
                }, i * 50);
            }
        } else if (pattern === 2) {
            for (let i = 0; i < 4; i++) {
                const p = new Projectile(cx, cy, Math.atan2(target.y - cy, target.x - cx) + (i - 1.5) * 0.4, 200, 18, false, 10, '#f80');
                p.homing = true;
                p.homingStrength = 4;
                p.isBossProjectile = true;
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
                const p = new Projectile(cx, cy, i * Math.PI / 10, 250, 10, false, 5, '#f0f');
                p.isBossProjectile = true;
                p.life = 10;
                game.projectiles.push(p);
            }
        }
    }

    takeDamage(dmg, isCrit = false) {
        this.hp -= dmg;
        game.damageNumbers.push(new DamageNumber(this.x + this.w/2 + (Math.random() - 0.5) * 30, this.y, dmg, isCrit));
        game.particles.push(new HitSpark(this.x + this.w/2, this.y + this.h/2, isCrit ? '#ff0' : '#fff'));

        if (this.hp <= 0) {
            this.hp = 0; this.dead = true;
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
                    game.loots.push(new Loot(this.x + this.w/2 + (Math.random() - 0.5) * 150, this.y + this.h/2 + (Math.random() - 0.5) * 150, ['hp', 'gun', 'squad'][i]));
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

        if (img && img.complete && img.naturalWidth > 0) {
            if (this.type === 'sniper') ctx.filter = 'hue-rotate(180deg)';
            if (this.type === 'bomber') ctx.filter = 'hue-rotate(30deg) saturate(2)';
            
            if (this.type === 'beast') ctx.drawImage(img, -80 * this.scale, -70 * this.scale, 160 * this.scale, 140 * this.scale);
            else if (this.type === 'boss') ctx.drawImage(img, -100 * this.scale, -90 * this.scale, 200 * this.scale, 180 * this.scale);
            else if (this.type === 'wasp' || this.type === 'bomber') ctx.drawImage(img, -30 * this.scale, -30 * this.scale, 60 * this.scale, 60 * this.scale);
            else ctx.drawImage(img, -40 * this.scale, -50 * this.scale, 80 * this.scale, 100 * this.scale);
            
            ctx.filter = 'none';
        } else {
            const colors = { grunt: '#0f0', wasp: '#ff0', beast: '#f0f', boss: '#f0f', sniper: '#a00', bomber: '#f80' };
            ctx.fillStyle = colors[this.type] || '#0f0';
            if (this.type === 'bomber') {
                ctx.beginPath(); ctx.arc(0, 0, this.w/2, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            }
        }

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
        this.trail.push({ x: this.x, y: this.y, life: 0.1 });
        this.trail = this.trail.filter(t => { t.life -= dt; return t.life > 0; });

        if (this.homing) {
            const targets = this.isPlayer ? game.entities.filter(e => e instanceof Enemy && !e.dead) : game.squad.filter(p => !p.dead && p.isLeader);
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
                const dist = Math.sqrt((e.x + e.w/2 - this.x)**2 + (e.y + e.h/2 - this.y)**2);
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
            
            if (dist < game.lootMagnet) {
                const t = 1 - (dist / game.lootMagnet);
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
        ctx.shadowColor = this.type === 'hp' ? '#0f0' : (this.type === 'gun' ? '#0ff' : '#ff0');
        let img = this.type === 'hp' ? ASSETS.item_hp : (this.type === 'gun' ? ASSETS.item_gun : ASSETS.hero);
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
        const labels = { hp: 'HEAL', gun: 'UPGRADE', squad: 'ALLY' };
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
    game.showUpgradeUI = true;
    game.paused = true;
    game.upgradeChoices = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
}

function selectUpgrade(index) {
    if (index < 0 || index >= game.upgradeChoices.length) return;
    game.upgradeChoices[index].apply();
    game.showUpgradeUI = false;
    game.paused = false;
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
    return -1;
}

function drawUpgradeUI() {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#0ff'; 
    ctx.font = `bold ${isMobile ? 24 : 36}px Arial`; 
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE UPGRADE', WIDTH / 2, isMobile ? 50 : 70);
    ctx.fillStyle = '#888'; 
    ctx.font = `${isMobile ? 12 : 16}px Arial`;
    ctx.fillText(isMobile ? 'Tap to select' : 'Press 1, 2, 3 or Click', WIDTH / 2, isMobile ? 75 : 100);

    const cardW = isMobile ? 150 : 200;
    const cardH = isMobile ? 200 : 280;
    const gap = isMobile ? 15 : 30;
    const startX = (WIDTH - cardW * 3 - gap * 2) / 2;
    const startY = (HEIGHT - cardH) / 2;

    game.upgradeChoices.forEach((up, i) => {
        const cx = startX + i * (cardW + gap);
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(cx, startY, cardW, cardH);
        ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2; ctx.strokeRect(cx, startY, cardW, cardH);
        if (!isMobile) {
            ctx.fillStyle = '#0ff'; ctx.font = 'bold 24px Arial';
            ctx.fillText(`[${i + 1}]`, cx + cardW / 2, startY + 35);
        }
        const iconImg = up.icon === 'hp' ? ASSETS.item_hp : (up.icon === 'gun' ? ASSETS.item_gun : ASSETS.hero);
        const iconY = isMobile ? startY + 20 : startY + 50;
        const iconSize = isMobile ? 50 : 60;
        if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
            ctx.drawImage(iconImg, cx + cardW/2 - iconSize/2, iconY, iconSize, iconSize);
        } else {
            ctx.fillStyle = '#0ff'; ctx.font = `${isMobile ? 36 : 48}px Arial`;
            ctx.fillText('?', cx + cardW / 2, iconY + iconSize - 10);
        }
        ctx.fillStyle = '#fff'; ctx.font = `bold ${isMobile ? 14 : 18}px Arial`;
        ctx.fillText(up.name, cx + cardW / 2, isMobile ? startY + 100 : startY + 140);
        ctx.fillStyle = '#aaa'; ctx.font = `${isMobile ? 11 : 14}px Arial`;
        ctx.fillText(up.desc, cx + cardW / 2, isMobile ? startY + 125 : startY + 170);
    });
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
            ctx.fillStyle = l.type === 'hp' ? '#0f0' : (l.type === 'gun' ? '#0ff' : '#ff0');
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
    
    const isBossWave = game.wave % 5 === 0;
    const baseCount = game.wave <= 3 ? 8 + game.wave * 3 :
                      game.wave <= 7 ? 17 + (game.wave - 3) * 5 :
                      game.wave <= 10 ? 37 + (game.wave - 7) * 8 :
                      61 + (game.wave - 10) * 12;
    const limit = isBossWave ? 1 : Math.min(baseCount, 150);

    if (game.enemiesSpawned >= limit && game.entities.filter(e => e instanceof Enemy).length === 0) {
        showUpgradeSelection();
        nextWave();
        return;
    }
    if (game.enemiesSpawned >= limit) return;

    game.spawnTimer -= dt;
    const spawnRate = game.wave <= 3 ? Math.max(0.4, 5.0 / limit) :
                      game.wave <= 7 ? Math.max(0.2, 4.0 / limit) :
                      game.wave <= 10 ? Math.max(0.1, 3.0 / limit) :
                      Math.max(0.06, 2.0 / limit);
    
    if (game.spawnTimer <= 0) {
        game.spawnTimer = isBossWave ? 0 : spawnRate;

        let type = 'grunt';
        if (isBossWave) type = 'boss';
        else {
            const r = Math.random();
            if (game.wave >= 2 && r > 0.75) type = 'wasp';
            if (game.wave >= 4 && r > 0.85) type = 'sniper';
            if (game.wave >= 5 && r > 0.9) type = 'bomber';
            if (game.wave >= 7 && r > 0.95) type = 'beast';
            if (game.wave >= 10) {
                if (r > 0.6) type = 'wasp';
                if (r > 0.75) type = 'sniper';
                if (r > 0.85) type = 'bomber';
                if (r > 0.92) type = 'beast';
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
        const dist = Math.max(WIDTH, HEIGHT) * 0.4;
        const sx = leader.x + Math.cos(angle) * dist;
        const sy = leader.y + Math.sin(angle) * dist;

        const e = new Enemy(sx, sy, type, drop);
        game.entities.push(e);
        game.enemiesSpawned++;

        if (type === 'boss' || type === 'bomber' || type === 'beast') {
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
                game.squad.forEach(s => { s.hp = Math.min(s.maxHp, s.hp + 40); });
                if (game.squad[0]) hpBar.style.width = (game.squad[0].hp / game.squad[0].maxHp * 100) + '%';
                game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, '+40 HP', false));
            } else if (l.type === 'gun') {
                game.squad.forEach(s => { s.bulletDamage += 3; s.maxAmmo += 5; s.ammo = s.maxAmmo; });
                game.damageNumbers.push(new DamageNumber(leader.x + leader.w/2, leader.y, 'UPGRADE!', true));
            } else if (l.type === 'squad') {
                const skills = ['NOVA', 'SHOCKWAVE', 'CHAINLIGHTNING', 'HEAL'];
                const usedSkills = game.squad.map(s => s.skillType).filter(s => s);
                const availableSkills = skills.filter(s => !usedSkills.includes(s));
                
                if (availableSkills.length > 0) {
                    const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
                    const last = game.squad[game.squad.length - 1];
                    const nm = new Player(last.x, last.y, false, last);
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
    game.waveDrops = ['hp', 'gun', 'squad'];
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
            if (!isOnScreen(e)) return;
            if (p.x > e.x && p.x < e.x + e.w && p.y > e.y && p.y < e.y + e.h) {
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
            
            if (p.x > s.x && p.x < s.x + s.w && p.y > s.y && p.y < s.y + s.h) {
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

    const leader = game.squad[0];
    if (leader) {
        const dashPct = Math.min(1, 1 - leader.dashTimer / leader.dashCooldown);
        const staminaBarEl = document.getElementById('stamina-bar');
        if (staminaBarEl) staminaBarEl.style.width = (dashPct * 100) + '%';
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
        environmentObjects: [], waveDrops: ['hp', 'gun', 'squad'],
        upgradeChoices: [], showUpgradeUI: false,
        combo: 0, comboTimer: 0, maxCombo: 0,
        lootMagnet: 100, warnings: [], killsThisWave: 0,
        showMinimap: true, difficulty: 1.0, explosionFlash: 0
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
    
    if (!game.paused && !game.showUpgradeUI) {
        game.time += dt;

        if (game.combo > 0) {
            game.comboTimer -= dt;
            if (game.comboTimer <= 0) game.combo = 0;
        }

        game.squad.forEach(p => p.update(dt));
        game.entities.forEach(e => e.update(dt));
        game.entities = game.entities.filter(e => !e.dead);

        spawnEnemies(dt);

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

        const leader = game.squad.find(p => p.isLeader) || game.squad[0];
        if (leader) {
            game.camera.x += (leader.x - WIDTH / 2 - game.camera.x) * 5 * dt;
            game.camera.y += (leader.y - HEIGHT / 2 - game.camera.y) * 5 * dt;
        }

        if (game.shake > 0) game.shake *= 0.9;
        if (game.shake < 0.5) game.shake = 0;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 0, WIDTH/2, HEIGHT/2, WIDTH);
    bg.addColorStop(0, '#0a0a15');
    bg.addColorStop(1, '#030308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const sx = (Math.random() - 0.5) * game.shake;
    const sy = (Math.random() - 0.5) * game.shake;

    ctx.strokeStyle = '#151520';
    ctx.lineWidth = 1;
    const ox = -game.camera.x % 100, oy = -game.camera.y % 100;
    ctx.beginPath();
    for (let x = ox; x < WIDTH; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); }
    for (let y = oy; y < HEIGHT; y += 100) { ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); }
    ctx.stroke();

    ctx.translate(-game.camera.x + sx, -game.camera.y + sy);

    game.environmentObjects.forEach(e => e.draw(ctx));
    game.footprints.forEach(f => f.draw(ctx));
    game.loots.forEach(l => l.draw(ctx));
    
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
    if (game.paused && !game.showUpgradeUI) drawPauseScreen();

    requestAnimationFrame(loop);
}

init();