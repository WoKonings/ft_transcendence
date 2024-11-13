<template>
  <div>
    <!-- <div v-if="!show2FAInput"> 
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
    </div> -->

    <div v-if="show2FAInput" class="twofa-container">
      <label for="twofa-code">Enter 2FA Code:</label>
      <input id="twofa-code" v-model="twoFactorCode" type="text" maxlength="6" placeholder="6-digit code" class="twofa-input"/>
      <button @click="handle2FA" class="twofa-button">Authenticate</button>
      <button @click="show2FAInput = false" class="twofa-button">Cancel</button>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>

    <div class="main-container">
      <div v-if="disconnected_error != ''" class="disconnect-container">
          {{ disconnected_error }}
      </div>
      <div class="content-container">
        <div class="pong-game-container">
          <PongGame v-if="isLoggedIn && currentUser" />
        </div>
        <div class="chat-box-container">
          <ChatBox v-if="isLoggedIn && currentUser" :directMessage="directMessager" />
        </div>
      </div>
      <div class="sidebar">
        <UserProfileButton v-if="isLoggedIn && currentUser" />
        <div class="friends-list-container">
          <FriendsList v-if="isLoggedIn && currentUser" @directMessage="directMessage" />
        </div>
        <div class="user-list-container">
          <UserList v-if="isLoggedIn && currentUser" @directMessage="directMessage"/>
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
import UserProfileButton from './UserProfileButton.vue';
import router from '@/router/router';

const store = useStore();

// const newUser = ref({
//   username: '',
//   email: '',
//   password: ''
// });
const loginDetails = ref({
  username: '',
  password: ''
});
const error = ref('');
const disconnected_error = ref('');
const socket = ref(null);

const isLoggedIn = computed(() => store.state.isLoggedIn);
const currentUser = computed(() => store.state.currentUser);

const twoFactorCode= ref(null);
const show2FAInput = ref(false);

const directMessager = ref(null);

// const createUser = async () => {
//   error.value = '';
//   try {
//     const response = await fetch('http://localhost:3000/auth/register', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(newUser.value)
//     });

//     if (!response.ok) {
//       const err = await response.json();
//       throw new Error(err.error);
//     }

//     const data = await response.json();
//     sessionStorage.setItem('access_token', data.access_token);
//     console.log(`Received access token: ${data.access_token}`);
//     store.dispatch('logIn', data.user);
//     fetchMe();
//     initializeSocket();
//   } catch (error) {
//     console.error('Error creating user:', error);
//     error.value = error.message;
//   }
// };


const handle2FA = async () => {
  error.value = '';
  console.log (`doing 2FA! with: email: ${loginDetails.value.username}, password: ${loginDetails.value.password}`); 
  try {
    const token = sessionStorage.getItem('access_token');
    const response = await fetch('http://localhost:3000/auth/2fa/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        username: loginDetails.value.username,
        password: loginDetails.value.password,
        token: twoFactorCode.value
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to authenticate with 2FA');
    }
    
    // If 2FA authentication succeeds, store the new access token
    sessionStorage.removeItem('access_token');
    sessionStorage.setItem('access_token', data.access_token);
    console.log('2FA authentication succeeded:', data.access_token);
    
    // Proceed with authenticated state
    
    fetchMe(); 
    initializeSocket();
    
    // Clear the 2FA input
    twoFactorCode.value = '';
    show2FAInput.value = false;  // Hide the 2FA input
  } catch (error) {
    console.error('Error during 2FA authentication:', error);
    error.value = error.message;
  }
};

// const login42 = () => {
//   window.location.href = 'http://localhost:3000/auth/42';
// };

const handleCallback = async () => {
  const route = router.currentRoute.value;
  const token = route.query.token;
  
  if (token) {
    sessionStorage.setItem('access_token', token);
  
    const decodedToken = JSON.parse(atob(token.split('.')[1])); // decoding the JWT payload
    // clear query params from the URL without reloading the page
    router.replace({ path: route.path, query: {} });
    if (decodedToken.pre_auth == true) {
      console.log ('uh oh 2FA !!!!');
      show2FAInput.value = true;
      loginDetails.value.username = decodedToken.username;
    } else {        
      console.log('should be logging in');
      fetchMe();
      initializeSocket();
    }
  }
};

// const loginUser = async () => {
//   error.value = '';
//   try {
//     const response = await fetch('http://localhost:3000/auth/login', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(loginDetails.value)
//     });

//     if (!response.ok) {
//       const err = await response.json();
//       throw new Error(err.error);
//     }

//     const data = await response.json();
//     sessionStorage.setItem('access_token', data.access_token);
    
