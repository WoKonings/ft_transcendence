<template>
  <div class="game-container">
    <div class="scoreboard">
      <div class="score">{{ player1Score }}</div>
      <div class="score">{{ player2Score }}</div>
    </div>
    <div class="pong-game" ref="container"></div>
    <div id="endScreen" class="end-screen">
      <div id="endScreenMessage" class="end-screen-message"></div>
    </div>
    <div v-if="waitingForOpponent" class="waiting-overlay">
      Waiting for opponent...
    </div>
  </div>
</template>

<script>
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  import { useStore } from 'vuex';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
  import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass';

export default {
  setup() {
    const store = useStore();
    const socket = store.state.socket;
    const currentUser = store.state.currentUser;

    const container = ref(null);
    let scene, camera, renderer, composer;
    let player1, player2; //as username
    let paddle1, paddle2, ball;
    let playerPosition = { y: 0 };
    let waitingForOpponent = ref(true);
    const player1Score = ref(0);
    const player2Score = ref(0);

    //particle shit
    let particleGeometry, particleMaterial, particles, particleCount = 100;
    let particlePositions = [];
    let particleLifetimes = [];
    let particleVelocities = [];


    const initParticleSystem = () => {
      // Particle Geometry and Material
      particleGeometry = new THREE.BufferGeometry();
      particleMaterial = new THREE.PointsMaterial({
        color: 0xff00ff, // Bright pink for the trail
        size: 0.3,       // Size of each particle
        transparent: true,
        opacity: 1.0,
      });

      // Create a pool of particles
      particlePositions = new Float32Array(particleCount * 3); // Each particle has 3 coordinates (x, y, z)
      particleLifetimes = new Float32Array(particleCount);     // Lifetimes for each particle
      particleVelocities = new Float32Array(particleCount * 3); // Velocities for each particle

      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      // Initialize particle lifetimes and velocities
      for (let i = 0; i < particleCount; i++) {
        particleLifetimes[i] = 0;
        particleVelocities[i * 3] = (Math.random() - 0.5) * 0.1;     // Random X velocity
        particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1; // Random Y velocity
        particleVelocities[i * 3 + 2] = -0.1;                        // Initial Z velocity
      }
    };

    // Update particles in the animate loop
    const updateParticles = () => {
    // Update particle positions based on lifetimes and velocities
      for (let i = 0; i < particleCount; i++) {
        if (particleLifetimes[i] > 0) {
          particleLifetimes[i] -= 0.02; // Decrease the lifetime
          particlePositions[i * 3] += particleVelocities[i * 3];     // Move in X direction
          particlePositions[i * 3 + 1] += particleVelocities[i * 3 + 1]; // Move in Y direction
          particlePositions[i * 3 + 2] += particleVelocities[i * 3 + 2]; // Move in Z direction

          // Optionally adjust opacity to create a fading effect
          particleMaterial.opacity = Math.max(0, particleLifetimes[i]);
        }
      }
      // Update particle positions
      particles.geometry.attributes.position.needsUpdate = true;
    };

    // Emit particles from the ball's position
    const emitParticle = (x, y) => {
      for (let i = 0; i < particleCount; i++) {
        if (particleLifetimes[i] <= 0) {
          particlePositions[i * 3] = x;
          particlePositions[i * 3 + 1] = y;
          particlePositions[i * 3 + 2] = 0; // Initial z position of the particle
          particleLifetimes[i] = 1.0; // Reset lifetime for the new particle

          // Randomize velocity slightly each time a particle is emitted
          particleVelocities[i * 3] = (Math.random() - 0.5) * 0.2;     // Random X velocity
          particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2; // Random Y velocity
          particleVelocities[i * 3 + 2] = -0.1;                        // Z velocity for trail effect
          break; // Only emit one particle per frame
        }
      }
    };

    const initThreeJS = () => {
      scene = new THREE.Scene();

      // Background color and arena grid
      // const arenaTexture = new THREE.TextureLoader().load('./src/components/assets/neon.jpg'); // Add your texture path
      // const arenaTexture = new THREE.TextureLoader().load('/neon.jpg'); // Add your texture path
      // scene.background = arenaTexture;
      // const arenaMaterial = new THREE.MeshBasicMaterial({ map: arenaTexture });
      // const arenaGeometry = new THREE.PlaneGeometry(40, 30);
      // const arena = new THREE.Mesh(arenaGeometry, arenaMaterial);
      // arena.rotation.x = -Math.PI / 2;
      // arena.position.y = -10;
      // scene.add(arena);

      // Set up camera
      camera = new THREE.PerspectiveCamera(
        75,
        800 / 600,
        0.1,
        1000
      );
      camera.position.z = 20;
      camera.position.y = 0;

      // Set up renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(800, 600);
      container.value.appendChild(renderer.domElement);

      // Post-processing setup for ball trail
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const afterimagePass = new AfterimagePass(0.9); // Adjust this value for trail length
      composer.addPass(afterimagePass);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1).normalize();
      scene.add(directionalLight);

      // Neon blue paddles
      const paddleGeometry = new THREE.BoxGeometry(1, 4, 1);
      const paddleMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff, // Neon blue
        emissive: 0x0077ff, // Glowing effect
        emissiveIntensity: 1,
        shininess: 100
      });

      paddle1 = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddle1.position.x = -14;
      scene.add(paddle1);

      paddle2 = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddle2.position.x = 14;
      scene.add(paddle2);

      // Purple ball with shading
      const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const ballMaterial = new THREE.MeshPhongMaterial({
        color: 0xff00ff, // Pink
        emissive: 0x550055,
        emissiveIntensity: 0.5,
        shininess: 100
      });

      // Ball geometry and material with shading
      // const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      // const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff }); // Bright pink


      ball = new THREE.Mesh(ballGeometry, ballMaterial);
      ball.position.set(0, 0, 0);
      scene.add(ball);

      window.addEventListener('resize', onWindowResize);
      animate();
    };

    const animate = () => {
      requestAnimationFrame(animate);
      composer.render();
    };

    const onWindowResize = () => {
      renderer.setSize(800, 600);
      camera.aspect = 800 / 600;
      camera.updateProjectionMatrix();
    };

    const startGame = () => {
      if (!socket) {
        console.error('Socket is not defined');
        return;
      }

      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

    //   socket.emit('joinGame', {
    //     userId: currentUser.id,
    //     username: currentUser.username,
    //   });

      socket.on('gameJoined', (whichPlayer) => {
        if (whichPlayer == 1) {
          player1 = currentUser.username;
        } else if (whichPlayer == 2) {
          player2 = currentUser.username;
        }
      });

      socket.on('update', (gameState) => {
          updateGameObjects(gameState);
      });

      socket.on('gameWon', () => {
        showEndScreen('You won!');
      });

      socket.on('gameLost', () => {
        showEndScreen('You lost!');
      });

      socket.on('playerScored', (username) => {
        if (username == currentUser.username) {
          player1Score.value += 1;
        } else {
          player2Score.value += 1;
        }
      });

      socket.on('opponentLeft', (username) => {
        console.log(`${username} left, game is now paused`);
        if (player1 == username) {
          player1 = null;
        } else if (player2 == username) {
          player2 = null;
        }
        waitingForOpponent.value = true;
      });

      socket.on('opponentJoined', (username) => {
        console.log(`${username} joined, game is now starting`);
        if (!player1) {
          player1 = username;
        } else if (!player2) {
          player2 = username;
        }
        waitingForOpponent.value = false;
      });

      window.addEventListener('mousemove', handleMouseMove);
    };

    const stopGame = () => {
      if (socket) {
        socket.emit('leaveGame', {
          userId: currentUser.id,
          username: currentUser.username,
        });
        window.removeEventListener('mousemove', handleMouseMove);
      }
    };

    const handleMouseMove = (event) => {
      const rect = container.value.getBoundingClientRect();
      playerPosition.y = (rect.bottom - event.clientY) / (rect.bottom - rect.top) * 30 - 15;
      console.log('moving!');
      if (socket) {
        socket.emit('playerMove', {
          userId: currentUser.id,
          y: playerPosition.y,
        });
      }
    };

    const showEndScreen = (message) => {
      const endScreen = document.getElementById('endScreen');
      const endScreenMessage = document.getElementById('endScreenMessage');
      endScreenMessage.textContent = message;
      endScreen.style.display = 'flex';  // Make it visible
    }

    // const hideEndScreen = () => {
    //   const endScreen = document.getElementById('endScreen');
    //   endScreen.style.display = 'none';  // Hide it
    // }

    const updateGameObjects = (gameState) => {
      if (!gameState || !gameState.paddle1 || !gameState.paddle2 || !gameState.ball) {
        return;
      }
      paddle1.position.y = gameState.paddle1.y;
      paddle1.position.x = gameState.paddle1.x;
      paddle2.position.y = gameState.paddle2.y;
      paddle2.position.x = gameState.paddle2.x;
      // console.log(`pad1: ${paddle1.position.y}, ${paddle2.position.x}`);
      // console.log(`pad2: ${paddle2.position.y}, ${paddle2.position.x}`);
      ball.position.x = gameState.ball.x;
      ball.position.y = gameState.ball.y;
      player1Score.value = gameState.score.playerOne;
      player2Score.value = gameState.score.playerTwo;
      // console.log (`score: p1 ${player1Score.value} p2: ${player2Score.value}`);
      emitParticle(ball.position.x, ball.position.y);
      updateParticles();
    };

    onMounted(() => {
      initThreeJS();
      initParticleSystem();
      startGame();
    });

    onBeforeUnmount(() => {
      stopGame();
      if (renderer) {
        renderer.dispose();
      }
      window.removeEventListener('resize', onWindowResize);
    });

    return {
      container,
      waitingForOpponent,
      player1,
      player2,
      player1Score,
      player2Score,
    };
  },
};
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
}

.pong-game {
  width: 800px;
  height: 600px;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  border: 2px solid #00ffff; /* Neon blue border */
}

.waiting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
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
	display: none;  /* Hidden by default */
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

</style>
