// Get references to HTML elements
const game = document.getElementById('game');
const player = document.getElementById('player');
const hud = document.getElementById('hud');
const pauseOverlay = document.getElementById('pauseOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreSpan = document.getElementById('finalScore');
const bgMusic = document.getElementById('bgMusic');

// Config constants
const config = {
  gravity: 1,
  groundY: innerHeight - 140,
  maxJumps: 3,
  jumpVelocity: -18,
  playerSpeed: 5,
  boostSpeed: 15,
  boostDuration: 5000,
  spawnInterval: 1300,
  dayNightInterval: 20000
};

// Game state variables
let playerX = 100, playerY = config.groundY, velocityY = 0;
let jumpCount = 0, playerSpeed = config.playerSpeed, objectSpeed = 5;
let score = 0, health = 3, paused = false;
let boosted = false, isDay = true;
const keys = { left: false, right: false };
const objects = [], bullets = [];
let spawnInterval;

// Key handlers
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowRight': keys.right = true; break;
    case 'ArrowLeft': keys.left = true; break;
    case ' ': case 'ArrowUp':
      if (jumpCount < config.maxJumps) {
        velocityY = config.jumpVelocity;
        jumpCount++;
      }
      break;
    case 'z': case 'Z': shoot(false); break;
    case 'Shift': activateSpeedBoost(); break;
    case 'p': case 'P': togglePause(); break;
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowRight') keys.right = false;
  if (e.key === 'ArrowLeft') keys.left = false;
});

function togglePause() {
  paused = !paused;
  pauseOverlay.style.display = paused ? 'flex' : 'none';
  paused ? bgMusic.pause() : bgMusic.play();
}

function resumeGame() {
  paused = false;
  pauseOverlay.style.display = 'none';
  bgMusic.play();
}

function shoot(fromEnemy, shooterX = null, shooterY = null) {
  const b = document.createElement('div');
  b.className = 'bullet';
  const x = fromEnemy ? shooterX - 40 : playerX + 40;
  const y = fromEnemy ? shooterY + 40 : playerY + 18;
  b.style.left = `${x}px`;
  b.style.top = `${y}px`;
  game.appendChild(b);
  bullets.push({ el: b, x, fromEnemy });
}


function spawnObjects() {
  const obj = document.createElement('div');
  const type = Math.random();

  if (type < 0.2) {
    obj.className = 'obstacle';
    appendImage(obj, 'Long_Spike_Row.png', 'Obstacle');
  } else if (type < 0.5) {
    obj.className = 'powerup';
    appendImage(obj, 'rotating_y_axis_transparent (1).gif', 'Powerup');
  } else if (type < 0.8) {
    const flyingEnemies = ['enemy-flying', 'enemy-boss'];
    const groundEnemies = ['enemy-jumping', 'enemy-intelligent', 'enemy-shooter', 'enemy-patrolling', 'enemy-exploding', 'enemy-shielded', 'enemy-teleporting', 'enemy-speed'];
    const selectedEnemy = Math.random() < 0.1 ? flyingEnemies[Math.floor(Math.random() * flyingEnemies.length)] : groundEnemies[Math.floor(Math.random() * groundEnemies.length)];
    obj.className = `enemy ${selectedEnemy}`;
    if (selectedEnemy === 'enemy-boss') obj.dataset.health = '3';
  } else {
    obj.className = 'gorge';
    obj.style.width = `${100 + Math.random() * 250}px`;
   
    obj.style.background = getComputedStyle(document.documentElement).getPropertyValue('--sky-color');

  }

  obj.style.left = `${innerWidth}px`;
  if (!obj.classList.contains('gorge') && !obj.classList.contains('enemy-flying')) obj.style.bottom = '100px';
  game.appendChild(obj);
  objects.push({ el: obj, x: innerWidth, y: config.groundY, vy: 0, type: obj.className });
}

function appendImage(parent, src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  parent.appendChild(img);
}

function activateSpeedBoost() {
  if (boosted) return;
  boosted = true;
  playerSpeed = config.boostSpeed;
  player.style.background = 'magenta';
  setTimeout(() => {
    playerSpeed = config.playerSpeed;
    boosted = false;
    player.style.background = '#ff4444';
  }, config.boostDuration);
}

function showGameOver() {
  paused = true;
  clearInterval(spawnInterval);
  finalScoreSpan.innerText = score;
  gameOverOverlay.style.display = 'flex';
  bgMusic.pause();
}

