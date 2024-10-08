<template>
  <div class="game-container">
    <div class="scoreboard">
      <div class="score"> You: {{ playerScore }}</div>
      <div class="score"> AI: {{ aiScore }}</div>
    </div>
    <div class="pong-game" ref="container"></div>
    <div v-if="showEnd" class="end-screen">
      <div class="end-screen-message">{{ endScreenMessage }}</div>
      <button @click="restartGame" class="button">Play Again</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass';

const container = ref(null);
let scene, camera, renderer, composer;
let playerPaddle, aiPaddle, ball;

const playerScore = ref(0);
const aiScore = ref(0);
const showEnd = ref(false);
const endScreenMessage = ref('');
const inputInstructions = ref('Use W/S or Up/Down arrow keys to move');
const playerHasMovedPaddle = ref(false);

// Game state
let ballVelocity = { x: 0.2, y: 0.1 };
const paddleSpeed = 0.5;
let playerMovement = 0;
let aiTargetY = 0;

const initGame = () => {
  initThreeJS();
  window.addEventListener('keydown', handlePlayerMove);
  window.addEventListener('keyup', handleStopPlayerMove);

  const instructionsElement = document.createElement('div');
  instructionsElement.style.position = 'absolute';
  instructionsElement.style.bottom = '20px';
  instructionsElement.style.width = '100%';
  instructionsElement.style.textAlign = 'center';
  instructionsElement.style.color = 'white';
  container.value.appendChild(instructionsElement);

  // Update instructions text
  const updateInstructions = () => {
    instructionsElement.textContent = inputInstructions.value;
  };
  
  watch(inputInstructions, updateInstructions);
  updateInstructions();
};

const initThreeJS = () => {
  // ... (similar to the main component, but without particles)
  scene = new THREE.Scene();
  const width = window.innerWidth * 0.6;
  const height = window.innerHeight * 0.5;

  camera = new THREE.PerspectiveCamera(80, width / height, 0.1, 1000);
  camera.position.z = 20;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Initialize game objects (paddles and ball)
  const paddleGeometry = new THREE.BoxGeometry(1, 4, 1);
  const Material = new THREE.MeshPhongMaterial({
    color: 0xFFFFFF,
    emissive: 0xFFFFFF,
    emissiveIntensity: 1,
    shininess: 100
  });

  playerPaddle = new THREE.Mesh(paddleGeometry, Material);
  playerPaddle.position.x = -14;
  scene.add(playerPaddle);

  aiPaddle = new THREE.Mesh(paddleGeometry, Material);
  aiPaddle.position.x = 14;
  scene.add(aiPaddle);

  const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  ball = new THREE.Mesh(ballGeometry, Material);
  scene.add(ball);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);


// Create the midline geometry
const midlineGeometry = new THREE.BoxGeometry(0.2, 32, 1);
  const midlineMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff
  });
  const midline = new THREE.Mesh(midlineGeometry, midlineMaterial);
  midline.position.set(0, 0, 0);
  scene.add(midline);

  // Create the top and bottom lines
  const topLineGeometry = new THREE.BoxGeometry(40, 0.2, 1);
  const bottomLineGeometry = topLineGeometry.clone();
  const lineMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff
  });
  const topLine = new THREE.Mesh(topLineGeometry, lineMaterial);
  const bottomLine = new THREE.Mesh(bottomLineGeometry, lineMaterial);
  topLine.position.set(0, 16, 0);
  bottomLine.position.set(0, -16, 0);
  scene.add(topLine);
  scene.add(bottomLine);


  nextTick(() => {
    if (container.value) {
      container.value.appendChild(renderer.domElement);
    }
  });

  window.addEventListener('resize', onWindowResize);
  animate();
};

const FPS = 60;
const frameInterval = 1000 / FPS;
let lastFrameTime = 0;
let deltaTime = 0;

const animate = (currentTime) => {
  requestAnimationFrame(animate);

  // Calculate time elapsed since last frame
  const elapsed = currentTime - lastFrameTime;

  // If enough time has elapsed, update and render
  if (elapsed > frameInterval) {
    // Adjust for any extra time beyond the frame interval
    deltaTime = frameInterval / 1000; // Set deltaTime in seconds
    lastFrameTime = currentTime - (elapsed % frameInterval);

    updateGameState(deltaTime); // Convert to seconds
    composer.render();
  }
};

