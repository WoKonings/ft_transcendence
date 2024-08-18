<template>
  <div class="game-container">
    <div class="scoreboard">
      <div class="score">{{ player1Score }}</div>
      <div class="score">{{ player2Score }}</div>
    </div>
    <div class="pong-game" ref="container"></div>
    <div v-if="waitingForOpponent" class="waiting-overlay">
      Waiting for opponent...
    </div>
    <div v-if="!gameStarted" class="start-game-overlay">
      <button @click="startGame">Start Game</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import * as THREE from 'three';

export default {
  name: 'PongGame',
  setup() {
    const store = useStore();
    const socket = store.state.socket;
    const currentUser = store.state.currentUser;

    const container = ref(null);
    let scene, camera, renderer;
    let paddle1, paddle2, ball;
    const waitingForOpponent = ref(true);
    const gameStarted = ref(false);
    const player1Score = ref(0);
    const player2Score = ref(0);
    let playerPosition = { y: 0 };

    const initThreeJS = () => {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      camera = new THREE.PerspectiveCamera(
        75,
        container.value.clientWidth / container.value.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 30;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.value.clientWidth, container.value.clientHeight);
      container.value.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
      directionalLight.position.set(1, 1, 1).normalize();
      scene.add(directionalLight);

      // Paddles
      const paddleGeometry = new THREE.BoxGeometry(1, 4, 1);
      const paddleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

      paddle1 = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddle1.position.x = -14;
      paddle1.position.y = 0;
      scene.add(paddle1);

      paddle2 = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddle2.position.x = 14;
      paddle2.position.y = 0;
      scene.add(paddle2);

      // Ball
      const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

      ball = new THREE.Mesh(ballGeometry, ballMaterial);
      ball.position.set(0, 0, 0);
      scene.add(ball);

      window.addEventListener('resize', onWindowResize);
      animate();
    };

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    const onWindowResize = () => {
      camera.aspect = container.value.clientWidth / container.value.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.value.clientWidth, container.value.clientHeight);
    };

    const startGame = () => {
      gameStarted.value = true;
      waitingForOpponent.value = false;

      if (socket) {
        socket.emit('joinGame', {
          userId: currentUser.id,
          username: currentUser.username,
        });

        socket.on('update', updateGameObjects);
        socket.on('opponentLeft', handleOpponentLeft);
        socket.on('opponentJoined', handleOpponentJoined);
      }

      window.addEventListener('mousemove', handleMouseMove);
    };

    const stopGame = () => {
      if (socket) {
        socket.emit('leaveGame', {
          userId: currentUser.id,
          username: currentUser.username,
        });
        socket.off('update');
        socket.off('opponentLeft');
        socket.off('opponentJoined');
      }
      window.removeEventListener('mousemove', handleMouseMove);
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
      if (!gameState || !gameState.paddles || !gameState.ball) return;

      for (const playerId in gameState.paddles) {
        const paddle = gameState.paddles[playerId];
        if (playerId == currentUser.id) {
          paddle1.position.y = paddle.y;
          paddle1.position.x = paddle.x;
        } else {
          paddle2.position.y = paddle.y;
          paddle2.position.x = paddle.x;
        }
      }

      ball.position.x = gameState.ball.x;
      ball.position.y = gameState.ball.y;

      // Update scores if they're part of the game state
      if (gameState.scores) {
        player1Score.value = gameState.scores.player1;
        player2Score.value = gameState.scores.player2;
      }
    };

    const handleOpponentLeft = (username) => {
      console.log(`${username} left, game is now paused`);
      waitingForOpponent.value = true;
    };

    const handleOpponentJoined = (username) => {
      console.log(`${username} joined, game is now starting`);
      waitingForOpponent.value = false;
    };

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
      player1Score,
      player2Score,
      waitingForOpponent,
      gameStarted,
      startGame,
      container
    };
  }
};
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  position: relative;
  background-color: #1a1a1a;
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

.pong-game {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
}

.waiting-overlay, .start-game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 24px;
}

.start-game-overlay button {
  background-color: #ffffff;
  color: #000000;
  border: none;
  cursor: pointer;
  padding: 10px 20px;
  font-size: 18px;
}

.start-game-overlay button:hover {
  background-color: #cccccc;
}
</style>