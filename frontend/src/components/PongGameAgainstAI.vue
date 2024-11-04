<template>
  <div class="game-container">
    <div class="scoreboard">
      <div class="score"> You: {{ playerScore }}</div>
      <div v-if="bigPong"> BIG PONG </div>
      <div class="score"> AI: {{ aiScore }}</div>
    </div>
    <div class="pong-game" ref="container"></div>
    
    <!-- <div v-if="!playerHasMovedPaddle">Use W/S or Up and Down arrow keys to move your paddle!</div> -->
    <div class="queue-container" >
      <button @click="resetPong()" class="queue-button">Reset Score</button>
      <button @click="toggleBigPong()" class="queue-button">Toggle Big Pong</button>
      <button v-if="!waitingForOpponent" @click="queueForPong(false)" class="queue-button">Queue for Pong</button>
      <button v-if="!waitingForOpponent" @click="queueForPong(true)" class="queue-button">Queue for Big Pong</button>
      <div v-if="waitingForOpponent" class="waiting-overlay">
        Waiting for opponent...
        <div class="half-circle-spinner">
          <div class="circle circle-1"></div>
          <div class="circle circle-2"></div>
        </div>
        <button @click="stopQueue" class="cancel-button">Cancel Queue</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { useStore } from 'vuex';
// import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass';

const store = useStore();
const socket = computed(() => store.state.socket);
const currentUser = computed(() => store.state.currentUser);
// const inQueue = computed(() => store.state.inQueue);

const container = ref(null);
let scene, camera, renderer, composer;
let playerPaddle, aiPaddle, ball;

const playerScore = ref(0);
const aiScore = ref(0);
const playerHasMovedPaddle = ref(false);
const waitingForOpponent = ref(false);
const bigPong = ref(false);
const ballScale = ref(0.5);

// Game state
let ballVelocity = { x: 0.2, y: 0.1 };
const paddleSpeed = 0.5;
let playerMovement = 0;
// let aiTargetY = 0;

const initGame = () => {
  initThreeJS();
  window.addEventListener('keydown', handlePlayerMove);
  window.addEventListener('keyup', handleStopPlayerMove);
};

const initThreeJS = () => {
  scene = new THREE.Scene();
  const width = window.innerWidth * 0.8;
  const height = window.innerHeight * 0.5;

  camera = new THREE.PerspectiveCamera(80, width / height, 0.1, 1000);
  camera.position.z = 20;
  camera.position.x = 2;

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
  playerPaddle.position.x = -18;
  scene.add(playerPaddle);

  aiPaddle = new THREE.Mesh(paddleGeometry, Material);
  aiPaddle.position.x = 18;
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
  const midlineGeometry = new THREE.BoxGeometry(0.25, 32.5, 1);
  const midlineMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff
  });
  const midline = new THREE.Mesh(midlineGeometry, midlineMaterial);
  midline.position.set(0, 0, -1);
  scene.add(midline);
  
  // Todo: remove
  // temporary line geo 
  // const endline1 = new THREE.Mesh(midlineGeometry, midlineMaterial);
  // endline1.position.set(20, 0, -1);
  // const endline2 = new THREE.Mesh(midlineGeometry, midlineMaterial);
  // endline2.position.set(-20, 0, -1);  
  // scene.add(endline1);
  // scene.add(endline2);

  // Create the top and bottom lines
  const topLineGeometry = new THREE.BoxGeometry(48, 0.2, 1);
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
let animationFrameId;

