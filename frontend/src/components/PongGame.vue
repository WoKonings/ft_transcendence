<template>
  <div class="pong-game" ref="container"></div>
  <div v-if="waitingForOpponent" class="waiting-overlay">
    Waiting for opponent...
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
    let paddle1, paddle2, ball;
    let playerPosition = { y: 0 };
    let waitingForOpponent = ref(true);

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

      socket.emit('joinGame', {
        userId: currentUser.id,
        username: currentUser.username,
      });

      socket.on('update', (gameState) => {
          updateGameObjects(gameState);
      });

      socket.on('opponentLeft', (username) => {
        console.log(`${username} left, game is now paused`);
        waitingForOpponent.value = true;
      });
      socket.on('opponentJoined', (username) => {
        console.log(`${username} joined, game is now starting`);
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

      if (socket) {
        socket.emit('playerMove', {
          userId: currentUser.id,
          y: playerPosition.y,
        });
      }
    };

    const updateGameObjects = (gameState) => {
      if (!gameState || !gameState.paddles || !gameState.ball) {
        return;
      }

      for (const playerId in gameState.paddles) {
        const paddle = gameState.paddles[playerId];
        if (playerId == currentUser.id) {
          paddle1.position.y = paddle.y;
          paddle1.position.x = paddle.x;
        } else {
          paddle2.position.y = paddle.y;
          paddle2.position.x = paddle.x;
        }

        ball.position.x = gameState.ball.x;
        ball.position.y = gameState.ball.y;
      }
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
    };
  },
};
</script>

<style scoped>
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
</style>

