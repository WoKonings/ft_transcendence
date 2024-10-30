<template>
  <div v-if="gameStarted" class="game-container">
  <!-- <div class="game-container"> -->
      <!-- Main Game UI -->
    <div class="scoreboard">
      <div class="score"> {{ player1 }}: {{ player1Score }}</div>
      <div class="score"> {{ player2}}: {{ player2Score }}</div>
    </div>
    <div class="pong-game" ref="container"></div>
    <button @click="stopGame" class="cancel-button">Forfeit Game</button>
    <div v-if="showEnd && endScreenMessage" class="end-screen">
      <div class="end-screen-message"> {{ endScreenMessage }}</div>
      <button @click="exitGame()" class="button">Ok</button>
    </div>
  </div>
  
  <PongGameAgainstAI v-if="!gameStarted" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { useStore } from 'vuex';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass';
import PongGameAgainstAI from './PongGameAgainstAI.vue';

const store = useStore();
const socket = computed(() => store.state.socket);
const currentUser = computed(() => store.state.currentUser);
// const inQueue = computed(() => store.state.inQueue);

const container = ref(null);
let scene, camera, renderer, composer;
let player1, player2; //as username
let paddle1, paddle2, ball;
// let playerPosition = { y: 0 };
const waitingForOpponent = ref(false);
const gameStarted = ref(false);
const player1Score = ref(0);
const player2Score = ref(0);
const gameMode = ref('classic'); // New reactive property for game mode
const showEnd = ref(false);
const endScreenMessage = ref('xd');

// Particle system variables
let particleGeometry, particleMaterial, particles;
const particleCount = 100;
let particlePositions = [];
let particleLifetimes = [];
let particleVelocities = [];

const initGame = () => {
  initThreeJS();
  initParticleSystem();
  window.addEventListener('keydown', handlePlayerMove);
  window.addEventListener('keyup', handleStopPlayerMove);
};

const initThreeJS = () => {
  if (!container.value) {
    console.error('Container is not available');
    return;
  }

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
  if (gameMode.value === 'flashy') {
    const afterimagePass = new AfterimagePass(0.9);
    composer.addPass(afterimagePass);
  }
  // const afterimagePass = new AfterimagePass(0.9);
  // composer.addPass(afterimagePass);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);

  // Initialize game objects
  const paddleGeometry = new THREE.BoxGeometry(1, 4, 1);
  const paddleMaterial = new THREE.MeshPhongMaterial({
    color: (gameMode.value === 'flashy') ? 0xFFA500 : 0xFFFFFF,
    emissive: (gameMode.value === 'flashy') ? 0x0077ff: 0xFFFFFF,
    emissiveIntensity: 1,
    shininess: 100
  });

  paddle1 = new THREE.Mesh(paddleGeometry, paddleMaterial);
  paddle1.position.x = -18;
  scene.add(paddle1);

  paddle2 = new THREE.Mesh(paddleGeometry, paddleMaterial);
  paddle2.position.x = 18;
  scene.add(paddle2);

  const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const ballMaterial = new THREE.MeshPhongMaterial({
    color: (gameMode.value === 'flashy') ? 0xff00ff : 0xFFFFFF,
    emissive: (gameMode.value === 'flashy') ? 0x550055 : 0xFFFFFF,
    emissiveIntensity: 1,
    shininess: 100
  });

  ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.position.set(0, 0, 0);
  scene.add(ball);

  // Create the midline geometry
  const midlineGeometry = new THREE.BoxGeometry(0.25, 32.5, 1);
  const midlineMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff
  });
  const midline = new THREE.Mesh(midlineGeometry, midlineMaterial);
  midline.position.set(0, 0, -1);
  scene.add(midline);

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

  // Ensure the container is available before appending
  nextTick(() => {
    if (container.value) {
      container.value.appendChild(renderer.domElement);
    } else {
      console.error('Container is still not available after nextTick');
    }
  });

  window.addEventListener('resize', onWindowResize);
  animate();
};

const initParticleSystem = () => {
  if (!scene) {
    console.error('Scene is not initialized');
    return;
  }

  if (gameMode.value != 'flashy')
    return;
  particleGeometry = new THREE.BufferGeometry();
  particleMaterial = new THREE.PointsMaterial({
    color: 0xff00ff,
    size: 0.3,
    transparent: true,
    opacity: 1.0,
  });

  particlePositions = new Float32Array(particleCount * 3);
  particleLifetimes = new Float32Array(particleCount);
  particleVelocities = new Float32Array(particleCount * 3);

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  for (let i = 0; i < particleCount; i++) {
    particleLifetimes[i] = 0;
    particleVelocities[i * 3] = (Math.random() - 0.5) * 0.1;
    particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
    particleVelocities[i * 3 + 2] = -0.1;
  }
};

