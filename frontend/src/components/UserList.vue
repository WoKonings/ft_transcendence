<template>
  <div class="user-list">
    <div class="user" v-for="user in users" :key="user.id" @click="selectUser(user)">
      <div class="avatar">
        <img :src="user.avatar || 'https://via.placeholder.com/40'" alt="Avatar" />
      </div>
      <div class="username">{{ user.username }}</div>
    </div>

    <div v-if="selectedUser" class="options-overlay" @click="closeOptions">
      <div class="options" @click.stop>
        <button @click="addAsFriend(selectedUser)">Add as Friend</button>
        <!-- <button @click="inviteToGame(selectedUser)">Invite to Game</button> -->
        <button @click="sendMessage(selectedUser)">Send Message</button>
        <button @click="viewProfile(selectedUser)">Send Message</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { computed } from 'vue';

const store = useStore(); // Access the Vuex store

// Get the current user from Vuex store
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
			return response.json(); // Parse the response to JSON
		})
		.then(data => {
			updateList(data); // Update the users list
		})
		.catch(err => {
			console.error('Error fetching users:', err);
			error.value = err.message;
		});
};

const updateList = (data) => {
  console.log('Fetched users data:', data); // Debugging line
  users.value = data.filter(user => user.id !== currentUser.value.id).map(user => ({
    id: user.id,
    username: user.username,
    avatar: user.avatar || 'https://via.placeholder.com/40', // Optional avatar handling
  }));
  console.log('Mapped users:', users.value); // Debugging line
};

const selectUser = (user) => {
  // console.log('Selected user:', user); // Debugging line
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

const inviteToGame = (user) => {
	console.log(`Inviting ${user.username} to a game`);
	closeOptions();
};

const sendMessage = (user) => {
	console.log(`Sending message to ${user.username}`);
	closeOptions();
};

// Fetch users when the component is mounted
onMounted(() => {
	getUsers();
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
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
