<template>
  <div class="container">
    <h1>{{ message }}</h1>
    
    <!-- Authentication forms -->
    <div v-if="!isLoggedIn" class="auth-forms">
      <form @submit.prevent="createUser" class="form">
        <h2>Create Account</h2>
        <input v-model="newUser.username" placeholder="Username" required />
        <input v-model="newUser.email" placeholder="Email" required />
        <input v-model="newUser.password" type="password" placeholder="Password" required />
        <button type="submit">Create User</button>
      </form>

      <form @submit.prevent="loginUser" class="form">
        <h2>Login</h2>
        <input v-model="loginDetails.username" placeholder="Username" required />
        <input v-model="loginDetails.password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    </div>

    <!-- Logged in user content -->
    <div v-if="isLoggedIn && currentUser" class="user-content">
      <h2>Welcome, {{ currentUser.username }}</h2>
      <div class="button-group">
        <button @click="logoutUser">Logout</button>
        <button @click="deleteAccount">Delete Account</button>
        <button @click="toggleGame">
          {{ showGame ? 'Stop playing Pong' : 'Play Pong' }}
        </button>
      </div>

      <!-- New components -->
      <div class="user-components">
      </div>
    </div>

    <div>
      <p>Is Logged In: {{ isLoggedIn }}</p> <!-- Debugging line -->
      <GameLayout v-if="isLoggedIn" />
    </div>

    <!-- Game and chat -->
    <div class="game-and-chat">
      <div class="pong-game-container">
        <div v-if="isLoggedIn && showGame && socket">
          <button v-if="bothPlayersConnected && !gameStarted" @click="startGame" class="start-button">
            Start Game
          </button>
          <PongGame :gameStarted="gameStarted" @players-connected="onPlayersConnected" />
        </div>
      </div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import PongGame from './PongGame.vue';
// import ChatBox from './ChatBox.vue';
// import FriendsList from './FriendsList.vue';
// import ChatTabs from './ChatTabs.vue';
// import StatHistory from './StatHistory.vue';
// import UserSettings from './UserSettings.vue';
import io from 'socket.io-client';
import GameLayout from './GameLayout.vue';

export default {
  name: 'HelloWorld',
  components: {
    GameLayout,
    PongGame,
    // ChatBox,
    // FriendsList,
    // ChatTabs,
    // StatHistory,
    // UserSettings
  },
  data() {
    return {
      message: 'User Authentication',
      newUser: {
      username: '',
      email: '',
      password: ''
      },
      loginDetails: {
      username: '',
      password: ''
      },
      error: '',
      showGame: false,
      socket: null,
      bothPlayersConnected: false,
      gameStarted: false,
    };
  },
  computed: {
  ...mapState(['isLoggedIn', 'currentUser'])
  },
  methods: {
  ...mapActions(['logIn', 'logOut']),
  createUser() {
    this.error = '';
    fetch('http://localhost:3000/user', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(this.newUser)
    })
    .then(response => {
        if (!response.ok) {
        return response.json().then(err => {
            throw new Error(err.error);
        });
        }
        return response.json();
    })
    .then(data => {
        this.logIn(data);
    })
    .catch(error => {
        console.error('Error creating user:', error);
        this.error = error.message;
    });
  },
  loginUser() {
    this.error = '';
    fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(this.loginDetails)
    })
    .then(response => {
      if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.error);
      });
      }
      return response.json();
    })
    .then(data => {
      localStorage.setItem('access_token', data.access_token);
      console.log(`Received access token: ${data.access_token}`)
      this.logIn(data.user);
      // console.log(`reference user: ${data.user.id}, ${data.user.username}`);
      // console.log(`Logged in as user: ${this.currentUser.id}, ${this.currentUser.username}`);
      this.initializeSocket();
    })
    .catch(error => {
      console.error('Error logging in:', error);
      this.error = error.message;
    });
  },
  logoutUser() {
    localStorage.setItem('access_token', null); //maybe not needed
    this.logOut();
  },
  deleteAccount() {
    this.error = '';
    fetch(`http://localhost:3000/user/${this.currentUser.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json'
    }
    })
    .then(response => {
      if (!response.ok) {
      return response.json().then(err => {
          throw new Error(err.error);
      });
      }
      this.logoutUser();
    })
    .catch(error => {
        console.error('Error deleting account:', error);
        this.error = error.message;
    });
  },
  initializeSocket() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    this.socket = io('http://localhost:3000', {
        auth: { token },
        // query: { token },
    });

    this.socket.on('connected', (message) => {
        console.log(message);
    });

    this.$store.commit('SET_SOCKET', this.socket); // Store the socket in Vuex
  },
  toggleGame() {
      this.showGame = !this.showGame;
  },
  onPlayersConnected() {
      this.bothPlayersConnected = true;
    },
  startGame() {
      this.gameStarted = true;
      this.socket.emit('start-game');
    },
  },
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: auto auto;
  padding: 20px;
  text-align: center;
}

h1 {
  margin-bottom: 30px;
}

.auth-forms {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
}

.form {
  width: 45%;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-right: 15px;
  margin-left: 15px;
}

.form h2 {
  margin-bottom: 15px;
}

input {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #45a049;
}

.user-content {
  margin-bottom: 30px;
}

.button-group {
  margin-bottom: 20px;
}

.button-group button {
  margin: 0 5px;
}

.user-components {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.game-and-chat {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 20px;
}

.chatbox-container {
  width: 30%;
}

.pong-game-container {
  width: 65%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.start-button {
  margin-bottom: 10px;
  font-size: 1.2em;
  padding: 10px 20px;
}

.error {
  color: red;
  margin-top: 20px;
}
</style>