const updateGameState = () => {
  // Move the ball
  ball.position.x += ballVelocity.x;
  ball.position.y += ballVelocity.y;

  // Ball collision with top and bottom
  if (ball.position.y + 0.5 > 16 || ball.position.y - 0.5 < -16) {
    ballVelocity.y *= -1;
  }

  // Ball collision with paddles
  if (
    ballVelocity.x < 0 &&
    ball.position.x - 0.5 <= playerPaddle.position.x + 0.5 &&
    ball.position.x + 0.5 >= playerPaddle.position.x - 0.5 &&
    ball.position.y + 0.5 >= playerPaddle.position.y - 2 &&
    ball.position.y - 0.5 <= playerPaddle.position.y + 2
  ) {
    // Collision with player paddle
    ballVelocity.x *= -1.1;
    
    // Calculate dynamic angle for player paddle collision
    let relativeIntersectY = ball.position.y - playerPaddle.position.y;
    let normalizedRelativeIntersectionY = relativeIntersectY / 2; // 2 is half the paddle height
    normalizedRelativeIntersectionY = Math.max(-1, Math.min(1, normalizedRelativeIntersectionY));
    let bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4; // 45 degree max angle
    
    let speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y);
    ballVelocity.y = speed * Math.sin(bounceAngle);
    ballVelocity.x = Math.abs(speed * Math.cos(bounceAngle)); // Ensure it's moving right
  } else if (
    ballVelocity.x > 0 &&
    ball.position.x + 0.5 >= aiPaddle.position.x - 0.5 &&
    ball.position.x - 0.5 <= aiPaddle.position.x + 0.5 &&
    ball.position.y + 0.5 >= aiPaddle.position.y - 2 &&
    ball.position.y - 0.5 <= aiPaddle.position.y + 2
  ) {
    // Collision with AI paddle
    ballVelocity.x *= -1.1;
    
    // Calculate dynamic angle for AI paddle collision
    let relativeIntersectY = ball.position.y - aiPaddle.position.y;
    let normalizedRelativeIntersectionY = relativeIntersectY / 2; // 2 is half the paddle height
    normalizedRelativeIntersectionY = Math.max(-1, Math.min(1, normalizedRelativeIntersectionY));
    let bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4; // 45 degree max angle
    
    let speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y);
    ballVelocity.y = speed * Math.sin(bounceAngle);
    ballVelocity.x = -Math.abs(speed * Math.cos(bounceAngle)); // Ensure it's moving left
  }

  // Scoring
  if (ball.position.x < -20) {
    aiScore.value++;
    resetBall();
  } else if (ball.position.x > 20) {
    playerScore.value++;
    resetBall();
  }

  // Move player paddle.
  playerPaddle.position.y += playerMovement;
  playerPaddle.position.y = Math.max(Math.min(playerPaddle.position.y, 14), -14); // Keep within bounds

  // Move AI paddle
  aiMovement(deltaTime);

  // Move player paddle if not moved yet
  if (!playerHasMovedPaddle.value) {
    playerAIMovement(deltaTime);
  }

  // Check for game end
  if (playerScore.value >= 11 || aiScore.value >= 11) {
    endGame();
  }
};

const resetBall = () => {
  ball.position.set(0, 0, 0);
  
  // Generate a random angle between 15 and 75 degrees
  const angle = (Math.random() * 60 + 15) * (Math.PI / 180);
  
  const speed = 0.25;
  
  // Calculate the ball's velocity (dx, dy) based on the random angle
  ballVelocity.x = speed * Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1);
  ballVelocity.y = speed * Math.sin(angle) * (Math.random() < 0.5 ? 1 : -1);
};

const predictBallPosition = (paddle) => {
  // Predict time for the ball to reach the AI paddle based on its velocity
  const distanceToPaddle = paddle.position.x - ball.position.x;
  const timeToReachPaddle = Math.abs(distanceToPaddle / ballVelocity.x); // time = distance / velocity

  // Predict future Y position of the ball considering bounces
  let predictedY = ball.position.y + ballVelocity.y * timeToReachPaddle;

  // Safeguard against infinite bouncing: limit number of bounces we predict (e.g., 2)
  const maxBounces = 2;
  let bounces = 0;

  while ((predictedY + 0.5 > 16 || predictedY - 0.5 < -16) && bounces < maxBounces) {
    if (predictedY + 0.5 > 16) {
      predictedY = 16 - (predictedY - 16); // Reflect off top wall
    } else if (predictedY - 0.5 < -16) {
      predictedY = -16 + (-16 - predictedY); // Reflect off bottom wall
    }
    bounces++;
  }

  // If bounces exceed the max limit, stop predicting further (optional safety limit)
  if (bounces >= maxBounces) {
    predictedY = Math.max(Math.min(predictedY, 16), -16); // Limit to the range
  }

  return predictedY;
};