const animate = (currentTime) => {
  animationFrameId = requestAnimationFrame(animate);

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

const colorMilestones = [0xFFFFFF, 0xF5F5DC, 0xFFFF00, 0xFFA500, 0xFF0000, 0x800080]; // White, Beige, Yellow, Orange, Red, Purple

const updateGameState = () => {
  ball.position.x += ballVelocity.x;
  ball.position.y += ballVelocity.y;

  if ((ball.position.y + ballScale.value > 16 && ballVelocity.y > 0) || (ball.position.y - ballScale.value < -16 && ballVelocity.y < 0)) {
    ballVelocity.y *= -1;
  }

  // Ball collision with paddles
  if (
    ballVelocity.x < 0 &&
    ball.position.x - ballScale.value <= playerPaddle.position.x + ballScale.value &&
    ball.position.x + ballScale.value >= playerPaddle.position.x - ballScale.value &&
    ball.position.y + ballScale.value >= playerPaddle.position.y - 2 &&
    ball.position.y - ballScale.value <= playerPaddle.position.y + 2
  ) {
    // Collision with player paddle
    ballVelocity.x *= -1.1;
    if (bigPong.value) {
      ballScale.value += 0.1;
      ball.scale.set(ballScale.value / 0.5 , ballScale.value / 0.5, ballScale.value / 0.5);
      console.log(`ball grows: ${ballScale.value}`);
    }
    // ball.radius = parseFloat(ball.radius.toFixed(1));

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
    ball.position.x + ballScale.value >= aiPaddle.position.x - ballScale.value &&
    ball.position.x - ballScale.value <= aiPaddle.position.x + ballScale.value &&
    ball.position.y + ballScale.value >= aiPaddle.position.y - 2 &&
    ball.position.y - ballScale.value <= aiPaddle.position.y + 2
  ) {
    // Collision with AI paddle
    ballVelocity.x *= -1.1;
    if (bigPong.value) {
      ballScale.value += 0.1;
      ball.scale.set(ballScale.value / 0.5 , ballScale.value / 0.5, ballScale.value / 0.5);
      console.log(`ball grows: ${ballScale.value}`);
    }
    // ball.radius = parseFloat(ball.radius.toFixed(1));
    // calculate dynamic angle for AI paddle collision
    let relativeIntersectY = ball.position.y - aiPaddle.position.y;
    let normalizedRelativeIntersectionY = relativeIntersectY / 2; // 2 is half the paddle height
    normalizedRelativeIntersectionY = Math.max(-1, Math.min(1, normalizedRelativeIntersectionY));
    let bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4; // 45 degree max angle
    
    let speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y);
    ballVelocity.y = speed * Math.sin(bounceAngle);
    ballVelocity.x = -Math.abs(speed * Math.cos(bounceAngle));
  }

  // Scoring
  if (ball.position.x < -24) {
    aiScore.value++;
    resetBall();
  } else if (ball.position.x > 24) {
    playerScore.value++;
    resetBall();
    checkAndUpdateAiPaddleColor();
  }

  playerPaddle.position.y += playerMovement;
  playerPaddle.position.y = Math.max(Math.min(playerPaddle.position.y, 14), -14);

  aiMovement(deltaTime);

  if (!playerHasMovedPaddle.value) {
    playerAIMovement(deltaTime);
  }
};

const checkAndUpdateAiPaddleColor = () => {
  const milestone = Math.floor(playerScore.value / 1);
  
  if (milestone < colorMilestones.length) {
    const newColor = colorMilestones[milestone];

    const newMaterial = new THREE.MeshPhongMaterial({
      color: newColor,
      emissive: newColor,
      emissiveIntensity: 0.8,
      shininess: 100,
    });

    aiPaddle.material = newMaterial;
    aiPaddle.material.needsUpdate = true;
  }
};

const resetPong = () => {
  aiPaddle.position.y = 0;
  playerPaddle.position.y = 0;
  resetBall();
  aiScore.value = 0;
  playerScore.value = 0;
  playerHasMovedPaddle.value = false;
  checkAndUpdateAiPaddleColor();
}

const toggleBigPong = () => {
  bigPong.value = !bigPong.value;
}

const resetBall = () => {
  ball.position.set(0, 0, 0);
  ballScale.value = 0.5;
  ball.scale.set(ballScale.value / 0.5 , ballScale.value / 0.5, ballScale.value / 0.5);
  // generate a random angle between 15 and 75 degrees
  const angle = (Math.random() * 60 + 15) * (Math.PI / 180);
  
  const speed = 0.25;
  
  // calculate the ball's velocity (dx, dy) based on the random angle
  ballVelocity.x = speed * Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1);
  ballVelocity.y = speed * Math.sin(angle) * (Math.random() < 0.5 ? 1 : -1);
};

const predictBallPosition = (paddle) => {
  const distanceToPaddle = paddle.position.x - ball.position.x;
  const timeToReachPaddle = Math.abs(distanceToPaddle / ballVelocity.x);

  let predictedY = ball.position.y + ballVelocity.y * timeToReachPaddle;

  const maxBounces = 2;
  let bounces = 0;

  while ((predictedY + 0.5 > 16 || predictedY - 0.5 < -16) && bounces < maxBounces) {
    if (predictedY + 0.5 > 16) {
      predictedY = 16 - (predictedY - 16);
    } else if (predictedY - 0.5 < -16) {
      predictedY = -16 + (-16 - predictedY);
    }
    bounces++;
  }

  if (bounces >= maxBounces) {
    predictedY = Math.max(Math.min(predictedY, 16), -16);
  }

  return predictedY;
};

