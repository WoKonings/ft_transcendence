<template>
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


<!-- experimental 3d render, uninstall three if not using -->

<!-- <template>
	<div ref="container" class="pong-game"></div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from "vue";
import * as THREE from "three";
import { mapState } from 'vuex';

export default {
	computed: {
		...mapState(['currentUser', 'socket']),  // Access the socket from the store
	},
	setup(props) {
		const container = ref(null);
		let scene, camera, renderer;
		let paddle1, paddle2, ball;
		let playerPosition = { y: 0 };

		onMounted(() => {
			// Scene
			scene = new THREE.Scene();
			scene.background = new THREE.Color(0x000000);

			// Camera
			camera = new THREE.PerspectiveCamera(
				75,
				window.innerWidth / window.innerHeight,
				0.1,
				1000
			);
			camera.position.z = 20;

			// Renderer
			renderer = new THREE.WebGLRenderer();
			renderer.setSize(window.innerWidth, window.innerHeight);
			container.value.appendChild(renderer.domElement);

			// Paddle Geometry (Player 1 and Player 2)
			const paddleGeometry = new THREE.BoxGeometry(1, 4, 1);
			const paddleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

			// Paddle 1
			paddle1 = new THREE.Mesh(paddleGeometry, paddleMaterial);
			paddle1.position.x = -10;
			scene.add(paddle1);

			// Paddle 2
			paddle2 = new THREE.Mesh(paddleGeometry, paddleMaterial);
			paddle2.position.x = 10;
			scene.add(paddle2);

			// Ball Geometry
			const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
			const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

			// Ball
			ball = new THREE.Mesh(ballGeometry, ballMaterial);
			ball.position.set(0, 0, 0);
			scene.add(ball);

			// Socket events
			setupSocketListeners();

			// Mouse movement for paddle control
			window.addEventListener('mousemove', handleMouseMove);

			// Animation loop
			const animate = () => {
				renderer.render(scene, camera);
				requestAnimationFrame(animate);
			};
			animate();

			// Handle window resize
			window.addEventListener("resize", onWindowResize, false);
		});

		const onWindowResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		const setupSocketListeners = () => {
			if (props.socket) {
				props.socket.on('update', (gameState) => {
					updateGameObjects(gameState);
				});
			}
		};

		const handleMouseMove = (event) => {
			const rect = container.value.getBoundingClientRect();
			playerPosition.y = event.clientY - rect.top;

			if (props.socket) {
				props.socket.emit('playerMove', {
					userId: props.currentUser.id,
					y: playerPosition.y,
				});
			}
		};

		const updateGameObjects = (gameState) => {
			// Update paddle positions
			for (const playerId in gameState.paddles) {
				const paddle = gameState.paddles[playerId];
				if (props.currentUser.id === playerId) {
					paddle1.position.y = paddle.y / 20 - 15;  // Adjust according to your scale
				} else {
					paddle2.position.y = paddle.y / 20 - 15;  // Adjust according to your scale
				}
			}

			// Update ball position
			ball.position.x = gameState.ball.x / 20 - 10;  // Adjust according to your scale
			ball.position.y = gameState.ball.y / 20 - 15;  // Adjust according to your scale
		};

		onBeforeUnmount(() => {
			// Clean up
			window.removeEventListener("resize", onWindowResize, false);
			window.removeEventListener('mousemove', handleMouseMove);
			renderer.dispose();
		});

		return {
			container,
		};
	},
};
</script>

<style scoped>
.pong-game {
	width: 100%;
	height: 100%;
	overflow: hidden;
}
</style> -->
