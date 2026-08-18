(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const CANVAS_WIDTH = canvas.width;
  const CANVAS_HEIGHT = canvas.height;
  const PADDLE_SPEED = 6;
  const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60°, medido desde la vertical

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

  const initialPaddle = createInitialPaddle();
  const initialBall = createInitialBall(initialPaddle);

  const state = {
    status: 'START', // "START" | "PLAYING" | "GAME_OVER" | "WIN"
    score: 0,
    lives: 3,
    paddle: initialPaddle,
    ball: initialBall,
    blocks: [],
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

  function drawStartOverlay() {
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Presiona una tecla o haz clic para jugar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  function render() {
    drawBackground();
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
