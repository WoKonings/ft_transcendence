<template>
	<div class="pong-game">
	<canvas ref="gameCanvas" width="800" height="600"></canvas>
	</div>
</template>

<script>
import io from 'socket.io-client';
import { mapState } from 'vuex';

export default {
	data() {
	return {
		socket: null,
		context: null,
		playerPosition: { y: 0 },
	};
	},
	computed: {
		...mapState(['currentUser']),
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
		if (this.socket) return; // Prevent duplicate connections

		this.socket = io('http://localhost:3000', {
			query: { userId: this.currentUser.id },
		});
		console.log('Starting game and connecting socket with userId:', this.currentUser.id);

		this.socket.on('connect', () => {
			console.log('Connected to WebSocket server');
		});

		this.socket.on('update', (gameState) => {
			this.updateGame(gameState);
		});

		this.$refs.gameCanvas.addEventListener('mousemove', this.handleMouseMove);
	},
	stopGame() {
		if (this.socket) {
			console.log('Stopping game and disconnecting socket');
			this.socket.disconnect();
			this.socket = null;
		}
		if (this.$refs.gameCanvas) {
			this.$refs.gameCanvas.removeEventListener('mousemove', this.handleMouseMove);
		}
	},
	handleMouseMove(event) {
		const rect = this.$refs.gameCanvas.getBoundingClientRect();
		this.playerPosition.y = event.clientY - rect.top;
		if (this.socket) {
			this.socket.emit('playerMove', { y: this.playerPosition.y });
		}
	},
	updateGame(gameState) {
		// Ensure context is initialized
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

		// Add more drawing logic for scores, etc.
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
</style>