const updateParticles = () => {
  if (gameMode.value != 'flashy')
    return;

  for (let i = 0; i < particleCount; i++) {
    if (particleLifetimes[i] > 0) {
      particleLifetimes[i] -= 0.02;
      particlePositions[i * 3] += particleVelocities[i * 3];
      particlePositions[i * 3 + 1] += particleVelocities[i * 3 + 1];
      particlePositions[i * 3 + 2] += particleVelocities[i * 3 + 2];
      particleMaterial.opacity = Math.max(0, particleLifetimes[i]);
    }
  }
  particles.geometry.attributes.position.needsUpdate = true;
};

const emitParticle = (x, y) => {
  if (gameMode.value != 'flashy')
    return;

  for (let i = 0; i < particleCount; i++) {
    if (particleLifetimes[i] <= 0) {
      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = 0;
      particleLifetimes[i] = 1.0;
      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
      particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      particleVelocities[i * 3 + 2] = -0.1;
      break;
    }
  }
};

const animate = () => {
  requestAnimationFrame(animate);
  composer.render();
};

const onWindowResize = () => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Calculate 60% of the window dimensions
  const newWidth = windowWidth * 0.6;
  const newHeight = windowHeight * 0.5;

  // Set the renderer size and camera aspect
  renderer.setSize(newWidth, newHeight);
  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  // renderer.setSize(800, 600);
  // camera.aspect = 800 / 600;
  // camera.updateProjectionMatrix();
};

const updateGameObjects = (gameState) => {
  if (!gameState || !gameState.paddle1 || !gameState.paddle2 || !gameState.ball) {
    console.error('Invalid game state', gameState);
    return;
  }

  if (!paddle1 || !paddle2 || !ball) {
    console.error('Game objects are not initialized');
    return;
  }
  
  if (player1Score.value + player2Score.value != gameState.score.playerOne + gameState.score.playerTwo) {
    console.log("player1Score:", player1Score.value, "player2Score:", player2Score.value, "gameState.score.playerOne:", gameState.score.playerOne, "gameState.score.PlayerTwo:", gameState.score.PlayerTwo);
    for (let i = 0; i < 50; i++) {
      emitParticle(ball.position.x, ball.position.y);
    }
  }
  paddle1.position.y = gameState.paddle1.y;
  paddle1.position.x = gameState.paddle1.x;
  paddle2.position.y = gameState.paddle2.y;
  paddle2.position.x = gameState.paddle2.x;
  ball.position.x = gameState.ball.x;
  ball.position.y = gameState.ball.y;
  // ball.radius = gameState.ball.radius;
  // console.log(`ball radius: ${gameState.ball.radius * 2}`);
  // if (gameState.ball.radius != 0.5)
  ball.scale.set(gameState.ball.radius / 0.5, gameState.ball.radius / 0.5, gameState.ball.radius / 0.5);
  // if (gameState.ball.radius != 0.5)
    // ball.scale.set(2, 2, 2);

  player1Score.value = gameState.score.playerOne;
  player2Score.value = gameState.score.playerTwo;

  // emitParticle(ball.position.x, ball.position.y);
  updateParticles();
};

const initSocket = () => {
  if (!socket.value) {
    console.error('Socket is not defined');
    return;
  }
  console.log('socket initialized for pong game!');

  socket.value.on('gameJoined', (whichPlayer) => {
    if (whichPlayer == 1) {
      player1 = currentUser.value.username;
    } else if (whichPlayer == 2) {
      player2 = currentUser.value.username;
    }
  });

  socket.value.on('update', (gameState) => {
    if (gameStarted.value) {
      updateGameObjects(gameState);
    }
  });

  socket.value.on('gameWon', () => {
    showEnd.value = true;
    endScreenMessage.value = 'You won!';
  });

  socket.value.on('gameLost', () => {
    showEnd.value = true;
    endScreenMessage.value = 'You lost.';
  });

  socket.value.on('playerScored', (username) => {
    if (username == currentUser.value.username) {
      player1Score.value += 1;
    } else {
      player2Score.value += 1;
    }
  });

  socket.value.on('opponentLeft', (username) => {
    console.log(`${username} left, game is now paused`);
    if (player1 == username) {
      player1 = null;
    } else if (player2 == username) {
      player2 = null;
    }
    waitingForOpponent.value = true;
  });

  socket.value.on('opponentJoined', (username) => {
    console.log(`${username} joined, game is now starting`);
    if (!player1) {
      player1 = username;
    } else if (!player2) {
      player2 = username;
    }
    gameStarted.value = true;
    waitingForOpponent.value = false;
    
    nextTick(() => {
      initGame();
    });
  });
};

