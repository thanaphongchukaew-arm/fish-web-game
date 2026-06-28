'use strict';

// ══════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════
const C = {
  W: 700, H: 400,
  DAY_MS:       3 * 60 * 1000,     // 3 real min = 1 game day
  HUNGER_DECAY: 100 / (8 * 60),    // depletes in 8 min
  HAPPY_DECAY:  100 / (12 * 60),   // depletes in 12 min
  DIRTY_RATE:   100 / (14 * 60),   // 100% dirty in 14 min
  HEALTH_DMGE:  100 / (5 * 60),    // die in 5 min if starving
  COIN_RATE:    1.8 / 60,          // coins/sec per happy fish
};

// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
const state = {
  day:      1,
  coins:    150,
  dirty:    0,
  dayElapsed: 0,
  fish:     [],
  particles:[],
  decors:   [],
  achievements: new Set(),
  food:     'basic',
  totalFed: 0,
  unlockedFoods: new Set(['basic']),
};

// ══════════════════════════════════════════
//  FISH DATA
// ══════════════════════════════════════════
const FTYPES = {
  goldfish: { label:'ปลาทอง',     body:'#ff8c00', tail:'#c95000', speed:1.2 },
  blue:     { label:'ปลาน้ำเงิน', body:'#0ea5e9', tail:'#0055c8', speed:1.5 },
  green:    { label:'ปลาเขียว',   body:'#22c55e', tail:'#15803d', speed:0.9 },
  pink:     { label:'ปลาชมพู',    body:'#f472b6', tail:'#be185d', speed:1.3 },
  purple:   { label:'ปลาม่วง',    body:'#a78bfa', tail:'#5b21b6', speed:1.1 },
  red:      { label:'ปลาแดง',     body:'#f87171', tail:'#991b1b', speed:1.4 },
};

const NAMES = ['นิโม่','โดรี','บับเบิ้ล','สไปค์','ลูน่า','ซันนี่','มูน','สตาร์','อาควา',
               'มาริน','คอรัล','พิกซี่','เซียน','นาจา','ริโอ','เบลล์','ซาฟิ','เพิร์ล'];
let _fishId = 0;

function makeFish(type) {
  const t = FTYPES[type] || FTYPES.goldfish;
  return {
    id: ++_fishId,
    name: NAMES[Math.floor(Math.random() * NAMES.length)] + ' ' + _fishId,
    type,
    x:  120 + Math.random() * (C.W - 240),
    y:   80 + Math.random() * (C.H - 180),
    vx: (Math.random() - .5) * t.speed * 1.5,
    vy: (Math.random() - .5) * .5,
    body:  t.body,
    tail:  t.tail,
    speed: t.speed,
    hunger:  75 + Math.random() * 20,
    health:  100,
    happy:   72 + Math.random() * 18,
    ageDays: 0,
    stage:   'baby',
    size:    0.45,
    alive:   true,
    wobble:  Math.random() * Math.PI * 2,
    eatAnim: 0,
    flip:    1,   // 1=right, -1=left
  };
}

// ══════════════════════════════════════════
//  PARTICLES
// ══════════════════════════════════════════
function pFood(x) {
  const t = state.food;
  return {
    type: 'food', x, y: 8,
    vx:  (Math.random() - .5) * .7,
    vy:  1.1 + Math.random() * .6,
    r:   t === 'premium' ? 4.5 : t === 'flake' ? 5 : 3,
    color: t === 'premium' ? '#fbbf24' : t === 'flake' ? '#f97316' : '#92400e',
    isFlake: t === 'flake',
    eaten: false,
    alpha: 1,
  };
}

function pBubble(x) {
  return {
    type: 'bubble',
    x: x ?? (40 + Math.random() * (C.W - 80)),
    y: C.H - 52,
    r:   2.5 + Math.random() * 4,
    vx:  (Math.random() - .5) * .25,
    vy: -.65 - Math.random() * .5,
    alpha: .68,
  };
}

function pFx(x, y, type) {
  return {
    type, x: x + (Math.random() - .5) * 22,
    y: y - 5 + (Math.random() - .5) * 10,
    vx: (Math.random() - .5) * 2.5,
    vy: -1.8 - Math.random() * 2,
    alpha: 1, life: 1,
  };
}

// ══════════════════════════════════════════
//  CANVAS + HELPERS
// ══════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function lighten(hex, amt, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16)        + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255,  (n & 0xff)       + amt);
  return alpha !== undefined ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
}

