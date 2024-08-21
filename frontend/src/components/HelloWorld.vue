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

    <div class="main-container">
      <div class="chat-box-container">
        <ChatBox v-if="isLoggedIn && currentUser" />
        </div>
        <div class="pong-game-container">
          <PongGame v-if="isLoggedIn && showGame" />
        </div>
        <div class="sidebar">
          <div class="friends-list-container">
            <FriendsList v-if="isLoggedIn && currentUser" />
          </div>
          <div class="user-list-container">
            <UserList v-if="isLoggedIn && currentUser" />
          </div>
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
import UserList from './UserList.vue';
import FriendsList from './FriendsList.vue'

export default {
  name: 'HelloWorld',
  components: {
  PongGame,
  ChatBox,
  UserList,
  FriendsList,
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
.main-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

.chat-box-container {
  flex: 1;
  margin-right: 20px; /* Space between chat and game */
  max-width: 300px;
  height: 100%;
}

.pong-game-container {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sidebar {
  display: flex;
  margin-left: 20px;
  flex-direction: column;
  justify-content: space-between;
  max-width: 300px;
}

.friends-list-container {
  margin-bottom: 20px; /* Space between friends list and user list */
}

.user-list-container {
  max-width: 100%;
}

</style>

<!-- .user-list-container {
  flex: 1;
  margin-left: 20px; /* Space between game and user list */
  margin-bottom: 20px;
  max-width: 300px;
  height: 100%;
} -->

/* CHAT GPT PLEASE CHANGE THIS CONTAINER! */
<!-- .friends-list-container {
  flex: 1;
  margin-left: 20px; /* Space between game and user list */
  max-width: 300px;
  height: 100%;
} -->