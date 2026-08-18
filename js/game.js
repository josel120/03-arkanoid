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
  const BLOCK_ROW_COLORS = ['red', 'hotpink', 'magenta', 'yellow', 'green'];

  const BLOCK_POINTS = {
    red: 70,
    hotpink: 60,
    magenta: 50,
    yellow: 40,
    green: 30,
  };

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

  function createBlocks() {
    const gridWidth = BLOCK_COLS * BLOCK_WIDTH + (BLOCK_COLS - 1) * BLOCK_GAP;
    const leftMargin = (CANVAS_WIDTH - gridWidth) / 2;
    const blocks = [];

    for (let row = 0; row < BLOCK_ROWS; row++) {
      const color = BLOCK_ROW_COLORS[row];
      const points = BLOCK_POINTS[color];
      for (let col = 0; col < BLOCK_COLS; col++) {
        blocks.push({
          x: leftMargin + col * (BLOCK_WIDTH + BLOCK_GAP),
          y: BLOCK_TOP_OFFSET + row * (BLOCK_HEIGHT + BLOCK_GAP),
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          color,
          points,
          alive: true,
        });
      }
    }

    return blocks;
  }

  const initialPaddle = createInitialPaddle();
  const initialBall = createInitialBall(initialPaddle);

  const state = {
    status: 'START', // "START" | "PLAYING" | "GAME_OVER" | "WIN"
    score: 0,
    lives: 3,
    paddle: initialPaddle,
    ball: initialBall,
    blocks: createBlocks(),
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
    } else if (ball.x + ball.width >= CANVAS_WIDTH) {
      ball.x = CANVAS_WIDTH - ball.width;
      ball.dx = -ball.dx;
    }

    if (ball.y <= 0) {
      ball.y = 0;
      ball.dy = -ball.dy;
    }

    if (isCollidingWithPaddle(ball)) {
      reflectOffPaddle(ball);
    }

    checkBlockCollision(ball);
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
      state.score += block.points;
      resolveBlockBounce(ball, block);
      break;
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

  function startGame() {
    if (state.status === 'START') {
      state.status = 'PLAYING';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    startGame();
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
  canvas.addEventListener('click', startGame);

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

  function drawStartOverlay() {
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Presiona una tecla o haz clic para jugar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  function render() {
    drawBackground();
    drawBlocks();
    drawPaddle();
    drawBall();

    if (state.status === 'START') {
      drawStartOverlay();
    }
  }

  function update() {
    if (state.status === 'PLAYING') {
      updatePaddleFromKeys();
      updateBall();
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