let lastBallDX = ballVelocity.x;

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
    aiCurrentOffset = generateRandomOffset();
    lastBallDX = ballVelocity.x;  // Update the last known dx
  }

  let aiTargetY = predictBallPosition(aiPaddle)
  aiTargetY += aiCurrentOffset;

  // Calculate AI speed based on score difference (more difficulty with increasing score)
  const scoreDifference = Math.max(0, playerScore.value - aiScore.value);
  const baseSpeed = 0.08;
  const speedIncrease = 0.01 * scoreDifference;
  const aiSpeed = (baseSpeed + speedIncrease) * deltaTime * 60;

  const direction = Math.sign(aiTargetY - aiPaddle.position.y);

  if (aiPaddle.position.y - aiTargetY > 0.2 || aiPaddle.position.y - aiTargetY < -0.2)
    aiPaddle.position.y += direction * aiSpeed;

  aiPaddle.position.y = Math.max(Math.min(aiPaddle.position.y, 14), -14);
};

const playerAIMovement = (deltaTime) => {
  let   target = predictBallPosition(playerPaddle);
  const playerAISpeed = 0.10 * deltaTime * 60;
  const direction = Math.sign(target - playerPaddle.position.y);


  if (playerPaddle.position.y - target > 0.2 || playerPaddle.position.y - target < -0.2)
    playerPaddle.position.y += direction * playerAISpeed;

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
  const height = window.innerHeight * 0.5;
  const width = window.innerWidth * 0.8;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const queueForPong = (bigPong) => {
  if (socket.value) {
    socket.value.emit('joinGame', {
      userId: currentUser.value.id,
      username: currentUser.value.username,
      isPrivate: false,
      bigPong: bigPong,
    });
    waitingForOpponent.value = true;
    store.commit('SET_IN_QUEUE', true);
    
    console.log(`sent joinGame from socket: ${socket.value.id}, with UID: ${currentUser.value.id}, name: ${currentUser.value.username}`);
  } else {
    console.log('somehow no socket.value');
  }
};

const stopQueue = () => {
  waitingForOpponent.value = false;
  if (socket.value) {
    socket.value.emit('leaveGame', {
      userId: currentUser.value.id,
      username: currentUser.value.username,
    });
  }
}

onMounted(() => {
  initGame();
});

onBeforeUnmount(() => {
  console.log('DISMOUNTING PONG AI GAME');

  // Cancel the animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    console.log('Animation frame canceled');
  }

  // Dispose of renderer
  if (renderer) {
    renderer.dispose();
  }

  // Remove event listeners
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', handlePlayerMove);
  window.removeEventListener('keyup', handleStopPlayerMove);

});
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: row;
  position: relative;
  background-color: #1a1a1a;
  overflow: hidden;
}

.pong-game {
  display: flex;
  width: 95%;
  height: 100%;
  border-radius: 6px;
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

/* queue stuff */
.waiting-overlay {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 20px 40px;
  border-radius: 10px;
  color: white;
  font-size: 24px;
  text-align: center;
  /* box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.3); */
  z-index: 1000;
}

.queue-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding-top: 1px;
  height: 10%;
  width: 100%;
}

.queue-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 10px;
  height: 3vh;
  width: 15vw;
  margin-bottom: 10px;
  background-color: #e0e0e0;
  transition: background-color 0.3s;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: calc(0.6vw + 0.6vh);
  text-align: center;
}

.queue-button:hover {
  background-color: #3a8d3e; 
}

.cancel-button {
  margin-top: 15px;
  background-color: #ac4040;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 18px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.cancel-button:hover {
  background-color: #ff3333;
}

/* spinner loading animation */
.half-circle-spinner, .half-circle-spinner * {
  box-sizing: border-box;
}

.half-circle-spinner {
  width: 60px;
  height: 60px;
  border-radius: 100%;
  position: relative;
  margin: 5px auto;
}

.half-circle-spinner .circle {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 100%;
  border: calc(60px / 10) solid transparent;
}

.half-circle-spinner .circle.circle-1 {
  border-top-color: #ff1d5e;
  animation: half-circle-spinner-animation 1s infinite;
}

.half-circle-spinner .circle.circle-2 {
  border-bottom-color: #ff1d5e;
  animation: half-circle-spinner-animation 1s infinite alternate;
}

@keyframes half-circle-spinner-animation {
  0% {
    transform: rotate(0deg);
  }
  100%{
    transform: rotate(360deg);
  }
}
</style>