<template>
  <div class="login-container">
    <div class="pong-title">
      <img src="/ponglogo.png" alt="PONG" />
    </div>    
    <form class="login-form" @submit.prevent="loginUser">
      <!-- Removed username and password fields -->
      <button type="submit" class="fancy-login-button">
        <img src="/42logo-trans.png" alt="Login Icon" />
        <span>Login</span>
      </button>
    </form>
    <div class="pong-animation">
      <div class="pong-ball"></div>
      <div class="pong-paddle pong-paddle-left"></div>
      <div class="pong-paddle pong-paddle-right"></div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    loginUser() {
      console.log('Login clicked');
    }
  }
};
</script>

<style scoped>
/* Fixing Scroll and Background Issue */
body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden; /* Disable scrolling */
}

.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: black;
  position: relative;
}


/* Updated Button Styling */
.fancy-login-button {
  display: flex;
  align-items: center;
  padding: 15px 30px;
  background-color: #fff;
  color: black;
  font-family: 'Micro5', monospace;
  font-size: 16px;
  border: 2px solid white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.fancy-login-button img {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.fancy-login-button:hover {
  background-color: black;
  color: white;
  border-color: white;
}

.fancy-login-button:hover img {
  filter: invert(1); /* Invert icon colors on hover */
}

/* Pong Animation */
.pong-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  background-color: transparent;
  z-index: -1;
}

.pong-ball, .pong-paddle {
  background-color: #ffffff; /* White visibility */
}

.pong-ball {
  width: 20px;
  height: 20px;
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  animation: pongBallMove 2s infinite linear;
}

.pong-paddle {
  width: 10px;
  height: 100px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.pong-paddle-left {
  left: 30px;
  animation: pongPaddleMove 3s infinite ease-in-out;
}

.pong-paddle-right {
  right: 30px;
  animation: pongPaddleMove 3s infinite ease-in-out reverse;
}

@keyframes pongBallMove {
  0% {
    top: 50%;
    left: 50%;
  }
  25% {
    top: 10%;
    left: 90%;
  }
  50% {
    top: 90%;
    left: 90%;
  }
  75% {
    top: 10%;
    left: 10%;
  }
  100% {
    top: 50%;
    left: 50%;
  }
}

@keyframes pongPaddleMove {
  0%, 100% {
    top: 20%;
  }
  50% {
    top: 80%;
  }
}
</style>
