<template>
  <div class="user-list">
    <h2>Users</h2>
    <div v-for="user in sortedUsers" :key="user.id" class="user" @click="viewProfile(user)">
      <div class="avatar">
        <img :src="user.avatar ? `http://localhost:3000${user.avatar}` : `https://robohash.org/${user.username}?set=set4`" :alt="`${user.username}`" />
      </div>
      <div class="status-indicator" :class="getStatusClass(user)"></div>
      <div class="username">{{ user.username }}</div>
    </div>

    <ViewProfile
      :selectedUser="selectedUser"
      :isVisible="isProfileVisible"
      :isBlocked="isBlocked"
      @close="isProfileVisible = false"
      @directMessage="directMessage"
      @blockUser="blockUser"
      @unblockUser="unblockUser"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, defineEmits } from 'vue';
import { useStore } from 'vuex';
import ViewProfile from './ViewProfile.vue';

const store = useStore();
const socket = computed(() => store.state.socket);
const currentUser = computed(() => store.state.currentUser);

const emit = defineEmits(['directMessage']);

const users = ref([]);
const blocked = ref([]);
const error = ref('');
const selectedUser = ref(null);
const isProfileVisible = ref(false);
const isBlocked = ref(false);

const getUsers = () => {
  error.value = '';
  fetch('http://localhost:3000/user/all', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
      'Content-Type': 'application/json',
    },
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
      updateList(data);
    })
    .catch(err => {
      console.error('Error fetching users:', err);
      error.value = err.message;
    });
};

const fetchBlocked = async () => {
  error.value = '';
  try {
    const response = await fetch('http://localhost:3000/user/blocked', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }
    const data = await response.json();
    blocked.value = data;
  } catch (err) {
    console.error('Error fetching blocked:', err);
    error.value = err.message;
  }
};

const updateUserStatus = (username, userId, isOnline, isInGame, isInQueue, avatar) => {
  console.log(`user: ${username} / ${userId} has changed status: online? ${isOnline} ingame? ${isInGame} inqueue? ${isInQueue}`);
  const user = users.value.find(u => u.id === userId);
  if (user) {
    if (isOnline != null)
      user.isOnline = isOnline;
    if (isInGame != null)
      user.isInGame = isInGame;
    if (isInQueue != null)
      user.isInQueue = isInQueue;
    if (username != null)
      user.username = username;
    if (avatar != null)
      user.avatar = avatar;
    
    // Trigger reactivity
    users.value = [...users.value];
  } else {
    users.value.push({
      id: userId,
      username: username,
      avatar: avatar,
      isOnline: isOnline,
      isInGame: isInGame,
      isInQueue: isInQueue,
    });
  }
};

const updateList = (data) => {
  users.value = data
  .filter(user => user.id !== currentUser.value.id)
  .map(user => ({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    isOnline: user.isOnline,
    isInGame: user.isInGame,
    isInQueue: user.isInQueue,
  }));
};

const sortedUsers = computed(() => {
  return [...users.value].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });
});

const getStatusClass = (user) => {
  if (user.isInGame) return 'status-in-game';
  if (user.isInQueue) return 'status-in-queue';
  if (user.isOnline) return 'status-online';
  return 'status-offline';
};

const viewProfile = (user) => {
  selectedUser.value = user;
  if (selectedUser.value.id && blocked.value.some(user => user.id === selectedUser.value.id)) {
    isBlocked.value = true;
  } else {
    isBlocked.value = false;
  }
  isProfileVisible.value = true;
  console.log(`viewing ${user.username}`); 
};

const blockUser = async (friend) => {
  console.log (`blocking user: ${friend}` );
  try {
    const response = await fetch('http://localhost:3000/user/block', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetId: friend.id,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error blocking friend:', error);
    error.value = error.message;
  }
};

const unblockUser = async (friend) => {
  console.log (`blocking user: ${friend}` );
  try {
    const response = await fetch('http://localhost:3000/user/unblock', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetId: friend.id,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error blocking friend:', error);
    error.value = error.message;
  }
};

const directMessage = (user) => {
  emit('directMessage', user);
};

onMounted(() => {
  getUsers();
  fetchBlocked();
  socket.value.on('userStatusUpdate', (data) => {
    updateUserStatus(data.username, data.userId, data.isOnline, data.isInGame, data.isInQueue, data.avatar);
  });

  socket.value.on('block', (data) => {
    blocked.value.push(data);
  });
  
  socket.value.on('unblock', (data) => {
    blocked.value = blocked.value.filter(friend => friend.id !== data.id);
  });

});
</script>

<style scoped>
.user-list {
  width: 100%;
  max-width: 100%;
  border: 1px solid #ccc;
  height: 45vh;
  border-radius: 8px;
  padding: 6px;
  background-color: #1a1a1a;
  color: #fff;
  overflow-y: auto;
  
  /* Scrollbar Styles */
  scroll-behavior: smooth;
}

.user {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  border-radius: 10px;
}

.user:hover {
  background-color: #e0e0e0;
  border-radius: 10px;
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

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  position: absolute;
  bottom: 5px;
  left: 35px;
}

.status-online {
  background-color: #4CAF50;
}

.status-offline {
  background-color: #9e9e9e;
}

.status-in-queue {
  background-color: #FFC107;
}

.status-in-game {
  background-color: #2196F3;
}

.username {
  font-size: 14px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
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

.options button:hover {
  background-color: #45a049;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}


</style>