function gameLoop() {
  if (paused) return setTimeout(() => requestAnimationFrame(gameLoop), 100); // Adds throttling when paused

  if (keys.right && playerX + player.offsetWidth < innerWidth) playerX += playerSpeed;
  if (keys.left && playerX > 0) playerX -= playerSpeed;

  velocityY += config.gravity;
  playerY += velocityY;

  let onGround = true;
  const playerRect = player.getBoundingClientRect();
  const playerLeft = playerRect.left, playerRight = playerRect.right;

  objects.forEach(o => {
    if (o.type.includes('gorge')) {
      const gorgeRect = o.el.getBoundingClientRect();
      if (playerRight > gorgeRect.left && playerLeft < gorgeRect.right) onGround = false;
    }
  });

  if (playerY >= config.groundY && onGround) {
    playerY = config.groundY;
    velocityY = 0;
    jumpCount = 0;
  }
  if (playerY > innerHeight) return showGameOver();

  player.style.left = `${playerX}px`;
  player.style.top = `${playerY}px`;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.fromEnemy ? -10 : 10;
    b.el.style.left = `${b.x}px`;
    if (b.x > innerWidth || b.x < 0) {
      b.el.remove(); bullets.splice(i, 1);
    }
  }

  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    handleObjectBehavior(o);
    const objRect = o.el.getBoundingClientRect();
    checkCollisions(o, objRect, i, playerRect);
    if (o.x + o.el.offsetWidth < 0) {
      o.el.remove(); objects.splice(i, 1);
    }
  }

  hud.innerText = `Score: ${score} | Health: ${health}`;
  if (health <= 0) return showGameOver();

  requestAnimationFrame(gameLoop);
}

function handleObjectBehavior(o) {
  const left = parseInt(o.el.style.left);
  if (o.el.classList.contains('enemy-intelligent')) {
    o.x += (left > playerX) ? -(objectSpeed + 2) : -(objectSpeed - 4);
  } else if (o.el.classList.contains('enemy-shooter')) {
    if (Math.random() < 0.01) shoot(true, o.x, config.groundY); 
  } else if (o.el.classList.contains('enemy-patrolling')) {
    o.x += o.x < playerX ? objectSpeed : -objectSpeed;
  } else if (o.el.classList.contains('enemy-exploding')) {
    if (Math.abs(left - playerX) < 100) {
      o.el.remove(); score += 5;
    }
  } else if (o.el.classList.contains('enemy-shielded')) {
    if (Math.abs(left - playerX) < 30) health--;
  } else if (o.el.classList.contains('enemy-teleporting')) {
    if (Math.random() < 0.1) {
      o.el.style.left = `${Math.random() * innerWidth}px`;
      o.el.style.top = `${Math.random() * innerHeight}px`;
    }
  } else if (o.el.classList.contains('enemy-speed')) {
    o.x -= objectSpeed + 3;
  } else {
    o.x -= objectSpeed;
  }
  o.el.style.left = `${o.x}px`;
}

function checkCollisions(o, objRect, i, playerRect) {
  for (let j = bullets.length - 1; j >= 0; j--) {
    const b = bullets[j];
    const rb = b.el.getBoundingClientRect();
    if (!b.fromEnemy && rb.left < objRect.right && rb.right > objRect.left && rb.top < objRect.bottom && rb.bottom > objRect.top) {
      if (o.type.includes('enemy')) {
        if (o.el.classList.contains('enemy-boss')) {
          let hp = parseInt(o.el.dataset.health) - 1;
          if (hp <= 0) {
            o.el.remove(); objects.splice(i, 1); score += 10;
          } else {
            o.el.dataset.health = hp;
          }
        } else {
          o.el.remove(); objects.splice(i, 1); score += 2;
        }
        b.el.remove(); bullets.splice(j, 1);
      }
    }
  }

  if (playerRect.left < objRect.right && playerRect.right > objRect.left && playerRect.top < objRect.bottom && playerRect.bottom > objRect.top) {
    if (o.type.includes('enemy') || o.type === 'obstacle') health--;
    if (o.type === 'powerup') score += 5;
    if (!o.type.includes('gorge')) {
      o.el.remove(); objects.splice(i, 1);
    }
  }
}

spawnInterval = setInterval(spawnObjects, config.spawnInterval);
setInterval(() => {
  isDay = !isDay;
  const sky = isDay ? '#275669' : '#0b0c2a';
  const bodyBg = isDay ? '#222' : '#000';
  document.documentElement.style.setProperty('--sky-color', sky);
  game.style.background = sky;
  document.body.style.background = bodyBg;
  document.querySelectorAll('.gorge').forEach(g => g.style.background = sky);
}, config.dayNightInterval);

gameLoop();
