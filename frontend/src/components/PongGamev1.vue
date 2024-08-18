<template>
  <div class="game-container">
    <div class="scoreboard">
      <div class="score">Player 1: {{ player1Score }}</div>
      <div class="score">Player 2: {{ player2Score }}</div>
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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useStore } from 'vuex';
import * as THREE from 'three';

export default {
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

    const initThreeJS = () => {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1e1e1e);

      camera = new THREE.PerspectiveCamera(
        75,
        container.value.clientWidth / container.value.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 20;

      renderer = new THREE.WebGLRenderer();
      renderer.setSize(container.value.clientWidth, container.value.clientHeight);
      container.value.appendChild(renderer.domElement);

      // Initialize paddles, ball, and other game objects here
      // ...

      animate();
    };

    const animate = () => {
      requestAnimationFrame(animate);
      // Game logic and rendering updates
      renderer.render(scene, camera);
    };

    const startGame = () => {
      gameStarted.value = true;
      waitingForOpponent.value = false;
      if (socket) {
        socket.emit('startGame', { userId: currentUser.id });
      }
    };

    const updateScore = (data) => {
      player1Score.value = data.player1Score;
      player2Score.value = data.player2Score;
    };

    onMounted(() => {
      initThreeJS();
      if (socket) {
        socket.on('gameUpdate', (data) => {
          // Update paddle positions, ball position, etc.
          // ...

          // Update score
          updateScore(data);
        });
      }
    });

    onBeforeUnmount(() => {
      if (renderer) {
        renderer.dispose();
      }
      if (socket) {
        socket.off('gameUpdate');
      }
    });

    // Watch for score changes and update the game state
    watch([player1Score, player2Score], ([newPlayer1Score, newPlayer2Score]) => {
      // You can add game logic here, e.g., check for win conditions
      if (newPlayer1Score >= 10 || newPlayer2Score >= 10) {
        gameStarted.value = false;
        // Implement game over logic
      }
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
  background-color: #000;
}

.scoreboard {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 20px;
  font-size: 28px;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
}

.score {
  flex: 1;
  text-align: center;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.pong-game {
  width: 800px;
  height: 600px;
  background-color: #1e1e1e;
}

.waiting-overlay, .start-game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  z-index: 20;
}

.start-game-overlay button {
  padding: 10px 20px;
  font-size: 18px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.start-game-overlay button:hover {
  background-color: #45a049;
}
</style>














---------------



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

    const initThreeJS = () => {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1e1e1e);

      camera = new THREE.PerspectiveCamera(
        75,
        container.value.clientWidth / container.value.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 20;

      renderer = new THREE.WebGLRenderer();
      renderer.setSize(container.value.clientWidth, container.value.clientHeight);
      container.value.appendChild(renderer.domElement);

      // Initialize paddles and ball
      const paddleGeometry = new THREE.BoxGeometry(1, 4, 1);
      const paddleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      paddle1 = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddle2 = new THREE.Mesh(paddleGeometry, paddleMaterial);
      paddle1.position.x = -14;
      paddle2.position.x = 14;
      scene.add(paddle1);
      scene.add(paddle2);

      const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      ball = new THREE.Mesh(ballGeometry, ballMaterial);
      scene.add(ball);

      animate();
    };

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    const startGame = () => {
      gameStarted.value = true;
      waitingForOpponent.value = false;
      if (socket) {
        socket.emit('startGame', { userId: currentUser.id });
      }
    };

    onMounted(() => {
      initThreeJS();
    });

    onBeforeUnmount(() => {
      if (renderer) {
        renderer.dispose();
      }
      if (socket) {
        socket.off('gameUpdate');
      }
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
}

.scoreboard {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 20px;
  font-size: 24px;
  color: white;
}

.score {
  flex: 1;
  text-align: center;
}

.pong-game {
  width: 800px;
  height: 600px;
  background-color: #1e1e1e;
}

.waiting-overlay, .start-game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.start-game-overlay button {
  padding: 10px 20px;
  font-size: 18px;
}
</style>