<!-- claude 3d version??? -->
<!-- <template> -->
  <!-- <div class="pong-game" ref="container"></div>
  <div v-if="waitingForOpponent" class="waiting-overlay">
    Waiting for opponent...
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export default {
  setup() {
    const store = useStore();
    const socket = store.state.socket;
    const currentUser = store.state.currentUser;

    const container = ref(null);
    let scene, camera, renderer;
    let paddle1, paddle2, ball;
    let playerPosition = { y: 0 };
    let waitingForOpponent = ref(true);
    let composer;
    let particleSystem;

    const initThreeJS = () => {
      scene = new THREE.Scene();

      // Background color
      scene.background = new THREE.Color(0x1e1e1e);

      // Set up camera
      camera = new THREE.PerspectiveCamera(
        75,
        800 / 600, // Fixed aspect ratio
        0.1,
        1000
      );
      camera.position.z = 20;

      // Set up renderer with fixed size
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(800, 600);
      container.value.appendChild(renderer.domElement);

      // Lighting for shading
      const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1).normalize();
      scene.add(directionalLight);


      // Skybox
			const loader = new THREE.CubeTextureLoader();
      const texture = loader.load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
      ]);
      scene.background = texture;


      // Arena
      const arenaGeometry = new THREE.BoxGeometry(30, 20, 1);
      const arenaMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        opacity: 0.2,
        transparent: true,
        side: THREE.DoubleSide
      });
      const arena = new THREE.Mesh(arenaGeometry, arenaMaterial);
      arena.position.z = -0.5;
      scene.add(arena);


      // Enhanced paddle material
      const paddleMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5,
      });
    //   // Paddle geometry and material
      const paddleGeometry = new THREE.BoxGeometry(1, 4, 1);
    //   const paddleMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

      paddle1 = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddle1.position.x = -14; // Adjusted x position for centering
      paddle1.position.y = 0; // Initialize paddle1's Y position
      scene.add(paddle1);

      paddle2 = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddle2.position.x = 14; // Adjusted x position for centering
      paddle2.position.y = 0; // Initialize paddle2's Y position
      scene.add(paddle2);


      // Enhanced ball material
      const ballMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
      });
    //   // Ball geometry and material with shading
      const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    //   const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });

      ball = new THREE.Mesh(ballGeometry, ballMaterial);
      ball.position.set(0, 0, 0); // Initialize ball's position at the center
      scene.add(ball);

      // Particle system for ball trail
      const particlesGeometry = new THREE.BufferGeometry();
      const particlesCnt = 5000;
      const posArray = new Float32Array(particlesCnt * 3);
      for(let i = 0; i < particlesCnt * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 5;
      }
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particlesMaterial = new THREE.PointsMaterial({
        size: 0.005,
        color: 0xffffff,
      });
      particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particleSystem);

      // Post-processing
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
      );
      composer.addPass(bloomPass);

      window.addEventListener('resize', onWindowResize);
      animate();
    };

    const animate = () => {
      requestAnimationFrame(animate);

            
      // Update particle system
      const positions = particleSystem.geometry.attributes.position.array;
      for(let i = 0; i < positions.length; i += 3) {
        positions[i] += (Math.random() - 0.5) * 0.01;
        positions[i+1] += (Math.random() - 0.5) * 0.01;
        positions[i+2] += (Math.random() - 0.5) * 0.01;
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      composer.render();

      renderer.render(scene, camera);
    };

    const onWindowResize = () => {
      camera.aspect = 800 / 600;
      camera.updateProjectionMatrix();
      renderer.setSize(800, 600);
    };

    const startGame = () => {
      if (!socket) {
        console.error('Socket is not defined');
        return;
      }

      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      socket.emit('joinGame', {
        userId: currentUser.id,
        username: currentUser.username,
      });

      socket.on('update', (gameState) => {
          updateGameObjects(gameState);
      });

      socket.on('opponentLeft', (username) => {
        console.log(`${username} left, game is now paused`);
        waitingForOpponent.value = true;
      });
      socket.on('opponentJoined', (username) => {
        console.log(`${username} joined, game is now starting`);
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

      if (socket) {
        socket.emit('playerMove', {
          userId: currentUser.id,
          y: playerPosition.y,
        });
      }
    };

    const updateGameObjects = (gameState) => {
      if (!gameState || !gameState.paddles || !gameState.ball) {
        return;
      }
      // console.log(`wat: ${currentUser.id}`); 
      // console.log(`wat2: ${currentUser.id}`); 
      // for (const [userId, paddle] of Object.entries(gameState.paddles)) {
      //   const paddle = gameState.paddles[playerId];
      //   if (userId == currentUser.id) {
      //     paddle1.position.y = paddle[userId].y;
      //     console.log(`p1 y: ${paddle1.position.y} && id: ${userId} realid: ${currentUser.id}`);          
      //   } else {
      //     paddle2.position.y = paddle[userId].y;
      //     console.log(`p2 y: ${paddle1.position.y} && id: ${userId}`);          
      //   }
      // }

      for (const playerId in gameState.paddles) {
        const paddle = gameState.paddles[playerId];
        if (playerId == currentUser.id)
        {
          paddle1.position.y = paddle.y;
          paddle1.position.x = paddle.x;
        }
        else
        {
          paddle2.position.y = paddle.y;
          paddle2.position.x = paddle.x;
        }
        // this.context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        ball.position.x = gameState.ball.x;
        ball.position.y = gameState.ball.y;
      // console.log(`ball x: ${ball.position.x}`);
      }
    };
      // console.log(`ball y: ${ball.position.y}`);
    onMounted(() => {
      initThreeJS();
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
    };
  },
};
</script>

<style scoped>
.pong-game {
  width: 800px;
  height: 600px;
  overflow: hidden;
  position: relative;
  margin: 0 auto; /* Center the game on the page */
  border: 2px solid #ffffff; /* Add a border around the game window */
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
</style>
 -->


<!-- <template>
  <div class="pong-game">
    <canvas ref="gameCanvas" width="800" height="600"></canvas>
    <div v-if="waitingForOpponent" class="waiting-overlay">
      Waiting for opponent...
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  data() {
    return {
      context: null,
      playerPosition: { y: 0 },
      waitingForOpponent: true,  // Add this property to manage the UI state
    };
  },
  computed: {
    ...mapState(['currentUser', 'socket']),  // Access the socket from the store
  },
  mounted() {
    console.log(`PongGame component mounted ${this.currentUser.id}`);
    const canvas = this.$refs.gameCanvas;
    this.context = canvas.getContext('2d');
    this.startGame();
  },
  beforeUnmount() {
    console.log('PongGame component beforeDestroy');
    this.stopGame();
  },
  methods: {
    startGame() {
      if (!this.socket) return;  // Ensure the socket is available

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server');
      }); //extraneous?



      this.socket.emit('joinGame', {
        userId: this.currentUser.id,
        username: this.currentUser.username,
      });
      this.socket.on('update', (gameState) => {
        this.updateGame(gameState);
      });
      this.socket.on('opponentLeft', (username) => {
        console.log(`${username} left, game is now paused`);
        this.waitingForOpponent = true;  // Show the "Waiting for opponent..." message
      });
      this.socket.on('opponentJoined', (username) => {
        console.log(`${username} joined, game is now starting`);
        this.waitingForOpponent = false;  // Hide the "Waiting for opponent..." message
      });
      this.$refs.gameCanvas.addEventListener('mousemove', this.handleMouseMove);
    },
    stopGame() {
      this.socket.emit('leaveGame', {
        userId: this.currentUser.id,
        username: this.currentUser.username,
      });
      if (this.socket) {
        this.$refs.gameCanvas.removeEventListener('mousemove', this.handleMouseMove);
      }
    },
    handleMouseMove(event) {
      const rect = this.$refs.gameCanvas.getBoundingClientRect();
      this.playerPosition.y = event.clientY - rect.top;
      if (this.socket) {
        this.socket.emit('playerMove', { 
          userId: this.currentUser.id,
          y: this.playerPosition.y,
        });
      }
    },
    updateGame(gameState) {
      if (!this.context) {
        this.context = this.$refs.gameCanvas.getContext('2d');
      }

      // Clear the canvas
      this.context.clearRect(0, 0, 800, 600);

      // Draw ball
      this.context.beginPath();
      this.context.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
      this.context.fillStyle = '#0095DD';
      this.context.fill();
      this.context.closePath();

      // Draw paddles
      for (const playerId in gameState.paddles) {
        const paddle = gameState.paddles[playerId];
        this.context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
      }
    },
  },
};
</script>

<style scoped>
.pong-game {
  position: relative;
  width: 800px;
  height: 600px;
  margin: 0 auto;
  border: 1px solid #000;
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
</style>


experimental 3d render, uninstall three if not using -->
