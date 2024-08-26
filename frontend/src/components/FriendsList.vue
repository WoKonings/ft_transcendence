<template>
  <div class="user-list">
    <div class="header">
      <h2>Friends List</h2>
      <button v-if="pendingFriendRequests.length > 0" class="notification" @click="viewPendingRequests">
        {{ pendingFriendRequests.length }} Pending Requests
      </button>
    </div>
    <div class="user" v-for="friend in friends" :key="friend.id" @click="selectUser(friend)">
      <div class="avatar">
        <img :src="friend.avatar || 'https://via.placeholder.com/40'" alt="Avatar" />
      </div>
      <div class="username">{{ friend.username }}</div>
    </div>

    <div v-if="selectedUser" class="options-overlay" @click="closeOptions">
      <div class="options" @click.stop>
        <button @click="inviteToPlay(selectedUser)">Invite to Play</button>
        <button @click="sendMessage(selectedUser)">Send Message</button>
        <button @click="removeFriend(selectedUser)">Remove Friend</button>
      </div>
    </div>

    <p v-if="error" style="color: red">{{ error }}</p>

    <!-- Modal for viewing pending requests -->
    <div v-if="showPendingRequestsModal" class="options-overlay" @click="closePendingRequests">
      <div class="options" @click.stop>
        <h3>Pending Friend Requests</h3>
        <div v-for="request in pendingFriendRequests" :key="request.id" class="request-info">
          <span>{{ request.username }}</span>
          <button @click="acceptRequest(request.id)">Accept</button>
          <button @click="declineRequest(request.id)">Decline</button>
        </div>
        <button @click="closePendingRequests">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const currentUser = computed(() => store.state.currentUser);
const socket = computed(() => store.state.socket);

const friends = ref([]);
const pendingFriendRequests = ref([]);
const error = ref('');
const showPendingRequestsModal = ref(false);
const selectedUser = ref(null);

const fetchFriends = async () => {
  error.value = '';
  const userId = currentUser.value.id;  
  try {
    const response = await fetch('http://localhost:3000/user/friends', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }
    const data = await response.json();
    console.log(`test: ${data}`);
    friends.value = data;
  } catch (err) {
    console.error('Error fetching friends:', err);
    error.value = err.message;
  }
};

const fetchPendingRequests = async () => {
  error.value = '';
  const userId = currentUser.value.id;
  try {
    const response = await fetch('http://localhost:3000/user/pending', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }
    const data = await response.json();
    pendingFriendRequests.value = data;
  } catch (err) {
    console.error('Error fetching pending requests:', err);
    error.value = err.message;
  }
};

const initializeSocketListeners = () => {
  if (socket.value) {
    socket.value.on('newFriendRequest', (data) => {
      pendingFriendRequests.value.push(data);
      console.log('New friend request:', data);
    });
  }
};

const viewPendingRequests = () => {
  showPendingRequestsModal.value = true;
};

const closePendingRequests = () => {
  showPendingRequestsModal.value = false;
};

const acceptRequest = async (requestId) => {
  try {
    const response = await fetch(`http://localhost:3000/user/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetId: requestId, userId: currentUser.value.id })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }
    pendingFriendRequests.value = pendingFriendRequests.value.filter(r => r.id !== requestId);
    fetchFriends();
  } catch (err) {
    console.error('Error accepting request:', err);
    error.value = err.message;
  }
};

const declineRequest = async (requestId) => {
  try {
    const response = await fetch('http://localhost:3000/user/remove', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        userId: currentUser.value.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    pendingFriendRequests.value = pendingFriendRequests.value.filter(r => r.id !== requestId);
    console.log(data.message);
  } catch (error) {
    console.error('Error declining friend request:', error);
    error.value = error.message;
  } finally {
    // any cleanup goes here
  }
};

const selectUser = (user) => {
  selectedUser.value = user;
};

const closeOptions = () => {
  selectedUser.value = null;
};

const inviteToPlay = (friend) => {
  console.log('Inviting to play:', friend.name);
  closeOptions();
};

//todo: merge with guzzy branch?
const sendMessage = (friend) => {
  console.log('Sending message to:', friend.name);
  closeOptions();
};

const removeFriend = async (friend) => {
  try {
    const response = await fetch('http://localhost:3000/user/remove', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetId: friend.id,
        userId: currentUser.value.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    friends.value = friends.value.filter(f => f.id !== friend.id);
    // console.log(data.message);
  } catch (error) {
    console.error('Error removing friend:', error);
    error.value = error.message;
  } finally {
    closeOptions();
  }
};

onMounted(() => {
  fetchFriends();
  fetchPendingRequests();
  initializeSocketListeners();
});
</script>

<style scoped>
.user-list {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 16px;
  background-color: #f2f2f2;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.user {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
  border-bottom: 1px solid #ddd;
  transition: background-color 0.2s;
}

.user:hover {
  background-color: #e0e0e0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.username {
  font-size: 14px;
  font-weight: bold;
  flex-grow: 1;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button, .notification {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.actions button:hover, .notification:hover {
  background-color: #45a049;
}

.options-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.options {
  background-color: #ffffff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.options button {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.request-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.request-info button {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.request-info button:hover {
  background-color: #45a049;
}
</style>