// Track the last dx to detect changes in ball direction
let lastBallDX = ballVelocity.x;

// Store the AI's current offset
let aiCurrentOffset = 0;

const generateRandomOffset = () => {
  const offset = 1.8;
  const minOffset = -offset;
  const maxOffset = offset;
  return Math.random() * (maxOffset - minOffset) + minOffset;
};

const aiMovement = (deltaTime) => {
  // Check if the ball's direction (dx) has changed
  if (ballVelocity.x !== lastBallDX && ballVelocity.x > 0) {
    // Ball direction has changed (e.g., after a bounce), so pick a new offset
    aiCurrentOffset = generateRandomOffset();
    console.log('new offset: ', aiCurrentOffset);
    lastBallDX = ballVelocity.x;  // Update the last known dx
  }

  // Predict where the ball will be when it reaches the AI paddle
  aiTargetY = predictBallPosition(aiPaddle);

  // Apply the current offset to the AI's target position
  aiTargetY += aiCurrentOffset;

  // Calculate AI speed based on score difference (more difficulty with increasing score)
  const scoreDifference = Math.max(0, playerScore.value - aiScore.value);
  const baseSpeed = 0.05;
  const speedIncrease = 0.01 * scoreDifference;
  const aiSpeed = (baseSpeed + speedIncrease) * deltaTime * 60;

  // Move AI paddle towards the (offset) predicted Y position
  const direction = Math.sign(aiTargetY - aiPaddle.position.y);

  // if (aiPaddle.position.y - direction > 0.2 || aiPaddle.position.y - direction < -0.2)
    aiPaddle.position.y += direction * aiSpeed;

  // Keep AI paddle within bounds
  aiPaddle.position.y = Math.max(Math.min(aiPaddle.position.y, 14), -14);
};

const playerAIMovement = (deltaTime) => {
  // Simple AI for player paddle (similar to aiMovement but slower)

  let   target = predictBallPosition(playerPaddle);
  const playerAISpeed = 0.10 * deltaTime * 60;
  const direction = Math.sign(target - playerPaddle.position.y);
  playerPaddle.position.y += direction * playerAISpeed;

  // Keep player paddle within bounds
  playerPaddle.position.y = Math.max(Math.min(playerPaddle.position.y, 14), -14);
};

const handlePlayerMove = (event) => {
  if ((event.key === 'w' || event.key === 'ArrowUp') && playerMovement == 0) {
    if (playerHasMovedPaddle.value == false)
      playerHasMovedPaddle.value = true;
    playerMovement = paddleSpeed;
  } else if ((event.key === 's' || event.key === 'ArrowDown') && playerMovement == 0) {
    if (playerHasMovedPaddle.value == false)
      playerHasMovedPaddle.value = true;
    playerMovement = -paddleSpeed;
  }
  playerPaddle.position.y = Math.max(Math.min(playerPaddle.position.y, 14), -14); // Keep within bounds
};

const handleStopPlayerMove = (event) => {
  if ((event.key === 'w' || event.key === 'ArrowUp') && playerMovement != 0) {
    playerMovement = 0;
  } else if ((event.key === 's' || event.key === 'ArrowDown') && playerMovement != 0) {
    playerMovement = 0;
  }
};

const onWindowResize = () => {
  const width = window.innerWidth * 0.6;
  const height = window.innerHeight * 0.5;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const endGame = () => {
  showEnd.value = true;
  endScreenMessage.value = playerScore.value > aiScore.value ? 'You won!' : 'AI won!';
};

const restartGame = () => {
  playerScore.value = 0;
  aiScore.value = 0;
  showEnd.value = false;
  resetBall();
};

onMounted(() => {
  initGame();
});

onBeforeUnmount(() => {
  if (renderer) {
    renderer.dispose();
  }
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', handlePlayerMove);
  window.removeEventListener('keyup', handleStopPlayerMove);
});
</script>

<style scoped>
/* You can reuse most of the styles from the main PongGame component */
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: #1a1a1a;
  width: 60vw;
  height: 80vh;
  margin: 0 auto;
  border-radius: 8px;
}

.pong-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.scoreboard {
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 20px;
	font-size: 24px;
	color: #ffffff;
}

.score {
	flex: 1;
	text-align: center;
}

</style>