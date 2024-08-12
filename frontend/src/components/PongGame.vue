<template>
  <div class="pong-game">
    <canvas ref="gameCanvas" width="800" height="600"></canvas>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  data() {
    return {
      context: null,
      playerPosition: { y: 0 },
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
      });

      this.socket.on('update', (gameState) => {
        this.updateGame(gameState);
      });
      this.$refs.gameCanvas.addEventListener('mousemove', this.handleMouseMove);
    },
    stopGame() {
      if (this.socket) {
        this.$refs.gameCanvas.removeEventListener('mousemove', this.handleMouseMove);
      }
    },
    handleMouseMove(event) {
	console.log(this.currentUser.id)
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
</style>
