<template>
    <div>
    <h1>{{ message }}</h1>
    <form v-if="!isLoggedIn" @submit.prevent="createUser">
        <h2>Create Account</h2>
        <input v-model="newUser.username" placeholder="Username" required />
        <input v-model="newUser.email" placeholder="Email" required />
        <input v-model="newUser.password" type="password" placeholder="Password" required />
        <button type="submit">Create User</button>
    </form>

    <form v-if="!isLoggedIn" @submit.prevent="loginUser">
        <h2>Login</h2>
        <input v-model="loginDetails.username" type="username" placeholder="username" required />
        <input v-model="loginDetails.password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
    </form>

    <div v-if="isLoggedIn && currentUser">
        <h2>Welcome, {{ currentUser.username }}</h2>
        <button @click="logoutUser">Logout</button>
        <button @click="deleteAccount">Delete Account</button>
        <button @click="toggleGame">
        {{ showGame ? 'Stop playing Pong' : 'Play Pong' }}
        </button>
    </div>

    <div class="game-and-chat">
    <div class="chat-box-container">
        <ChatBox v-if="isLoggedIn && currentUser" />
    </div>
    <div class="pong-game-container">
        <PongGame v-if="isLoggedIn && showGame" />
    </div>
    </div>
    </div>

    <p v-if="error" style="color: red">{{ error }}</p>

</template>

<script>
import { mapState, mapActions } from 'vuex';
import PongGame from './PongGame.vue';
import ChatBox from './Chat-Box.vue';
import io from 'socket.io-client'

export default {
  name: 'HelloWorld',
  components: {
  PongGame,
  ChatBox
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
      socket: null
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
  }
  }
};

</script>

<style scoped>

.game-and-chat {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
}

.chat-box-container {
    margin-right: 20px;
}

.pong-game-container {
    flex: 1;
}
/* .game-and-chat {
display: flex;
flex-direction: column;
align-items: center;
} */

/* .game-and-chat > * {
margin-bottom: 20px;
} */
</style>