// const queueForPong = (mode) => {
//   if (socket && !waitingForOpponent.value) {
//     gameMode.value = mode; // Set the game mode
//     socket.value.emit('joinGame', {
//       userId: currentUser.value.id,
//       username: currentUser.value.username,
//       // gameMode: mode // Send the game mode to the server
//     });
//     waitingForOpponent.value = true;
//     endScreenMessage.value = null;
//     showEnd.value = false;
//     console.log(`sent joinGame from socket.value: ${socket.id}, with UID: ${currentUser.id}, name: ${currentUser.username}, mode: ${mode}`);
//   } else {
//     console.log('somehow no socket.value');
//   }
// };

const stopGame = () => {
  waitingForOpponent.value = false;
  if (socket.value) {
    socket.value.emit('leaveGame', {
      userId: currentUser.value.id,
      username: currentUser.value.username,
    });
  }
  if (gameStarted.value) {
    gameStarted.value = false;
    // window.removeEventListener('mousemove', handleMouseMove);
  }
  exitGame();
};

// const handleMouseMove = (event) => {
//   const rect = container.value.getBoundingClientRect();
//   playerPosition.y = (rect.bottom - event.clientY) / (rect.bottom - rect.top) * 30 - 15;
//   if (socket) {
//     socket.value.emit('playerMove', {
//       userId: currentUser.value.id,
//       y: playerPosition.y,
//     });
//   }
// };

let moving = false;

const handlePlayerMove = (event) => {
  if ((event.key === 'w' || event.key === 'ArrowUp') && moving == false) {
    // console.log('moving up');
    moving = true;
    socket.value.emit('playerMoveKBM', { dy: 1 });
  } else if ((event.key === 's' || event.key === 'ArrowDown') && moving == false) {
    // console.log('moving down');
    moving = true;
    socket.value.emit('playerMoveKBM', { dy: -1 });
  }
}
const handleStopPlayerMove = (event) => {
  if ((event.key === 'w' || event.key === 'ArrowUp') && moving == true) {
    // console.log('stopped moving up');
    moving = false;
    socket.value.emit('playerMoveKBM', { dy: 0 });
  } else if ((event.key === 's' || event.key === 'ArrowDown') && moving == true) {
    // console.log('stopped moving down');
    moving = false;
    socket.value.emit('playerMoveKBM', { dy: 0 });
  }
}

const exitGame = () => {
  showEnd.value = false;
  endScreenMessage.value = null;
  gameStarted.value = false;
  waitingForOpponent.value = false;
}

onMounted(() => {
  initSocket();
  // initGame();
});

onBeforeUnmount(() => {
  stopGame();
  if (renderer) {
    renderer.dispose();
  }
  window.removeEventListener('resize', onWindowResize);
  // window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('keydown', handlePlayerMove);
  window.removeEventListener('keyup', handlePlayerMove);
});
</script>

<!-- height: 100vh; -->
<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: #1a1a1a;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  border-radius: 8px;
}

.pong-game {
  display: flex;
  width: 95%;
  height: 90%;
  overflow: hidden;
  border-radius: 6px;
}

/*.pong-game {
  width: 800px;
  height: 600px;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
} */

.waiting-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.6); /* Lighter overlay */
  padding: 20px 40px;
  border-radius: 10px;
  color: white;
  font-size: 24px;
  text-align: center;
  box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000; /* Ensure it stays on top */
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

.queue-container {
  display: flex;
	flex-direction: row;
	align-items: center; /* Center horizontally */
	justify-content: center; /* Center vertically */
	padding-top: 1px; /* Adjust to your preference */
  width: 100%;
}

.queue-button {
	/* padding: 10px; */
  padding: 1vh 2vw;
  height: 3vh;
	width: 15vw;
	margin-bottom: 10px;
	background-color: #e0e0e0;
	/* background-color: #4CAF50; */
	transition: background-color 0.3s;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	font-size: 1vw 1vh;
}

.queue-button:hover {
	background-color: #3a8d3e; /* Brightened on hover */
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

.end-screen {
	display: flex;  /* Hidden by default */
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.7);  /* Semi-transparent black */
	justify-content: center;
	align-items: center;
	z-index: 9999;  /* Ensure it's on top of other elements */
}

.end-screen-message {
	font-size: 4rem;
	color: white;
	font-family: 'Arial', sans-serif;
	text-align: center;
	padding: 20px;
	border-radius: 10px;
	background-color: rgba(0, 0, 0, 0.8);  /* Solid background for the text */
}

/* spinner loading animation */
/* .half-circle-spinner, .half-circle-spinner * {
  box-sizing: border-box;
}

.half-circle-spinner {
  width: 60px;
  height: 60px;
  border-radius: 100%;
  position: relative;
  margin: 20px auto;
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
} */
</style>