//     const decodedToken = JSON.parse(atob(data.access_token.split('.')[1])); // Decoding the JWT payload
//     if (decodedToken.pre_auth == true) {
//       console.log ('uh oh 2FA !!!!');
//       show2FAInput.value = true;
//     } else {      
//       console.log(`Received access token: ${data.access_token}`);
//       fetchMe();
//       initializeSocket();
//     }
//   } catch (error) {
//     console.error('Error logging in!');
//     error.value = error.message;
//   }
// };

const fetchMe = async () => {
  console.log ('fetching my profile!');
  const token = sessionStorage.getItem('access_token');
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
    if (data.user.twoFactorEnabled == true) {
      console.log('TWO FA REQUIRED!');
    } else {
      console.log('TWO FA DISABLED!');
    }
    console.log('user: ', data.user);
    store.dispatch('logIn', data.user);
  } catch {
    console.error('error fetching user profile');
    store.dispatch('logOut');
    router.push('/login');
  }
}

const logoutUser = () => {
  if (currentUser.value){
    // if (socket.value)
    //   socket.value.emit('logOut', { id: currentUser.value.id})
    
    sessionStorage.removeItem('access_token');
    
    store.dispatch('logOut');
    socket.value = null;

    router.push('/login');
  } else {
    router.push('/login');
    store.dispatch('logOut');
    sessionStorage.removeItem('access_token');
  }
};

// const deleteAccount = async () => {
  //   error.value = '';
//   try {
  //     const response = await fetch(`http://localhost:3000/user/${currentUser.value.id}`, {
    //       method: 'DELETE',
    //       headers: {
      //         'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
      //         'Content-Type': 'application/json'
      //       }
      //     });
      
      //     if (!response.ok) {
        //       const err = await response.json();
        //       throw new Error(err.error);
        //     }
        
//     logoutUser();
//   } catch (error) {
  //     console.error('Error deleting account:', error);
  //     error.value = error.message;
  //   }
  // };
  
const initializeSocket = async () => {
  const token = sessionStorage.getItem('access_token');
  if (!token) return;
    
  if (socket.value == null) {
    console.log('requesting new socket');
    socket.value = await io('http://localhost:3000', {
      reconnectionDelay: 5000,
      reconnectionAttemps: 5,
      auth: { token },
    }); 
    store.commit('SET_SOCKET', socket.value);

    console.log('established socket: ', socket.value);
  }
  
  if (socket.value == null) {
      sessionStorage.removeItem('access_token');
      logoutUser();
  }

  socket.value.on('connected', (message) => {
    error.value = '';
    disconnected_error.value = '';
    console.log(message);
  });
  
  socket.value.on('disconnected', (message) => {
    socket.value.disconnect();
    socket.value = null;
    console.log(message);
    logoutUser();
  });

  socket.value.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    disconnected_error.value = 'Disconnected from server.';
  });

  socket.value.on('connect_error', () => {
    // console.log('Socket connection error:', error);
  });
};

const directMessage = (user) => {
  directMessager.value = user;
};

onMounted(() => {
  const access_token = sessionStorage.getItem('access_token');
  if (access_token && !isLoggedIn.value) {
    console.log("should request re-login");
    fetchMe();
    initializeSocket();
    // if (!isLoggedIn.value && !socket.value) {
    //   sessionStorage.removeItem('access_token');
    //   // console.log('WIPED ACCESS TOKEN!');
    //   logoutUser();
    // }
    console.log('RELOGGED!');
  }
  if (!access_token) {
    logoutUser();
  }

  handleCallback();
});
</script>

<style scoped>
.main-container {
  display: flex;
  align-items: flex-start;
  width: 100vw;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background-color: #161616;
}

.content-container {
  display: flex;
  flex-direction: column;
  width: calc(100vw - 20vw);
  margin-left: auto;
  margin-right: 20px;
}

.chat-box-container {
  display: flex;
  width: 80vw;
  height: 36vh;
}

.pong-game-container {
  display: flex;
  width: 80vw;
  height: 60vh;
}

.sidebar {
  display: flex;
  margin-left: 20px;
  width: 15vw;
  flex-direction: column;
  justify-content: space-between;
  max-width: 300px;
}

.friends-list-container {
  margin-bottom: 20px;
}

.user-list-container {
  max-width: 100%;
}

.disconnect-container {
	width: 100%;
	height: 3vh;
	background-color: #ff4c4c85;
	color: white;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 2vh;
	font-weight: bold;
	position: absolute;
	top: 0;
	left: 0;
	z-index: 1000;
}

/* 2FA */
.twofa-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

.twofa-input {
  padding: 10px;
  font-size: 16px;
  width: 200px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.twofa-button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.twofa-button:hover {
  background-color: #45a049;
}

.error-message {
  color: red;
  margin-top: 10px;
}

</style>