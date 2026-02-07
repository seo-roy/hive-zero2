/**
 * 코인/업그레이드 밸런스 시뮬레이션 (30회)
 * node simulate_balance.js 로 실행
 */
const BASE_COIN = 4;
const BOSS_COIN_MULT = 3;
const TREASURE_COIN_MULT = 5;
const REVIVE_COIN_COST = 25;

const UPGRADE_COSTS = { hp_boost: 12, damage: 18, fire_rate: 16, ammo: 14, speed: 10, movement_speed: 14, regen: 22, piercing: 28, shotgun: 32, laser: 30, rocket: 45, crit: 20, magnet: 18 };

function simStage(L, variant, extraLives) {
    let coins = 0;
    const isBoss = true;
    const isTreasure = variant === 'treasure';
    
    if (isTreasure) {
        const treasureCoins = BASE_COIN * TREASURE_COIN_MULT;
        if (extraLives > 0) {
            coins += treasureCoins;
        } else {
            coins += Math.random() < 0.5 ? 0 : treasureCoins;
        }
        return { coins, extraLives: extraLives + (extraLives === 0 && Math.random() < 0.5 ? 1 : 0) };
    }
    
    const baseCount = Math.min(12 + L * 4 + Math.floor(L * L * 0.4), 160);
    const normalCount = Math.max(0, baseCount - 1);
    const bossCount = 1;
    
    const normalCoin = BASE_COIN * (0.8 + Math.random() * 0.4);
    const bossCoin = BASE_COIN * BOSS_COIN_MULT;
    
    coins += normalCount * normalCoin * (1 + (L-1)*0.1);
    coins += bossCount * bossCoin;
    
    return { coins, extraLives };
}

function simRun() {
    let totalCoins = 0;
    let extraLives = 0;
    let stagesCleared = 0;
    let deaths = 0;
    let revivesByCoin = 0;
    const variants = ['normal', 'treasure', 'double_boss', 'elite'];
    
    for (let stage = 1; stage <= 12; stage++) {
        const variant = variants[Math.floor(Math.random() * variants.length)];
        const result = simStage(stage, variant, extraLives);
        totalCoins += result.coins;
        if (result.extraLives !== undefined) extraLives = result.extraLives;
        
        const avgCost = 20;
        const canAfford = totalCoins >= avgCost;
        if (canAfford) {
            totalCoins -= avgCost;
            stagesCleared++;
        }
        
        const deathChance = 0.15 + stage * 0.02;
        if (Math.random() < deathChance) {
            if (extraLives > 0) {
                extraLives--;
                deaths++;
            } else if (totalCoins >= REVIVE_COIN_COST) {
                totalCoins -= REVIVE_COIN_COST;
                revivesByCoin++;
                deaths++;
            } else {
                break;
            }
        }
    }
    
    return { totalCoins, stagesCleared, deaths, revivesByCoin, extraLives };
}

console.log('=== 30회 밸런스 시뮬레이션 ===\n');
const results = [];
for (let i = 0; i < 30; i++) {
    results.push(simRun());
}

const avgCoins = results.reduce((s, r) => s + r.totalCoins, 0) / 30;
const avgStages = results.reduce((s, r) => s + r.stagesCleared, 0) / 30;
const avgDeaths = results.reduce((s, r) => s + r.deaths, 0) / 30;
const avgRevives = results.reduce((s, r) => s + r.revivesByCoin, 0) / 30;

console.log(`평균 최종 코인: ${avgCoins.toFixed(1)}`);
console.log(`평균 클리어 스테이지: ${avgStages.toFixed(1)}`);
console.log(`평균 사망 횟수: ${avgDeaths.toFixed(1)}`);
console.log(`평균 코인 부활: ${avgRevives.toFixed(1)}`);
console.log('\n결과: 스테이지당 약 ' + (avgCoins / Math.max(1, avgStages)).toFixed(0) + ' 코인 수급, 업그레이드 비용 10~45 범위 유지 권장');
