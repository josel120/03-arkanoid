(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const CANVAS_WIDTH = canvas.width;
  const CANVAS_HEIGHT = canvas.height;
  const PADDLE_SPEED = 6;
  const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60°, medido desde la vertical

  const BLOCK_ROWS = 5;
  const BLOCK_COLS = 8;
  const BLOCK_WIDTH = 56;
  const BLOCK_HEIGHT = 24;
  const BLOCK_GAP = 2;
  const BLOCK_TOP_OFFSET = 60;

  const BLOCK_POINTS = {
    red: 70,
    hotpink: 60,
    magenta: 50,
    yellow: 40,
    green: 30,
  };

  // LEVELS[i] es el grid (5 filas x 8 columnas) del nivel i+1.
  // Cada celda es un color de bloque o null (celda vacía, sin bloque).
  const LEVELS = [
    // Nivel 1: pirámide
    [
      [null, null, null, 'red', 'red', null, null, null],
      [null, null, 'hotpink', 'hotpink', 'hotpink', 'hotpink', null, null],
      [null, 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', null],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green'],
    ],
    // Nivel 2: tablero de ajedrez
    [
      ['red', null, 'red', null, 'red', null, 'red', null],
      [null, 'hotpink', null, 'hotpink', null, 'hotpink', null, 'hotpink'],
      ['magenta', null, 'magenta', null, 'magenta', null, 'magenta', null],
      [null, 'yellow', null, 'yellow', null, 'yellow', null, 'yellow'],
      ['green', null, 'green', null, 'green', null, 'green', null],
    ],
    // Nivel 3: marco/borde
    [
      ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['hotpink', null, null, null, null, null, null, 'hotpink'],
      ['magenta', null, null, null, null, null, null, 'magenta'],
      ['yellow', null, null, null, null, null, null, 'yellow'],
      ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green'],
    ],
    // Nivel 4: portal (barras llenas con hueco central)
    [
      ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink'],
      ['magenta', null, null, null, null, null, null, 'magenta'],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green'],
    ],
    // Nivel 5: grid completo
    [
      ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
      ['hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink'],
      ['magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta'],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green'],
    ],
  ];

  const ballBounceSound = new Audio('assets/sounds/ball-bounce.mp3');
  const breakSound = new Audio('assets/sounds/break-sound.mp3');

  function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function createInitialPaddle() {
    const width = 90;
    const height = 14;
    return {
      x: (CANVAS_WIDTH - width) / 2,
      y: CANVAS_HEIGHT - height - 20,
      width,
      height,
    };
  }

  function createInitialBall(paddle) {
    const width = 14;
    const height = 14;
    return {
      x: paddle.x + paddle.width / 2 - width / 2,
      y: paddle.y - height - 2,
      width,
      height,
      dx: 3,
      dy: -3,
    };
  }

  function createBlocks(level) {
    const gridWidth = BLOCK_COLS * BLOCK_WIDTH + (BLOCK_COLS - 1) * BLOCK_GAP;
    const leftMargin = (CANVAS_WIDTH - gridWidth) / 2;
    const grid = LEVELS[level - 1];
    const blocks = [];

    for (let row = 0; row < BLOCK_ROWS; row++) {
      for (let col = 0; col < BLOCK_COLS; col++) {
        const color = grid[row][col];
        if (color === null) continue;

        blocks.push({
          x: leftMargin + col * (BLOCK_WIDTH + BLOCK_GAP),
          y: BLOCK_TOP_OFFSET + row * (BLOCK_HEIGHT + BLOCK_GAP),
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          color,
          points: BLOCK_POINTS[color],
          alive: true,
        });
      }
    }

    return blocks;
  }

  const initialPaddle = createInitialPaddle();
  const initialBall = createInitialBall(initialPaddle);

  const state = {
    status: 'START', // "START" | "PLAYING" | "LEVEL_TRANSITION" | "GAME_OVER" | "WIN"
    level: 1, // 1..5
    score: 0,
    lives: 3,
    paddle: initialPaddle,
    ball: initialBall,
    blocks: createBlocks(1),
    explosions: [],
  };

  const keys = { left: false, right: false };

  function clampPaddle() {
    state.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - state.paddle.width, state.paddle.x));
  }

  function updatePaddleFromKeys() {
    if (keys.left) state.paddle.x -= PADDLE_SPEED;
    if (keys.right) state.paddle.x += PADDLE_SPEED;
    clampPaddle();
  }

  function updateBall() {
    const ball = state.ball;
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.dx = -ball.dx;
      playSound(ballBounceSound);
    } else if (ball.x + ball.width >= CANVAS_WIDTH) {
      ball.x = CANVAS_WIDTH - ball.width;
      ball.dx = -ball.dx;
      playSound(ballBounceSound);
    }

    if (ball.y <= 0) {
      ball.y = 0;
      ball.dy = -ball.dy;
      playSound(ballBounceSound);
    }

    if (isCollidingWithPaddle(ball)) {
      reflectOffPaddle(ball);
      playSound(ballBounceSound);
    }

    checkBlockCollision(ball);

    if (ball.y > CANVAS_HEIGHT) {
      loseLife();
    }
  }

  function resetBallAndPaddle() {
    const paddle = createInitialPaddle();
    const ball = createInitialBall(paddle);
    state.paddle = paddle;
    state.ball = ball;
  }

  function loseLife() {
    state.lives -= 1;
    resetBallAndPaddle();

    if (state.lives <= 0) {
      state.status = 'GAME_OVER';
    }
  }

  function checkBlockCollision(ball) {
    for (const block of state.blocks) {
      if (!block.alive) continue;

      const isColliding =
        ball.x < block.x + block.width &&
        ball.x + ball.width > block.x &&
        ball.y < block.y + block.height &&
        ball.y + ball.height > block.y;

      if (!isColliding) continue;

      block.alive = false;
      playSound(breakSound);
      state.score += block.points;
      state.explosions.push({
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        color: block.color,
        startTime: performance.now(),
      });
      resolveBlockBounce(ball, block);
      checkWinCondition();
      break;
    }
  }

  function updateExplosions() {
    state.explosions = state.explosions.filter(
      (explosion) => performance.now() - explosion.startTime < EXPLOSION_DURATION
    );
  }

  function checkWinCondition() {
    if (!state.blocks.every((block) => !block.alive)) return;

    if (state.level < LEVELS.length) {
      state.status = 'LEVEL_TRANSITION';
    } else {
      state.status = 'WIN';
    }
  }

  function resolveBlockBounce(ball, block) {
    const overlapLeft = ball.x + ball.width - block.x;
    const overlapRight = block.x + block.width - ball.x;
    const overlapTop = ball.y + ball.height - block.y;
    const overlapBottom = block.y + block.height - ball.y;

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      ball.dx = -ball.dx;
    } else {
      ball.dy = -ball.dy;
    }
  }

  function isCollidingWithPaddle(ball) {
    const paddle = state.paddle;
    return (
      ball.dy > 0 &&
      ball.x < paddle.x + paddle.width &&
      ball.x + ball.width > paddle.x &&
      ball.y < paddle.y + paddle.height &&
      ball.y + ball.height > paddle.y
    );
  }

  function reflectOffPaddle(ball) {
    const paddle = state.paddle;
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    const paddleCenterX = paddle.x + paddle.width / 2;
    const ballCenterX = ball.x + ball.width / 2;
    const normalizedIntersect = Math.max(
      -1,
      Math.min(1, (ballCenterX - paddleCenterX) / (paddle.width / 2))
    );
    const bounceAngle = normalizedIntersect * MAX_BOUNCE_ANGLE;

    ball.dx = speed * Math.sin(bounceAngle);
    ball.dy = -speed * Math.cos(bounceAngle);
    ball.y = paddle.y - ball.height;
  }

  function restartGame() {
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.blocks = createBlocks(state.level);
    state.explosions = [];
    resetBallAndPaddle();
    state.status = 'PLAYING';
  }

  function handleInput() {
    if (state.status === 'START') {
      state.status = 'PLAYING';
    } else if (state.status === 'GAME_OVER' || state.status === 'WIN') {
      restartGame();
    } else if (state.status === 'LEVEL_TRANSITION') {
      state.level += 1;
      state.blocks = createBlocks(state.level);
      resetBallAndPaddle();
      state.status = 'PLAYING';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    handleInput();
  }

  function handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  }

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    state.paddle.x = mouseX - state.paddle.width / 2;
    clampPaddle();
  }

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleInput);

  function drawBackground() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawPaddle() {
    drawSprite(ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height);
  }

  function drawBall() {
    drawSprite(ctx, 'ball', state.ball.x, state.ball.y, state.ball.width, state.ball.height);
  }

  function drawBlocks() {
    for (const block of state.blocks) {
      if (!block.alive) continue;
      drawSprite(ctx, `block_${block.color}`, block.x, block.y, block.width, block.height);
    }
  }

  function drawExplosions() {
    for (const explosion of state.explosions) {
      const frameIndex = Math.min(
        3,
        Math.floor((performance.now() - explosion.startTime) / (EXPLOSION_DURATION / 4))
      );
      const frame = EXPLOSION_FRAMES[explosion.color][frameIndex];
      drawFrame(ctx, frame, explosion.x, explosion.y, explosion.width, explosion.height);
    }
  }

  function drawStartOverlay() {
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Presiona una tecla o haz clic para jugar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  function drawGameOverOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '28px sans-serif';
    ctx.fillText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.font = '18px sans-serif';
    ctx.fillText(`Score final: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  }

  function drawWinOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '28px sans-serif';
    ctx.fillText('¡Victoria!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.font = '18px sans-serif';
    ctx.fillText(`Score final: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  }

  function drawLevelTransitionOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '28px sans-serif';
    ctx.fillText(`¡Nivel ${state.level} completado!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.font = '18px sans-serif';
    ctx.fillText(
      'Presiona una tecla o haz clic para continuar',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 20
    );
  }

  function drawHUD() {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'top';

    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${state.score}`, 10, 10);

    ctx.textAlign = 'center';
    ctx.fillText(`Nivel: ${state.level}/${LEVELS.length}`, CANVAS_WIDTH / 2, 10);

    ctx.textAlign = 'right';
    ctx.fillText(`Vidas: ${state.lives}`, CANVAS_WIDTH - 10, 10);
  }

  function render() {
    drawBackground();
    drawBlocks();
    drawExplosions();
    drawPaddle();
    drawBall();

    if (state.status === 'PLAYING') {
      drawHUD();
    } else if (state.status === 'START') {
      drawStartOverlay();
    } else if (state.status === 'GAME_OVER') {
      drawGameOverOverlay();
    } else if (state.status === 'WIN') {
      drawWinOverlay();
    } else if (state.status === 'LEVEL_TRANSITION') {
      drawLevelTransitionOverlay();
    }
  }

  function update() {
    if (state.status === 'PLAYING') {
      updatePaddleFromKeys();
      updateBall();
      updateExplosions();
    }
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  loadSpritesheet(function () {
    requestAnimationFrame(loop);
  });
})();