// ══════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, C.H);
  g.addColorStop(0,  '#001228');
  g.addColorStop(.5, '#001a3e');
  g.addColorStop(1,  '#000e20');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, C.W, C.H);

  // light rays
  const t = Date.now() * .00028;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const rx = 70 + i * 95 + Math.sin(t + i * 1.3) * 22;
    const gr = ctx.createLinearGradient(rx, 0, rx + 18, C.H * .62);
    gr.addColorStop(0, 'rgba(80,180,255,.055)');
    gr.addColorStop(1, 'rgba(80,180,255,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + 38, C.H * .62);
    ctx.lineTo(rx - 8,  C.H * .62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // water shimmer
  ctx.save();
  const ts = Date.now() * .001;
  for (let x = 0; x < C.W; x += 8) {
    const y = 2 + Math.sin(x * .06 + ts) * 2;
    ctx.fillStyle = `rgba(100,200,255,${.04 + Math.sin(x*.1+ts)*.02})`;
    ctx.fillRect(x, y, 5, 1.5);
  }
  ctx.restore();
}

function drawFloor() {
  const sg = ctx.createLinearGradient(0, C.H - 48, 0, C.H);
  sg.addColorStop(0, '#120c02');
  sg.addColorStop(1, '#1c1206');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(0, C.H - 42);
  for (let x = 0; x <= C.W; x += 18)
    ctx.lineTo(x, C.H - 42 + Math.sin(x * .09) * 4.5);
  ctx.lineTo(C.W, C.H);
  ctx.lineTo(0,   C.H);
  ctx.closePath();
  ctx.fill();

  // pebbles
  for (let i = 0; i < 14; i++) {
    const px = 30 + i * 48;
    const pr = 3.5 + Math.sin(i * 7.3) * 2.5;
    ctx.fillStyle = i % 3 === 0 ? '#2e2218' : '#251a0e';
    ctx.beginPath();
    ctx.ellipse(px, C.H - 36, pr, pr * .55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSeaweed(bx, by, h, col) {
  const t = Date.now() * .001;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth   = 4;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  for (let i = 0; i <= h; i += 9)
    ctx.lineTo(bx + Math.sin(t + i * .12 + bx * .01) * 9, by - i);
  ctx.stroke();

  ctx.strokeStyle = lighten(col, 20, 0.8);
  ctx.lineWidth   = 5;
  for (let i = 20; i < h; i += 24) {
    const sx = bx + Math.sin(t + i * .12 + bx * .01) * 9;
    ctx.beginPath();
    ctx.moveTo(sx, by - i);
    ctx.lineTo(sx + 16, by - i - 13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx, by - i);
    ctx.lineTo(sx - 16, by - i - 13);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDecors() {
  for (const d of state.decors) {
    if (d.type === 'rock') {
      ctx.fillStyle = '#383028';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.rw, d.rh, -.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#484038';
      ctx.beginPath();
      ctx.ellipse(d.x - 5, d.y - 5, d.rw * .65, d.rh * .6, .2, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'castle') {
      ctx.fillStyle = '#5c4f3a';
      ctx.fillRect(d.x - 20, d.y - 44, 40, 44);
      ctx.fillStyle = '#6a5c46';
      ctx.fillRect(d.x - 26, d.y - 56, 13, 16);
      ctx.fillRect(d.x + 13, d.y - 56, 13, 16);
      ctx.fillStyle = '#221508';
      ctx.fillRect(d.x - 7,  d.y - 22, 14, 22);
      ctx.fillStyle = '#ffd700';
      ctx.globalAlpha = .3;
      ctx.beginPath();
      ctx.arc(d.x, d.y - 34, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (d.type === 'treasure') {
      ctx.fillStyle = '#7a5810';
      ctx.fillRect(d.x - 16, d.y - 12, 32, 12);
      ctx.fillStyle = '#9a7820';
      ctx.fillRect(d.x - 16, d.y - 22, 32, 11);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(d.x - 16, d.y - 22, 32, 22);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(d.x - 3, d.y - 18, 6, 5);
    } else if (d.type === 'coral') {
      const sw = Math.sin(Date.now() * .001 + d.x * .02) * .6;
      ctx.strokeStyle = d.col;
      ctx.lineWidth   = 5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + sw, d.y - 38);
      ctx.stroke();
      ctx.lineWidth = 3;
      const br = [[12,-28,15,-42],[-12,-26,-15,-40],[-2,-34,-3,-50],[2,-32,9,-48]];
      for (const [x1,y1,x2,y2] of br) {
        ctx.beginPath();
        ctx.moveTo(d.x + x1 + sw, d.y + y1);
        ctx.lineTo(d.x + x2 + sw, d.y + y2);
        ctx.stroke();
      }
    }
  }
}

function drawFish(fish) {
  if (!fish.alive) return;
  const s  = fish.size * 26;
  const eo = fish.eatAnim > 0 ? Math.sin(fish.eatAnim * Math.PI) * -9 : 0;
  const wg = Math.sin(fish.wobble) * .28;

  ctx.save();
  ctx.translate(fish.x, fish.y + eo);
  if (fish.flip === -1) ctx.scale(-1, 1); // face left

  // tail
  ctx.save();
  ctx.translate(-s * .78, 0);
  ctx.rotate(wg);
  ctx.fillStyle = fish.tail;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-s * .95, -s * .78);
  ctx.lineTo(-s * .95,  s * .78);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // body
  const bg = ctx.createRadialGradient(-s*.12, -s*.22, 0, 0, 0, s * 1.05);
  bg.addColorStop(0, lighten(fish.body, 58));
  bg.addColorStop(1, fish.body);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 1.08, s * .58, 0, 0, Math.PI * 2);
  ctx.fill();

  // dorsal fin
  ctx.fillStyle = fish.tail + 'cc';
  ctx.beginPath();
  ctx.moveTo(-s*.2, -s*.52);
  ctx.lineTo( s*.12, -s*.95);
  ctx.lineTo( s*.5,  -s*.52);
  ctx.closePath();
  ctx.fill();

  // pectoral fin
  ctx.fillStyle = fish.tail + '88';
  ctx.beginPath();
  ctx.ellipse(s*.08, s*.32, s*.28, s*.14, .25, 0, Math.PI * 2);
  ctx.fill();

  // eye white
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s*.44, -s*.1, s*.2, 0, Math.PI * 2);
  ctx.fill();
  // pupil
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(s*.48, -s*.1, s*.11, 0, Math.PI * 2);
  ctx.fill();
  // shine
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s*.52, -s*.15, s*.04, 0, Math.PI * 2);
  ctx.fill();

  // hungry mouth
  if (fish.hunger < 25) {
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(s*.88, s*.08, s*.08, 0, Math.PI);
    ctx.stroke();
  }

  // low health tint
  if (fish.health < 30) {
    ctx.fillStyle = `rgba(255,30,30,${.12 + (30 - fish.health) / 120})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, s*1.08, s*.58, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // elder grey tint
  if (fish.stage === 'elder') {
    ctx.fillStyle = 'rgba(200,200,220,.1)';
    ctx.beginPath();
    ctx.ellipse(0, 0, s*1.08, s*.58, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // name tag
  ctx.save();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(fish.name).width + 9;
  const ty = fish.y + eo - s - 18;
  ctx.fillStyle = 'rgba(0,8,22,.72)';
  ctx.fillRect(fish.x - tw / 2, ty, tw, 13);
  ctx.fillStyle = 'rgba(170,215,255,.88)';
  ctx.fillText(fish.name, fish.x, ty + 10);
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    if (p.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;

    if (p.type === 'food') {
      if (p.isFlake) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * .45, p.x * .5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.type === 'bubble') {
      ctx.strokeStyle = 'rgba(140,215,255,.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath();
      ctx.arc(p.x - p.r * .28, p.y - p.r * .28, p.r * .28, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'heart') {
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❤️', p.x, p.y);
    } else if (p.type === 'sparkle') {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨', p.x, p.y);
    } else if (p.type === 'clean') {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💧', p.x, p.y);
    }
    ctx.restore();
  }
}

function drawDirtyOverlay() {
  const a = state.dirty / 100;
  if (a < .08) return;
  ctx.save();
  ctx.globalAlpha = a * .28;
  ctx.fillStyle   = '#1a1008';
  ctx.fillRect(0, 0, C.W, C.H);
  if (a > .35) {
    ctx.globalAlpha = a * .22;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = `rgba(20,${55 + i*8},15,0.35)`;
      ctx.beginPath();
      ctx.arc(55 + i * 90, 25 + (i % 3) * 110, 18 + i * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, C.W, C.H);
  drawBackground();
  drawFloor();

  drawSeaweed( 75, C.H - 42, 72, '#166534');
  drawSeaweed(185, C.H - 42, 55, '#15803d');
  drawSeaweed(490, C.H - 42, 68, '#166534');
  drawSeaweed(610, C.H - 42, 80, '#14532d');

  drawDecors();
  drawDirtyOverlay();
  drawParticles();

  for (const fish of state.fish) drawFish(fish);
}

// ══════════════════════════════════════════
//  FISH AI
// ══════════════════════════════════════════
function updateFishAI(fish, dt) {
  if (!fish.alive) return;

  fish.wobble += dt * 4.5;
  if (fish.eatAnim > 0) fish.eatAnim = Math.max(0, fish.eatAnim - dt * 2.2);

  if (Math.abs(fish.vx) > .12) fish.flip = fish.vx > 0 ? 1 : -1;

  let nearFood = null, nearDist = Infinity;
  for (const p of state.particles) {
    if (p.type === 'food' && !p.eaten && p.y > 15) {
      const d = Math.hypot(p.x - fish.x, p.y - fish.y);
      if (d < nearDist) { nearDist = d; nearFood = p; }
    }
  }

  if (nearFood && nearDist < 220) {
    const dx = nearFood.x - fish.x;
    const dy = nearFood.y - fish.y;
    const d  = Math.hypot(dx, dy) || 1;
    fish.vx  = fish.vx * .82 + (dx / d) * fish.speed * 1.8 * .18;
    fish.vy  = fish.vy * .82 + (dy / d) * fish.speed * .75 * .18;

    if (nearDist < 18) {
      nearFood.eaten = true;
      nearFood.alpha = 0;
      const gain = state.food === 'premium' ? 28 : state.food === 'flake' ? 20 : 16;
      fish.hunger   = Math.min(100, fish.hunger  + gain);
      fish.happy    = Math.min(100, fish.happy   + 5);
      fish.eatAnim  = 1;
      for (let i = 0; i < 3; i++) state.particles.push(pFx(fish.x, fish.y, 'sparkle'));
    }
  } else {
    if (Math.random() < .012) {
      fish.vx += (Math.random() - .5) * .6;
      fish.vy += (Math.random() - .5) * .3;
    }
    fish.vx += (C.W / 2 - fish.x) * .000025;
    fish.vy += (C.H / 2 - fish.y) * .000025;
  }

  const spd = Math.hypot(fish.vx, fish.vy);
  const max = fish.speed * 2.2;
  if (spd > max) { fish.vx = fish.vx / spd * max; fish.vy = fish.vy / spd * max; }

  fish.x += fish.vx;
  fish.y += fish.vy;

  const m = fish.size * 42;
  if (fish.x < m)        fish.vx += .35;
  if (fish.x > C.W - m)  fish.vx -= .35;
  if (fish.y < m + 8)    fish.vy += .35;
  if (fish.y > C.H - 58) fish.vy -= .35;

  fish.vx *= .982;
  fish.vy *= .982;
}

// ══════════════════════════════════════════
//  GAME TICK
// ══════════════════════════════════════════
let _lastMs = 0;

function gameTick(now) {
  if (!_lastMs) _lastMs = now;
  const dt = Math.min((now - _lastMs) / 1000, .1);
  _lastMs  = now;

  state.dayElapsed += dt * 1000;

  // particles
  state.particles = state.particles.filter(p => p.alpha > 0);
  for (const p of state.particles) {
    if (p.type === 'food') {
      if (!p.eaten) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy  = Math.min(p.vy * 1.01, 2.5);
        if (p.y > C.H - 50) { p.vx = 0; p.vy = 0; p.alpha -= dt * .18; }
      }
    } else if (p.type === 'bubble') {
      p.x += p.vx + Math.sin(now * .002 + p.x) * .15;
      p.y += p.vy;
      if (p.y < 8) p.alpha = 0;
    } else if (p.type === 'heart' || p.type === 'sparkle' || p.type === 'clean') {
      p.x    += p.vx;
      p.y    += p.vy;
      p.life -= dt * 1.4;
      p.alpha = Math.max(0, p.life);
    }
  }

  if (Math.random() < dt * 1.2) state.particles.push(pBubble());

  // fish
  for (const fish of state.fish) {
    updateFishAI(fish, dt);
    if (!fish.alive) continue;

    const dirtyMult = 1 + state.dirty / 180;
    fish.hunger = Math.max(0, fish.hunger - C.HUNGER_DECAY * dt * dirtyMult);
    fish.happy  = Math.max(0, fish.happy  - C.HAPPY_DECAY  * dt);

    if (fish.hunger <= 0) {
      fish.health = Math.max(0, fish.health - C.HEALTH_DMGE * dt);
    } else if (fish.hunger > 45) {
      fish.health = Math.min(100, fish.health + (4 / 60) * dt);
    }
    if (state.dirty > 72) fish.health = Math.max(0, fish.health - (4 / 60) * dt);
    if (fish.happy  < 20) fish.health = Math.max(0, fish.health - (2 / 60) * dt);

    if (fish.health <= 0) {
      fish.alive = false;
      toast(`💀 ${fish.name} เสียชีวิตแล้ว...`, 'bad');
      checkAch();
    }

    if (fish.alive && fish.happy > 55) {
      state.coins += C.COIN_RATE * dt * (fish.happy / 100);
    }
  }

  state.dirty = Math.min(100, state.dirty + C.DIRTY_RATE * dt);

  if (state.dayElapsed >= C.DAY_MS) {
    state.day++;
    state.dayElapsed -= C.DAY_MS;
    onNewDay();
  }

  const pct  = state.dayElapsed / C.DAY_MS;
  const mins = Math.floor(pct * 3);
  const secs = Math.floor((pct * 180) % 60);
  DOM.hTime.textContent =
    String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');

  updateUI();
  checkAch();
}

function onNewDay() {
  for (const fish of state.fish) {
    if (!fish.alive) continue;
    fish.ageDays++;
    updateStage(fish);
  }
  toast(`🌅 วันที่ ${state.day} เริ่มต้นแล้ว!`, 'info');
  updateBreedBtn();
}

function updateStage(fish) {
  const d = fish.ageDays;
  if      (d < 3)  { fish.stage = 'baby';     fish.size = .42 + d / 3 * .12; }
  else if (d < 8)  { fish.stage = 'juvenile'; fish.size = .54 + (d-3)/5 * .18; }
  else if (d < 20) { fish.stage = 'adult';    fish.size = .72 + (d-8)/12 * .15; }
  else             { fish.stage = 'elder';    fish.size = .87; }
}

// ══════════════════════════════════════════
//  ACTIONS
// ══════════════════════════════════════════
function feedFish(x) {
  const live = state.fish.filter(f => f.alive);
  if (!live.length) { toast('ไม่มีปลาในตู้!', 'warn'); return; }

  const cx    = x ?? (C.W / 2);
  const count = 5 + live.length * 2;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const fx = cx + (Math.random() - .5) * 180;
      state.particles.push(pFood(Math.max(30, Math.min(C.W - 30, fx))));
    }, i * 75);
  }

  state.totalFed++;
  toast('🍖 โยนอาหารลงตู้!', 'success');
}

function cleanTank() {
  if (state.dirty < 4) { toast('ตู้ยังสะอาดอยู่!', 'info'); return; }
  state.dirty = Math.max(0, state.dirty - 75);
  for (const fish of state.fish) {
    if (fish.alive) fish.happy = Math.min(100, fish.happy + 18);
  }
  for (let i = 0; i < 18; i++) {
    const p = pBubble();
    p.x  = Math.random() * C.W;
    p.vy = -2.5 - Math.random() * 2;
    p.r  = 3 + Math.random() * 6;
    state.particles.push(p);
  }
  for (let i = 0; i < 6; i++) {
    state.particles.push(pFx(80 + Math.random() * (C.W - 160), 100 + Math.random() * (C.H - 200), 'clean'));
  }
  toast('🧹 ทำความสะอาดตู้แล้ว!', 'success');
}

function breedFish() {
  const adults = state.fish.filter(f => f.alive && (f.stage === 'adult' || f.stage === 'elder'));
  const liveCnt = state.fish.filter(f => f.alive).length;
  if (adults.length < 2) { toast('ต้องมีปลาโตอย่างน้อย 2 ตัว!', 'warn'); return; }
  if (liveCnt >= 8)      { toast('ตู้เต็มแล้ว! (สูงสุด 8 ตัว)', 'warn'); return; }

  const parent = adults[Math.floor(Math.random() * adults.length)];
  const baby   = makeFish(parent.type);
  baby.x       = parent.x + (Math.random() - .5) * 40;
  baby.y       = parent.y + (Math.random() - .5) * 30;
  state.fish.push(baby);

  for (let i = 0; i < 6; i++) {
    state.particles.push({
      ...pFx(parent.x, parent.y, 'heart'),
      vx: (Math.random() - .5) * 2, vy: -1.2 - Math.random() * 1.5,
    });
  }

  toast(`💕 ${baby.name} ฟักออกมาแล้ว!`, 'success');
  updateBreedBtn();
  checkAch();
}

function updateBreedBtn() {
  const adults  = state.fish.filter(f => f.alive && (f.stage === 'adult' || f.stage === 'elder'));
  const liveCnt = state.fish.filter(f => f.alive).length;
  DOM.btnBreed.disabled = adults.length < 2 || liveCnt >= 8;
}

// ══════════════════════════════════════════
//  SHOP
// ══════════════════════════════════════════
const SHOP = {
  fish: [
    { type:'goldfish', label:'ปลาทอง',     desc:'ปลาคลาสสิก ว่ายปานกลาง',  cost: 50  },
    { type:'blue',     label:'ปลาน้ำเงิน', desc:'ว่ายเร็ว ตื่นตัวสูง',      cost: 60  },
    { type:'green',    label:'ปลาเขียว',   desc:'เชื่องช้า อายุยืน',        cost: 55  },
    { type:'pink',     label:'ปลาชมพู',    desc:'น่ารัก ความสุขสูง',        cost: 80  },
    { type:'purple',   label:'ปลาม่วง',    desc:'หายากสีสวย',               cost: 120 },
    { type:'red',      label:'ปลาแดง',     desc:'แข็งแกร่ง ว่ายเร็ว',       cost: 90  },
  ],
  food: [
    { id:'basic',   label:'อาหารธรรมดา',  desc:'+16 ความหิว',               cost:0   },
    { id:'flake',   label:'อาหารแผ่น',    desc:'+20 ความหิว ปลาชอบ',        cost:35  },
    { id:'premium', label:'อาหารพรีเมียม', desc:'+28 ความหิว +5 ความสุข',   cost:85  },
  ],
  decor: [
    { type:'rock',     label:'ก้อนหิน',    desc:'ตกแต่งพื้นทะเล',        cost:18  },
    { type:'coral',    label:'ปะการัง',    desc:'สวยงาม +10 ความสุขปลา',  cost:45  },
    { type:'castle',   label:'ปราสาท',     desc:'ปลาซ่อนได้ น่ารัก',     cost:65  },
    { type:'treasure', label:'หีบสมบัติ',  desc:'เพิ่มบรรยากาศ',          cost:75  },
  ],
};

function openShop() {
  const coins = Math.floor(state.coins);
  const live  = state.fish.filter(f => f.alive).length;

  document.getElementById('shopContent').innerHTML = `
    <div class="shop-sec">
      <div class="shop-sec-title">🐠 ซื้อปลา ${live >= 8 ? '(ตู้เต็ม)' : ''}</div>
      ${SHOP.fish.map(it => `
        <div class="shop-row">
          <div>
            <div class="shop-item-name">${FTYPES[it.type].label} <span style="color:#7a9abc">${it.label}</span></div>
            <div class="shop-item-desc">${it.desc}</div>
          </div>
          <button class="shop-btn" onclick="buyFish('${it.type}')"
            ${coins < it.cost || live >= 8 ? 'disabled' : ''}>🪙 ${it.cost}</button>
        </div>`).join('')}
    </div>

    <div class="shop-sec">
      <div class="shop-sec-title">🍖 เลือกอาหาร</div>
      ${SHOP.food.map(it => {
        const owned    = state.unlockedFoods.has(it.id);
        const selected = state.food === it.id;
        return `
        <div class="shop-row ${selected ? 'active' : ''}">
          <div>
            <div class="shop-item-name">${it.label} ${selected ? '✓' : ''}</div>
            <div class="shop-item-desc">${it.desc}</div>
          </div>
          ${owned
            ? `<button class="shop-btn ${selected ? 'in-use' : ''}" onclick="selectFood('${it.id}')">
                ${selected ? 'ใช้งานอยู่' : 'ใช้งาน'}
               </button>`
            : `<button class="shop-btn" onclick="buyFood('${it.id}',${it.cost})"
                ${coins < it.cost ? 'disabled' : ''}>🪙 ${it.cost}</button>`
          }
        </div>`;
      }).join('')}
    </div>

    <div class="shop-sec">
      <div class="shop-sec-title">🏠 ของตกแต่ง</div>
      ${SHOP.decor.map(it => `
        <div class="shop-row">
          <div>
            <div class="shop-item-name">${it.label}</div>
            <div class="shop-item-desc">${it.desc}</div>
          </div>
          <button class="shop-btn" onclick="buyDecor('${it.type}')"
            ${coins < it.cost ? 'disabled' : ''}>🪙 ${it.cost}</button>
        </div>`).join('')}
    </div>
  `;
  document.getElementById('shopOverlay').classList.add('open');
}

function closeShop() {
  document.getElementById('shopOverlay').classList.remove('open');
}

function buyFish(type) {
  const it = SHOP.fish.find(i => i.type === type);
  if (!it || state.coins < it.cost || state.fish.filter(f=>f.alive).length >= 8) return;
  state.coins -= it.cost;
  const fish = makeFish(type);
  fish.x = 120 + Math.random() * (C.W - 240);
  fish.y = 80  + Math.random() * (C.H - 180);
  state.fish.push(fish);
  toast(`🐠 ซื้อ${FTYPES[type].label}แล้ว! ชื่อ: ${fish.name}`, 'success');
  updateBreedBtn();
  openShop();
  checkAch();
}

function buyFood(id, cost) {
  if (state.coins < cost) return;
  state.coins -= cost;
  state.unlockedFoods.add(id);
  selectFood(id);
}

function selectFood(id) {
  state.food = id;
  const lbl = SHOP.food.find(f => f.id === id)?.label ?? id;
  document.getElementById('foodBadge').textContent = '🍖 ' + lbl;
  openShop();
}

function buyDecor(type) {
  const it = SHOP.decor.find(i => i.type === type);
  if (!it || state.coins < it.cost) return;
  state.coins -= it.cost;

  const y = C.H - 42;
  const x = 100 + Math.random() * (C.W - 200);
  state.decors.push({
    type, x, y,
    rw: 22 + Math.random() * 14,
    rh: 14 + Math.random() * 10,
    col: `hsl(${Math.random()*360},72%,52%)`,
  });

  for (const fish of state.fish) {
    if (fish.alive) fish.happy = Math.min(100, fish.happy + 12);
  }
  toast(`${it.label} วางลงตู้แล้ว!`, 'success');
  openShop();
}

// ══════════════════════════════════════════
//  UI
// ══════════════════════════════════════════
const STAGE_LABELS = {
  baby:     '👶 ลูกปลา',
  juvenile: '🐣 ปลาเล็ก',
  adult:    '🐟 ปลาโต',
  elder:    '🧓 ปลาแก่',
};

// DOM references cached once at startup (populated in init)
const DOM = {};

let _uiFrameCount = 0;

function updateUI() {
  DOM.hDay.textContent   = state.day;
  DOM.hCoins.textContent = Math.floor(state.coins);
  DOM.hFish.textContent  = state.fish.filter(f => f.alive).length;
  DOM.hAch.textContent   = state.achievements.size;

  const d = state.dirty;
  DOM.dirtyFill.style.width = (100 - d) + '%';
  if (d < 30) { DOM.dirtyFill.style.background = '#22c55e'; DOM.dirtyLabel.textContent = 'ตู้สะอาด 🟢'; }
  else if (d < 65) { DOM.dirtyFill.style.background = '#f59e0b'; DOM.dirtyLabel.textContent = 'เริ่มสกปรก 🟡'; }
  else             { DOM.dirtyFill.style.background = '#ef4444'; DOM.dirtyLabel.textContent = 'สกปรกมาก! 🔴'; }

  // Rebuild fish cards at ~6 fps instead of 60 fps
  _uiFrameCount++;
  if (_uiFrameCount % 10 !== 0) return;

  DOM.fishGrid.innerHTML = state.fish.map(fish => {
    if (!fish.alive) return `
      <div class="fish-card dead">
        <div class="fc-name">${FTYPES[fish.type]?.label || fish.type} – ${fish.name}</div>
        <div class="fc-dead">💀 เสียชีวิต (อายุ ${fish.ageDays} วัน)</div>
      </div>`;

    const urgent = fish.hunger < 20 || fish.health < 25;
    return `
      <div class="fish-card ${urgent ? 'urgent' : ''}" onclick="petFish(${fish.id})">
        <div class="fc-name">${FTYPES[fish.type]?.label || fish.type} – ${fish.name}</div>
        <div class="fc-stage">${STAGE_LABELS[fish.stage]} • อายุ ${fish.ageDays} วัน</div>
        <div class="bar bar-hunger">
          <div class="bar-row"><span>🍖 ความหิว</span><span>${Math.floor(fish.hunger)}%</span></div>
          <div class="bar-bg"><div class="bar-fg" style="width:${fish.hunger}%"></div></div>
        </div>
        <div class="bar bar-health">
          <div class="bar-row"><span>❤️ สุขภาพ</span><span>${Math.floor(fish.health)}%</span></div>
          <div class="bar-bg"><div class="bar-fg" style="width:${fish.health}%"></div></div>
        </div>
        <div class="bar bar-happy">
          <div class="bar-row"><span>😊 ความสุข</span><span>${Math.floor(fish.happy)}%</span></div>
          <div class="bar-bg"><div class="bar-fg" style="width:${fish.happy}%"></div></div>
        </div>
      </div>`;
  }).join('');
}

function petFish(id) {
  const fish = state.fish.find(f => f.id === id && f.alive);
  if (!fish) return;
  fish.happy = Math.min(100, fish.happy + 12);
  for (let i = 0; i < 4; i++)
    state.particles.push({ ...pFx(fish.x, fish.y, 'heart'), vx:(Math.random()-.5)*2, vy:-1.5-Math.random() });
  toast(`😊 ${fish.name} ดีใจที่ได้รับการลูบหัว!`, 'success');
}

// ══════════════════════════════════════════
//  ACHIEVEMENTS
// ══════════════════════════════════════════
const ACHIEVEMENTS = [
  { id:'day1',  check:()=> state.day >= 2,                                    title:'🌅 วันแรก',         desc:'เลี้ยงปลาได้ 1 วัน' },
  { id:'day7',  check:()=> state.day >= 8,                                    title:'📅 ครบสัปดาห์!',    desc:'เลี้ยงปลา 7 วัน' },
  { id:'day30', check:()=> state.day >= 31,                                   title:'🏆 ครบเดือน!',      desc:'เลี้ยงปลา 30 วัน' },
  { id:'fish3', check:()=> state.fish.filter(f=>f.alive).length >= 3,         title:'🐠🐠🐠 ครอบครัวปลา', desc:'มีปลามีชีวิต 3 ตัว' },
  { id:'fish6', check:()=> state.fish.filter(f=>f.alive).length >= 6,         title:'🌊 ตู้เต็ม',        desc:'มีปลามีชีวิต 6 ตัว' },
  { id:'fed10', check:()=> state.totalFed >= 10,                              title:'🍖 ผู้เลี้ยงดี',    desc:'ให้อาหาร 10 ครั้ง' },
  { id:'adult', check:()=> state.fish.some(f=>f.alive && f.stage==='adult'),  title:'🐟 ปลาโตแล้ว',     desc:'ปลาเติบโตจนเป็นผู้ใหญ่' },
  { id:'rich',  check:()=> state.coins >= 500,                                title:'💰 เศรษฐีปลา',     desc:'สะสมเหรียญ 500' },
  { id:'elder', check:()=> state.fish.some(f=>f.alive && f.stage==='elder'),  title:'👴 ปลาผู้รอบรู้',  desc:'ปลาอายุยืนจนเป็นผู้อาวุโส' },
];

function checkAch() {
  if (state.achievements.size === ACHIEVEMENTS.length) return;
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements.has(a.id) && a.check()) {
      state.achievements.add(a.id);
      showAch(a);
    }
  }
}

const _achQueue = [];
let _achShowing = false;

function showAch(a) {
  _achQueue.push(a);
  if (!_achShowing) _flushAch();
}

function _flushAch() {
  if (!_achQueue.length) { _achShowing = false; return; }
  _achShowing = true;
  const a  = _achQueue.shift();
  const el = document.getElementById('achPopup');
  el.textContent   = `🏆 ${a.title} — ${a.desc}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; _flushAch(); }, 3200);
}

// ══════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════
function toast(msg, type = 'info') {
  const box = document.getElementById('toasts');
  const el  = document.createElement('div');
  el.className   = `toast ${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .28s';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

// ══════════════════════════════════════════
//  EVENT HANDLERS
// ══════════════════════════════════════════
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (C.W / r.width);
  const y = (e.clientY - r.top)  * (C.H / r.height);

  for (const fish of state.fish) {
    if (!fish.alive) continue;
    const dist = Math.hypot(x - fish.x, y - fish.y);
    if (dist < fish.size * 40) {
      petFish(fish.id);
      return;
    }
  }
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (C.W / r.width);
  feedFish(x);
});

setInterval(() => {
  const hungry = state.fish.filter(f => f.alive && f.hunger < 22);
  if (hungry.length > 0) toast(`😰 ${hungry.map(f=>f.name).join(', ')} หิวมากแล้ว!`, 'warn');
  if (state.dirty > 82)  toast('🤢 ตู้สกปรกอย่างหนัก รีบทำความสะอาด!', 'warn');
  updateBreedBtn();
}, 28000);

// ══════════════════════════════════════════
//  MAIN LOOP
// ══════════════════════════════════════════
function loop(ts) {
  gameTick(ts);
  render();
  requestAnimationFrame(loop);
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
function init() {
  // Cache DOM references once
  DOM.hDay        = document.getElementById('hDay');
  DOM.hCoins      = document.getElementById('hCoins');
  DOM.hFish       = document.getElementById('hFish');
  DOM.hAch        = document.getElementById('hAch');
  DOM.hTime       = document.getElementById('hTime');
  DOM.dirtyFill   = document.getElementById('dirtyFill');
  DOM.dirtyLabel  = document.getElementById('dirtyLabel');
  DOM.fishGrid    = document.getElementById('fishGrid');
  DOM.btnBreed    = document.getElementById('btnBreed');

  const f = makeFish('goldfish');
  f.x = C.W / 2; f.y = C.H / 2 - 20;
  f.hunger = 90; f.happy = 90; f.health = 100;
  state.fish.push(f);

  state.decors.push({ type:'coral',    x:110, y:C.H-42, col:'#ef4444', rw:0, rh:0 });
  state.decors.push({ type:'coral',    x:570, y:C.H-42, col:'#f472b6', rw:0, rh:0 });
  state.decors.push({ type:'rock',     x:320, y:C.H-38, rw:24, rh:16 });
  state.decors.push({ type:'treasure', x:440, y:C.H-42, rw:0, rh:0 });

  toast('🐠 ยินดีต้อนรับสู่ตู้ปลาของคุณ!', 'success');
  setTimeout(() => toast('💡 คลิกขวาในตู้เพื่อโยนอาหาร หรือกดปุ่ม "ให้อาหาร"', 'info'), 1800);

  requestAnimationFrame(loop);
}

init();
