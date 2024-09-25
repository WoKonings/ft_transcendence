<template>
  <div>
    <div v-if="!isCompleteProfileNeeded"> 
      <!-- <h1>{{ message }}</h1> -->
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
  
      <button @click="login42" v-if="!isLoggedIn">Login with 42</button>
    </div>

    <CompleteUser v-if="isCompleteProfileNeeded && !isLoggedIn" @completeProfile="handleCompleteProfile" />

    <div v-if="isLoggedIn && currentUser">
      <h2>Welcome, {{ currentUser.username }}</h2>
      <button @click="logoutUser">Logout</button>
      <button @click="deleteAccount">Delete Account</button>
    </div>

    <div class="main-container">
      <div class="chat-box-container">
        <ChatBox v-if="isLoggedIn && currentUser" />
        </div>
        <div class="pong-game-container">
          <PongGame v-if="isLoggedIn && currentUser" />
        </div>
        <div class="sidebar">
          <!-- <div class=""></div> -->
          <UserProfile v-if="isLoggedIn && currentUser" />
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

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { io } from 'socket.io-client';
import PongGame from './PongGame.vue';
import ChatBox from './Chat-Box.vue';
import UserList from './UserList.vue';
import FriendsList from './FriendsList.vue';
import CompleteUser from './CompleteUser.vue';
import UserProfile from './UserProfileButton.vue';
import router from '@/router/router';

const store = useStore();

// const message = ref('User Authentication');
const newUser = ref({
  username: '',
  email: '',
  password: ''
});
const loginDetails = ref({
  username: '',
  password: ''
});
const error = ref('');
const socket = ref(null);

const isLoggedIn = computed(() => store.state.isLoggedIn);
const isCompleteProfileNeeded = ref(false);
const currentUser = computed(() => store.state.currentUser);
// const showGame = computed(() => store.state.showGame);

const createUser = async () => {
  error.value = '';
  try {
    const response = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newUser.value)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    console.log(`Received access token: ${data.access_token}`);
    store.dispatch('logIn', data.user);
    initializeSocket();
  } catch (error) {
    console.error('Error creating user:', error);
    error.value = error.message;
  }
};

const login42 = () => {
  window.location.href = 'http://localhost:3000/auth/42';
};

const handleCallback = async () => {
  const route = router.currentRoute.value;
  const token = route.query.token;

  if (token) {
    localStorage.setItem('access_token', token);

    if (route.path === '/choose-username') {
      isCompleteProfileNeeded.value = true;
    } else {
      console.log('should be logging in');
      // Clear query params from the URL without reloading the page
      router.replace({ path: route.path, query: {} });
      fetchMe();
      initializeSocket();
    }
  } else {
    isCompleteProfileNeeded.value = false;
  }
};

const handleCompleteProfile = async (username) => {
  console.log('completing profile?')
  const access_token = localStorage.getItem('access_token');
  try {
    const response = await fetch('http://localhost:3000/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, username }),
    });

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);

    // Once complete, hide the CompleteUser component and redirect
    isCompleteProfileNeeded.value = false;
    store.dispatch('logIn', data.user);
    initializeSocket();

    // router.push('/dashboard'); // Uncomment if using Vue Router
  } catch (error) {
    console.error('Failed to complete profile:', error);
    error.value = 'Failed to complete profile. Please try again.';
  }
};

const loginUser = async () => {
  error.value = '';
  try {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginDetails.value)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    console.log(`Received access token: ${data.access_token}`);
    store.dispatch('logIn', data.user);
    initializeSocket();
  } catch (error) {
    console.error('Error logging in:', error);
    error.value = error.message;
  }
};

const fetchMe = async () => {
  console.log ('fetching my profile!');
  const token = localStorage.getItem('access_token');
  const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
  };
  try {
    // make an API request to /me to get user info
    const response = await fetch('http://localhost:3000/auth/me', { headers });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    const data = await response.json();
    store.dispatch('logIn', data.user);
  } catch {
    console.error('error fetching user profile');
  }
}

const logoutUser = () => {
  socket.value.emit('logOut', { id: currentUser.value.id})
  
  localStorage.setItem('access_token', null);
  store.dispatch('logOut');
};

const deleteAccount = async () => {
  error.value = '';
  try {
    const response = await fetch(`http://localhost:3000/user/${currentUser.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }

    logoutUser();
  } catch (error) {
    console.error('Error deleting account:', error);
    error.value = error.message;
  }
};

const initializeSocket = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  if (socket.value == null) {
    socket.value = io('http://localhost:3000', {
      auth: { token },
    }); 
    store.commit('SET_SOCKET', socket.value);
    console.log('established socket');
  }

  socket.value.on('connected', (message) => {
    console.log(message);
  });
};

onMounted(() => {
  handleCallback();
  // Any initialization that needs to happen on component mount
});
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