<template>
  <div class="user-list">
    <div 
      v-for="user in sortedUsers" 
      :key="user.id" 
      class="user" 
      @click="selectUser(user)"
    >
      <div class="avatar">
        <img :src="user.avatar || 'https://via.placeholder.com/40'" alt="Avatar" />
        <div class="status-indicator" :class="getStatusClass(user)"></div>
      </div>
      <div class="username">{{ user.username }}</div>
    </div>

    <div v-if="selectedUser" class="options-overlay" @click="closeOptions">
      <div class="options" @click.stop>
        <button @click="addAsFriend(selectedUser)">Add as Friend</button>
        <button @click="sendMessage(selectedUser)">Send Message</button>
        <button @click="viewProfile(selectedUser)">View Profile</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const socket = computed(() => store.state.socket);
const currentUser = computed(() => store.state.currentUser);

const users = ref([]);
const error = ref('');
const selectedUser = ref(null);

const getUsers = () => {
  error.value = '';
  fetch('http://localhost:3000/user/all', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
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

const updateUserStatus = (username, isOnline, isInGame, isInQueue) => {
	const user = users.value.find(u => u.username === username);
	if (user) {
		user.isOnline = isOnline;
		user.isInGame = isInGame;
		user.isInQueue = isInQueue;
		// Trigger reactivity
		users.value = [...users.value];
	}
};

const updateList = (data) => {
  users.value = data
    .filter(user => user.id !== currentUser.value.id)
    .map(user => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar || 'https://via.placeholder.com/40',
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

const selectUser = (user) => {
  selectedUser.value = user;
};

const closeOptions = () => {
  selectedUser.value = null;
};

const addAsFriend = (user) => {
	console.log(`Adding ${user.username}, id: ${user.id} as a friend`);
	console.log(`Current user ID: ${currentUser.value.id}`);
	// console.log(`token?: ${localStorage.getItem('access_token')}`);
	fetch('http://localhost:3000/user/add', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			targetId: user.id,
			userId: currentUser.value.id,
		}),
	})
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				console.error('Error:', data.error);
			} else {
				console.log(data.message);
			}
		})
		.catch(error => {
			console.error('Error adding friend:', error);
		});

	closeOptions();
};

const sendMessage = (user) => {
  console.log(`Sending message to ${user.username}`);
  // Implement message sending logic here
  closeOptions();
};

const viewProfile = (user) => {
  console.log(`Viewing profile of ${user.username}`);
  // Implement profile viewing logic here
  closeOptions();
};

onMounted(() => {
  getUsers();
  socket.value.on('newStatus', (data) => {
		updateUserStatus(data.username, data.newStatus);
	});
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

.user {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
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
  position: relative;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
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
</style>