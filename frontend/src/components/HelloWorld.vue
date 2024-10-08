<template>
  <div>
    <div v-if="!isCompleteProfileNeeded"> 
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

const isCompleteProfileNeeded = ref(false);
const isLoggedIn = computed(() => store.state.isLoggedIn);
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
    fetchMe();
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
    fetchMe();
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
    fetchMe();
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
  if (currentUser.value){
    // if (socket.value)
    //   socket.value.emit('logOut', { id: currentUser.value.id})
    
    localStorage.removeItem('access_token');

    store.dispatch('logOut');
    socket.value = null;
  }
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

const initializeSocket = async () => {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  if (socket.value == null) {
    console.log('requesting new socket');
    socket.value = await io('http://localhost:3000', {
      auth: { token },
    }); 
    store.commit('SET_SOCKET', socket.value);
    console.log('established socket');
  }

  if (socket.value == null)
    return;
  socket.value.on('connected', (message) => {
    console.log(message);
  });

  socket.value.on('loginElsewhere', (message) => {
    console.log(message);
    logoutUser();
  });
};

onMounted(() => {
  const access_token = localStorage.getItem('access_token');
  if (access_token && !isLoggedIn.value) {
    console.log("should request re-login");
    localStorage.removeItem('access_token');
    console.log('WIPED ACCESS TOKEN!');
  }
  //todo: re-enable
  // if (!isLoggedIn.value)
  //   router.push('/login');
  handleCallback();
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
  display: flex;
  margin-right: 20px; /* Space between chat and game */
  justify-items: center;
  justify-content: center;
  max-width: 300px;
  height: 200%;
}

.pong-game-container {
  display: flex;
  justify-content: center;
  align-items:end;
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