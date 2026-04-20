import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 800;
const CANVAS_H = 600;
const TILE = 40;
const COLS = CANVAS_W / TILE; // 20
const ROWS = CANVAS_H / TILE; // 15

const PLAYER_SPEED = 2.5;
const BULLET_SPEED = 5;
const ENEMY_SPEED = 1.2;
const ENEMY_SHOOT_INTERVAL = 1800;
const SHOOT_COOLDOWN = 350;
const ENEMY_MOVE_INTERVAL = 600;

type Dir = "up" | "down" | "left" | "right";

interface Tank {
  x: number;
  y: number;
  dir: Dir;
  hp: number;
  id: number;
}

interface Bullet {
  x: number;
  y: number;
  dir: Dir;
  owner: "player" | "enemy";
  id: number;
}

interface Wall {
  x: number;
  y: number;
  hp: number; // 1 = brick (destructible), 2 = steel
}

interface Explosion {
  x: number;
  y: number;
  r: number;
  maxR: number;
  id: number;
}

type GameState = "menu" | "playing" | "paused" | "gameover" | "win";

let eid = 0;
const nextId = () => ++eid;

function dirToVec(d: Dir): [number, number] {
  return d === "up" ? [0, -1] : d === "down" ? [0, 1] : d === "left" ? [-1, 0] : [1, 0];
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function buildMap(level: number): Wall[] {
  const walls: Wall[] = [];
  const add = (col: number, row: number, hp: number) =>
    walls.push({ x: col * TILE, y: row * TILE, hp });

  // Border of steel
  for (let c = 0; c < COLS; c++) {
    add(c, 0, 2);
    add(c, ROWS - 1, 2);
  }
  for (let r = 1; r < ROWS - 1; r++) {
    add(0, r, 2);
    add(COLS - 1, r, 2);
  }

  // Level patterns
  const patterns: number[][] = level === 1
    ? [
        [2, 3], [3, 3], [4, 3],
        [7, 2], [7, 3], [7, 4],
        [10, 5], [11, 5], [12, 5],
        [5, 7], [5, 8], [5, 9],
        [14, 6], [14, 7], [14, 8],
        [9, 10], [10, 10], [11, 10],
        [3, 11], [4, 11], [5, 11],
        [15, 10], [15, 11], [15, 12],
        [8, 3], [8, 4],
        [13, 3], [13, 4],
      ]
    : level === 2
    ? [
        [2, 2], [3, 2], [4, 2], [5, 2],
        [8, 2], [8, 3], [8, 4], [8, 5],
        [12, 2], [13, 2], [14, 2],
        [3, 5], [3, 6], [3, 7],
        [6, 6], [7, 6], [8, 6],
        [11, 5], [11, 6], [11, 7],
        [15, 4], [15, 5], [15, 6], [15, 7],
        [5, 9], [6, 9], [7, 9],
        [10, 9], [11, 9], [12, 9],
        [4, 11], [5, 11],
        [14, 10], [14, 11],
      ]
    : [
        [2, 2], [3, 2], [5, 2], [6, 2], [8, 2], [9, 2], [11, 2], [12, 2],
        [2, 4], [3, 4], [4, 4], [7, 4], [8, 4], [12, 4], [13, 4],
        [5, 5], [5, 6], [5, 7], [10, 5], [10, 6], [10, 7],
        [3, 8], [4, 8], [7, 8], [8, 8], [12, 8], [13, 8],
        [2, 10], [6, 10], [7, 10], [11, 10], [15, 10],
        [4, 11], [4, 12], [9, 11], [9, 12], [14, 11], [14, 12],
      ];

  for (const [c, r] of patterns) {
    if (c >= 1 && c < COLS - 1 && r >= 1 && r < ROWS - 1) {
      add(c, r, level === 3 ? (Math.random() < 0.3 ? 2 : 1) : 1);
    }
  }

  return walls;
}

function spawnEnemies(level: number): Tank[] {
  const count = 4 + level * 2;
  const positions: [number, number][] = [
    [2, 1], [COLS - 3, 1], [Math.floor(COLS / 2), 1],
    [3, 1], [COLS - 4, 1], [5, 1],
    [COLS - 6, 1], [7, 1], [COLS - 8, 1], [9, 1],
  ];
  return positions.slice(0, count).map(([c, r]) => ({
    x: c * TILE,
    y: r * TILE,
    dir: "down" as Dir,
    hp: level >= 3 ? 2 : 1,
    id: nextId(),
  }));
}

function drawTank(
  ctx: CanvasRenderingContext2D,
  tank: Tank,
  isPlayer: boolean,
  size = TILE - 4
) {
  const { x, y, dir } = tank;
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  const half = size / 2;

  ctx.save();
  ctx.translate(cx, cy);

  const angle = dir === "up" ? 0 : dir === "right" ? Math.PI / 2 : dir === "down" ? Math.PI : -Math.PI / 2;
  ctx.rotate(angle);

  // Body
  const bodyColor = isPlayer ? "#4ade80" : "#f87171";
  const darkColor = isPlayer ? "#166534" : "#7f1d1d";
  const trackColor = isPlayer ? "#166534" : "#991b1b";

  // Tracks
  ctx.fillStyle = trackColor;
  ctx.beginPath();
  ctx.roundRect(-half, -half, 8, size, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(half - 8, -half, 8, size, 3);
  ctx.fill();

  // Track lines
  ctx.strokeStyle = isPlayer ? "#14532d" : "#7f1d1d";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const yPos = -half + 4 + i * (size / 4 - 1);
    ctx.beginPath();
    ctx.moveTo(-half + 1, yPos);
    ctx.lineTo(-half + 7, yPos);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(half - 7, yPos);
    ctx.lineTo(half - 1, yPos);
    ctx.stroke();
  }

  // Main body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-half + 9, -half + 3, size - 18, size - 6, 4);
  ctx.fill();

  // Turret
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(0, 0, half * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, 0, half * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Barrel
  ctx.fillStyle = darkColor;
  ctx.fillRect(-3, -half - 8, 6, half + 8);

  // Barrel tip
  ctx.fillStyle = isPlayer ? "#86efac" : "#fca5a5";
  ctx.fillRect(-2, -half - 10, 4, 4);

  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  const cx = b.x + 4;
  const cy = b.y + 4;
  ctx.save();
  ctx.translate(cx, cy);

  const isHoriz = b.dir === "left" || b.dir === "right";
  const w = isHoriz ? 10 : 4;
  const h = isHoriz ? 4 : 10;

  const color = b.owner === "player" ? "#fbbf24" : "#f87171";
  const glow = b.owner === "player" ? "#fef08a" : "#fecaca";

  ctx.shadowColor = glow;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 2);
  ctx.fill();
  ctx.restore();
}

function drawWall(ctx: CanvasRenderingContext2D, w: Wall) {
  if (w.hp === 2) {
    // Steel
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(w.x + 1, w.y + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(w.x + 2, w.y + 2, TILE - 4, TILE - 4);
    // Cross pattern
    ctx.fillStyle = "#475569";
    ctx.fillRect(w.x + 1, w.y + TILE / 2 - 1, TILE - 2, 2);
    ctx.fillRect(w.x + TILE / 2 - 1, w.y + 1, 2, TILE - 2);
  } else {
    // Brick
    ctx.fillStyle = "#b45309";
    ctx.fillRect(w.x + 1, w.y + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = "#92400e";
    // Brick pattern
    const bw = (TILE - 2) / 2;
    const bh = (TILE - 2) / 2;
    ctx.fillRect(w.x + 2, w.y + 2, bw - 2, bh - 2);
    ctx.fillRect(w.x + bw + 2, w.y + 2, bw - 4, bh - 2);
    ctx.fillRect(w.x + 2, w.y + bh + 2, bw - 4, bh - 4);
    ctx.fillRect(w.x + bw + 2, w.y + bh + 2, bw - 2, bh - 4);
  }
}

function drawExplosion(ctx: CanvasRenderingContext2D, e: Explosion) {
  const progress = e.r / e.maxR;
  const alpha = 1 - progress;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer ring
  const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
  grad.addColorStop(0, "#fef08a");
  grad.addColorStop(0.4, "#f97316");
  grad.addColorStop(0.8, "#ef4444");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("menu");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [enemyCount, setEnemyCount] = useState(0);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const playerRef = useRef<Tank>({ x: TILE * 9, y: TILE * 12, dir: "up", hp: 1, id: 0 });
  const enemiesRef = useRef<Tank[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const wallsRef = useRef<Wall[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShootRef = useRef(0);
  const lastEnemyMoveRef = useRef<Record<number, number>>({});
  const lastEnemyShootRef = useRef<Record<number, number>>({});
  const levelRef = useRef(level);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const animRef = useRef<number>(0);
  const playerInvRef = useRef(0); // invincibility frames after respawn
  const levelUpRef = useRef(false);

  levelRef.current = level;
  scoreRef.current = score;
  livesRef.current = lives;

  const startLevel = useCallback((lv: number, sc: number, lv_lives: number) => {
    eid = 0;
    playerRef.current = { x: TILE * 9, y: TILE * 12, dir: "up", hp: 1, id: 0 };
    enemiesRef.current = spawnEnemies(lv);
    wallsRef.current = buildMap(lv);
    bulletsRef.current = [];
    explosionsRef.current = [];
    lastEnemyMoveRef.current = {};
    lastEnemyShootRef.current = {};
    playerInvRef.current = 120;
    levelUpRef.current = false;
    setLevel(lv);
    setScore(sc);
    setLives(lv_lives);
    setEnemyCount(enemiesRef.current.length);
    setGameState("playing");
  }, []);

  const handleKey = useCallback((e: KeyboardEvent, down: boolean) => {
    if (down) keysRef.current.add(e.key);
    else keysRef.current.delete(e.key);
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", (e) => handleKey(e, true));
    window.addEventListener("keyup", (e) => handleKey(e, false));
    return () => {
      window.removeEventListener("keydown", (e) => handleKey(e, true));
      window.removeEventListener("keyup", (e) => handleKey(e, false));
    };
  }, [handleKey]);

  const solidForTank = useCallback((nx: number, ny: number, excludeId?: number) => {
    for (const w of wallsRef.current) {
      if (rectsOverlap(nx, ny, TILE - 2, TILE - 2, w.x, w.y, TILE, TILE)) return true;
    }
    for (const e of enemiesRef.current) {
      if (e.id === excludeId) continue;
      if (rectsOverlap(nx, ny, TILE - 2, TILE - 2, e.x, e.y, TILE - 2, TILE - 2)) return true;
    }
    if (excludeId !== 0) {
      const p = playerRef.current;
      if (rectsOverlap(nx, ny, TILE - 2, TILE - 2, p.x, p.y, TILE - 2, TILE - 2)) return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let lastTime = 0;

    const loop = (ts: number) => {
      if (stateRef.current !== "playing") return;
      const dt = ts - lastTime;
      lastTime = ts;

      if (playerInvRef.current > 0) playerInvRef.current--;

      // --- Player movement ---
      const keys = keysRef.current;
      const player = playerRef.current;
      let moved = false;

      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
        player.dir = "up";
        const ny = player.y - PLAYER_SPEED;
        if (!solidForTank(player.x, ny, 0)) { player.y = ny; moved = true; }
      } else if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
        player.dir = "down";
        const ny = player.y + PLAYER_SPEED;
        if (!solidForTank(player.x, ny, 0)) { player.y = ny; moved = true; }
      } else if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
        player.dir = "left";
        const nx = player.x - PLAYER_SPEED;
        if (!solidForTank(nx, player.y, 0)) { player.x = nx; moved = true; }
      } else if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
        player.dir = "right";
        const nx = player.x + PLAYER_SPEED;
        if (!solidForTank(nx, player.y, 0)) { player.x = nx; moved = true; }
      }
      void moved;

      // --- Player shoot ---
      if ((keys.has(" ") || keys.has("Enter")) && ts - lastShootRef.current > SHOOT_COOLDOWN) {
        lastShootRef.current = ts;
        const [dx, dy] = dirToVec(player.dir);
        bulletsRef.current.push({
          x: player.x + TILE / 2 - 4 + dx * TILE / 2,
          y: player.y + TILE / 2 - 4 + dy * TILE / 2,
          dir: player.dir,
          owner: "player",
          id: nextId(),
        });
      }

      // --- Enemy AI ---
      for (const enemy of enemiesRef.current) {
        const now = ts;

        // Move
        if (!lastEnemyMoveRef.current[enemy.id] || now - lastEnemyMoveRef.current[enemy.id] > ENEMY_MOVE_INTERVAL) {
          lastEnemyMoveRef.current[enemy.id] = now;
          // Random direction change
          if (Math.random() < 0.4) {
            const dirs: Dir[] = ["up", "down", "left", "right"];
            enemy.dir = dirs[Math.floor(Math.random() * dirs.length)];
          }
        }

        const [dx, dy] = dirToVec(enemy.dir);
        const nx = enemy.x + dx * ENEMY_SPEED;
        const ny = enemy.y + dy * ENEMY_SPEED;
        if (!solidForTank(nx, ny, enemy.id)) {
          enemy.x = nx;
          enemy.y = ny;
        } else {
          const dirs: Dir[] = ["up", "down", "left", "right"];
          enemy.dir = dirs[Math.floor(Math.random() * dirs.length)];
          lastEnemyMoveRef.current[enemy.id] = now;
        }

        // Shoot
        if (!lastEnemyShootRef.current[enemy.id]) lastEnemyShootRef.current[enemy.id] = now - Math.random() * ENEMY_SHOOT_INTERVAL;
        if (now - lastEnemyShootRef.current[enemy.id] > ENEMY_SHOOT_INTERVAL) {
          lastEnemyShootRef.current[enemy.id] = now;
          const [bdx, bdy] = dirToVec(enemy.dir);
          bulletsRef.current.push({
            x: enemy.x + TILE / 2 - 4 + bdx * TILE / 2,
            y: enemy.y + TILE / 2 - 4 + bdy * TILE / 2,
            dir: enemy.dir,
            owner: "enemy",
            id: nextId(),
          });
        }
      }

      // --- Move bullets ---
      bulletsRef.current = bulletsRef.current.filter((b) => {
        const [dx, dy] = dirToVec(b.dir);
        b.x += dx * BULLET_SPEED;
        b.y += dy * BULLET_SPEED;

        // Out of bounds
        if (b.x < 0 || b.x > CANVAS_W || b.y < 0 || b.y > CANVAS_H) return false;

        // Hit wall
        for (let wi = wallsRef.current.length - 1; wi >= 0; wi--) {
          const w = wallsRef.current[wi];
          if (rectsOverlap(b.x, b.y, 8, 8, w.x, w.y, TILE, TILE)) {
            explosionsRef.current.push({ x: b.x + 4, y: b.y + 4, r: 2, maxR: 18, id: nextId() });
            if (w.hp === 1) wallsRef.current.splice(wi, 1);
            return false;
          }
        }

        // Player bullet hits enemy
        if (b.owner === "player") {
          for (let ei = enemiesRef.current.length - 1; ei >= 0; ei--) {
            const e = enemiesRef.current[ei];
            if (rectsOverlap(b.x, b.y, 8, 8, e.x, e.y, TILE - 2, TILE - 2)) {
              e.hp--;
              explosionsRef.current.push({ x: e.x + TILE / 2, y: e.y + TILE / 2, r: 2, maxR: 28, id: nextId() });
              if (e.hp <= 0) {
                enemiesRef.current.splice(ei, 1);
                setScore((s) => { scoreRef.current = s + 100 * levelRef.current; return s + 100 * levelRef.current; });
                setEnemyCount(enemiesRef.current.length);
              }
              return false;
            }
          }
        }

        // Enemy bullet hits player
        if (b.owner === "enemy" && playerInvRef.current === 0) {
          const p = playerRef.current;
          if (rectsOverlap(b.x, b.y, 8, 8, p.x, p.y, TILE - 2, TILE - 2)) {
            explosionsRef.current.push({ x: p.x + TILE / 2, y: p.y + TILE / 2, r: 2, maxR: 32, id: nextId() });
            const newLives = livesRef.current - 1;
            setLives(newLives);
            livesRef.current = newLives;
            if (newLives <= 0) {
              cancelAnimationFrame(animRef.current);
              setGameState("gameover");
              return false;
            } else {
              playerRef.current = { x: TILE * 9, y: TILE * 12, dir: "up", hp: 1, id: 0 };
              playerInvRef.current = 180;
            }
            return false;
          }
        }

        // Bullet vs bullet
        for (let bi = bulletsRef.current.length - 1; bi >= 0; bi--) {
          const other = bulletsRef.current[bi];
          if (other.id === b.id || other.owner === b.owner) continue;
          if (rectsOverlap(b.x, b.y, 8, 8, other.x, other.y, 8, 8)) {
            explosionsRef.current.push({ x: b.x + 4, y: b.y + 4, r: 2, maxR: 12, id: nextId() });
            bulletsRef.current.splice(bi, 1);
            return false;
          }
        }

        return true;
      });

      // --- Update explosions ---
      explosionsRef.current = explosionsRef.current.filter((e) => {
        e.r += 1.5;
        return e.r < e.maxR;
      });

      // --- Level win check ---
      if (enemiesRef.current.length === 0 && !levelUpRef.current) {
        levelUpRef.current = true;
        const nextLv = levelRef.current + 1;
        if (nextLv > 3) {
          cancelAnimationFrame(animRef.current);
          setGameState("win");
        } else {
          setTimeout(() => startLevel(nextLv, scoreRef.current, livesRef.current), 1200);
          setGameState("paused");
          setTimeout(() => setGameState("playing"), 1200);
        }
      }

      // --- Draw ---
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid dots
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let c = 0; c <= COLS; c++)
        for (let r = 0; r <= ROWS; r++)
          ctx.fillRect(c * TILE, r * TILE, 1, 1);

      // Walls
      for (const w of wallsRef.current) drawWall(ctx, w);

      // Bullets
      for (const b of bulletsRef.current) drawBullet(ctx, b);

      // Player
      ctx.save();
      if (playerInvRef.current > 0) ctx.globalAlpha = Math.sin(ts / 80) * 0.5 + 0.5;
      drawTank(ctx, playerRef.current, true);
      ctx.restore();

      // Enemies
      for (const e of enemiesRef.current) {
        drawTank(ctx, e, false);
        if (e.hp > 1) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 11px monospace";
          ctx.fillText("★", e.x + TILE / 2 - 5, e.y - 2);
        }
      }

      // Explosions
      for (const ex of explosionsRef.current) drawExplosion(ctx, ex);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, solidForTank, startLevel]);

  const heartStr = "❤️".repeat(lives);

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center select-none">
      {/* HUD */}
      {gameState === "playing" && (
        <div className="flex items-center gap-8 mb-3 font-mono text-sm">
          <span className="text-green-400 font-bold text-base">🎯 {score}</span>
          <span className="text-yellow-300">УРОВЕНЬ {level}/3</span>
          <span className="text-red-400">Враги: {enemyCount}</span>
          <span className="text-pink-400">{heartStr}</span>
        </div>
      )}

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl border border-white/10 shadow-2xl"
          style={{ display: gameState === "playing" || gameState === "paused" ? "block" : "none" }}
        />

        {/* Level transition overlay */}
        {gameState === "paused" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-5xl mb-2">🏆</p>
              <p className="text-2xl font-bold text-yellow-300 font-mono">УРОВЕНЬ ПРОЙДЕН!</p>
              <p className="text-white/60 mt-2 font-mono">Загружаю следующий...</p>
            </div>
          </div>
        )}

        {/* Menu */}
        {gameState === "menu" && (
          <div
            className="flex flex-col items-center justify-center rounded-xl"
            style={{ width: CANVAS_W, height: CANVAS_H, background: "#0d0d1a" }}
          >
            <div className="text-center mb-10">
              <h1 className="text-7xl mb-2">🛡️</h1>
              <h1
                className="text-5xl font-black font-mono tracking-widest mb-2"
                style={{ color: "#4ade80", textShadow: "0 0 30px #4ade8088" }}
              >
                ТАНКИ
              </h1>
              <p className="text-white/40 font-mono text-sm">Battle City · 2025</p>
            </div>

            <div className="mb-8 text-white/50 font-mono text-sm text-center space-y-1">
              <p>🎮 <span className="text-white/70">Управление:</span> WASD / Стрелки</p>
              <p>💥 <span className="text-white/70">Огонь:</span> Пробел / Enter</p>
              <p>🏅 <span className="text-white/70">3 уровня, 3 жизни</span></p>
            </div>

            <button
              onClick={() => startLevel(1, 0, 3)}
              className="px-12 py-4 rounded-2xl text-xl font-bold font-mono tracking-wider transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #4ade80, #22d3ee)",
                color: "#0d1117",
                boxShadow: "0 0 40px #4ade8055",
              }}
            >
              ▶ НАЧАТЬ ИГРУ
            </button>
          </div>
        )}

        {/* Game Over */}
        {gameState === "gameover" && (
          <div
            className="flex flex-col items-center justify-center rounded-xl"
            style={{ width: CANVAS_W, height: CANVAS_H, background: "#0d0d1a" }}
          >
            <p className="text-7xl mb-4">💥</p>
            <h2 className="text-4xl font-black font-mono text-red-400 mb-2" style={{ textShadow: "0 0 30px #f8717166" }}>
              GAME OVER
            </h2>
            <p className="text-white/50 font-mono mb-2">Уровень {level} · Счёт: <span className="text-yellow-300">{score}</span></p>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => startLevel(level, 0, 3)}
                className="px-8 py-3 rounded-xl font-bold font-mono text-base transition-all hover:scale-105 active:scale-95"
                style={{ background: "#ef4444", color: "#fff", boxShadow: "0 0 20px #ef444455" }}
              >
                🔄 Повторить
              </button>
              <button
                onClick={() => { setGameState("menu"); setScore(0); setLives(3); setLevel(1); }}
                className="px-8 py-3 rounded-xl font-bold font-mono text-base transition-all hover:scale-105 active:scale-95"
                style={{ background: "#334155", color: "#94a3b8" }}
              >
                🏠 Меню
              </button>
            </div>
          </div>
        )}

        {/* Win */}
        {gameState === "win" && (
          <div
            className="flex flex-col items-center justify-center rounded-xl"
            style={{ width: CANVAS_W, height: CANVAS_H, background: "#0d0d1a" }}
          >
            <p className="text-7xl mb-4">🏆</p>
            <h2 className="text-4xl font-black font-mono text-yellow-300 mb-2" style={{ textShadow: "0 0 30px #fbbf2466" }}>
              ПОБЕДА!
            </h2>
            <p className="text-white/60 font-mono mb-1">Все уровни пройдены!</p>
            <p className="text-2xl font-bold font-mono text-green-400 mb-8">
              Финальный счёт: {score}
            </p>
            <button
              onClick={() => { startLevel(1, 0, 3); }}
              className="px-10 py-4 rounded-2xl font-bold font-mono text-lg transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #fbbf24, #f97316)",
                color: "#0d1117",
                boxShadow: "0 0 40px #fbbf2455",
              }}
            >
              🔄 Играть снова
            </button>
          </div>
        )}
      </div>

      {/* Controls hint */}
      {gameState === "playing" && (
        <div className="mt-3 text-white/20 font-mono text-xs flex gap-6">
          <span>WASD / ← ↑ ↓ → — движение</span>
          <span>Пробел / Enter — огонь</span>
        </div>
      )}
    </div>
  );
}
