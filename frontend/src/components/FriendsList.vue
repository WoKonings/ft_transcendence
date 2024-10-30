<template>
  <div class="user-list">
    <h2>Friends</h2>
    <div class="header">
      <button v-if="pendingFriendRequests.length > 0" class="notification" @click="viewPendingRequests">
        {{ pendingFriendRequests.length }} Pending Requests
      </button>
      <button v-if="invites.length > 0" class="notification" @click="viewInvites">
        {{ invites.length }} Game Invites
      </button>
    </div>
    <div v-for="friend in sortedFriends" :key="friend.id" 
         class="user"
         @click="selectUser(friend)"
         :class="{ 'highlight': isInviteSender(friend.id) }">
      <div class="avatar">
        <img :src="friend.avatar ? `http://localhost:3000${friend.avatar}` : `https://robohash.org/${friend.username}?set=set4`" :alt="`${friend.username}`" />
      </div>
      <div class="status-indicator" :class="getStatusClass(friend)"></div>
      <div class="username">{{ friend.username }}</div>
    </div>

    <!-- Options Overlay -->
    <div v-if="selectedUser" class="options-overlay" @click="closeOptions">
      <div class="options" @click.stop>
        <button @click="inviteToPlay(selectedUser)">Invite to Play</button>
        <button @click="sendMessage(selectedUser)">Send Message</button>
        <button @click="viewProfile(selectedUser)">Profile</button>
        <button @click="removeFriend(selectedUser)">Remove Friend</button>
        <button @click="todo" v-if="isInviteSender(selectedUser.id)">Accept Invite</button>
        <button @click="todo" v-if="isInviteSender(selectedUser.id)">Decline Invite</button>
      </div>
    </div>
    <ViewProfile
      :selectedUser="selectedUser"
      :isVisible="isProfileVisible"
      @close="isProfileVisible = false" />
    </div>

    <!-- Error Message -->
    <p v-if="error" style="color: red">{{ error }}</p>

    <!-- Modal for Viewing Pending Requests -->
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

    <!-- Modal for Viewing Game Invites -->
    <div v-if="showInvitesModal" class="options-overlay" @click="closeInvites">
      <div class="options" @click.stop>
        <h3>Game Invites</h3>
        <div v-for="invite in invites" :key="invite.gameId" class="request-info">
          <span>{{ invite.sender }}</span>
          <button @click="acceptInvite(invite)">Accept</button>
          <button @click="declineInvite(invite.gameId)">Decline</button>
        </div>
        <button @click="closeInvites">Close</button>
      </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import ViewProfile from './ViewProfile.vue';

const store = useStore();
const currentUser = computed(() => store.state.currentUser);
const socket = computed(() => store.state.socket);

const friends = ref([]);
const pendingFriendRequests = ref([]);
const invites = ref([]);
const error = ref('');
const showPendingRequestsModal = ref(false);
const showInvitesModal = ref(false);
const selectedUser = ref(null);
const inviteSenders = ref(new Set()); // To keep track of users who sent invites
const isProfileVisible = ref(false); // State to manage profile visibility


const fetchFriends = async () => {
  error.value = '';
  const userId = currentUser.value.id;
  try {
    const response = await fetch('http://localhost:3000/user/friends', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }
    const data = await response.json();
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
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
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
  if (!socket.value) {
    console.error ('NO SOCKET FOR FRIENDSLIST!');
  }
  socket.value.on('newFriendRequest', (data) => {
    pendingFriendRequests.value.push(data);
  });

  socket.value.on('newFriend', (data) => {
    friends.value.push(data);
  });

  socket.value.on('removedFriend', (data) => {
    friends.value = friends.value.filter(friend => friend.id !== data.userId && friend.username !== data.username);
  });

  socket.value.on('gameInvite', (data) => {
    invites.value.push(data);
    inviteSenders.value.add(data.sender);
  });

  socket.value.on('userStatusUpdate', (data) => {
    if (friends.value.some(friend => friend.id === data.userId))
      updateUserStatus(data.username, data.userId, data.isOnline, data.isInGame, data.isInQueue, data.avatar);
  });
};

const updateUserStatus = (username, userId, isOnline, isInGame, isInQueue, avatar) => {
  console.log(`friend: ${username} / ${userId} has changed status on friends: online? ${isOnline} ingame? ${isInGame} inqueue? ${isInQueue}`);
	const friend = friends.value.find(u => u.id === userId);
	if (friend) {
    if (isOnline != null)
      friend.isOnline = isOnline;
    if (isInGame != null)
      friend.isInGame = isInGame;
    if (isInQueue != null)
      friend.isInQueue = isInQueue;
    if (username != null)
      friend.username = username;
    if (avatar != null)
      friend.avatar = avatar;
		// Trigger reactivity
		friends.value = [...friends.value];
	} else {
    friends.value.push({
      id: userId,
      username: username,
      avatar: avatar,
      isOnline: isOnline,
      isInGame: isInGame,
      isInQueue: isInQueue,
    });
  }
};

const sortedFriends = computed(() => {
  return [...friends.value].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });
});

const viewPendingRequests = () => {
  showPendingRequestsModal.value = true;
};

const closePendingRequests = () => {
  showPendingRequestsModal.value = false;
};

const viewInvites = () => {
  showInvitesModal.value = true;
};

const viewProfile = (user) => {
  isProfileVisible.value = true; // Show the profile modal
  console.log(`viewing ${user.username}`); 
};


const closeInvites = () => {
  showInvitesModal.value = false;
};

const acceptRequest = async (requestId) => {
  try {
    const response = await fetch('http://localhost:3000/user/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetId: requestId })
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
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
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
  } catch (error) {
    console.error('Error declining friend request:', error);
    error.value = error.message;
  }
};

const acceptInvite = async (invite) => {
  // Handle invite acceptance logic
  console.log('Accepted invite:', invite);
  socket.value.emit('acceptInvite', {
    gameId: invite.gameId,
    username: currentUser.value.username,
    userId: currentUser.value.id,
  })
  invites.value = invites.value.filter(i => i.gameId !== invite.gameId);
  closeInvites();
  // inviteSenders.value.add();
  store.commit('SET_SHOW_GAME', true);
};

const declineInvite = async (gameId) => {
  // Handle invite decline logic
  console.log('Declined invite for game:', gameId);
  invites.value = invites.value.filter(i => i.gameId !== gameId);
};

const selectUser = (user) => {
  selectedUser.value = user;
};

const closeOptions = () => {
  selectedUser.value = null;
};

const inviteToPlay = (friend) => {
  console.log(`friend?: ${friend} ??:`, friend);
  socket.value.emit('sendGameInvite', {
    senderName: currentUser.value.username,
    senderId: currentUser.value.id,
    targetName: friend.username,
  });
  store.dispatch('toggleShowGame', true);
  closeOptions();
};

const sendMessage = (friend) => {
  console.log('Sending message to:', friend.name);
  closeOptions();
};

const removeFriend = async (friend) => {
  try {
    const response = await fetch('http://localhost:3000/user/remove', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
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
  } catch (error) {
    console.error('Error removing friend:', error);
    error.value = error.message;
  } finally {
    closeOptions();
  }
};

const isInviteSender = (friendId) => {
  return inviteSenders.value.has(friends.value.find(f => f.id === friendId)?.username);
};

const getStatusClass = (friend) => {
  if (friend.isOnline == false) return 'status-offline';
  if (friend.isInGame) return 'status-in-game';
  if (friend.isInQueue) return 'status-in-queue';
  if (friend.isOnline) return 'status-online';
  return 'status-offline';
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
  max-width: 100%;
	border: 1px solid #ccc;
  height: 40vh;
	border-radius: 8px;
	padding: 6px;
	background-color: #f2f2f2;
  overflow-y: auto; /* Enable scrolling for the content area */
}

.user-list-content {
  overflow-y: auto;
  max-width: 1%;
  max-height: 40vh;
}

.user-list-scrollbar {
  /* Adjust styles for the scrollbar element (using your preferred library) */
  width: 10px;
  height: 100%;
  background-color: #ddd;
  position: absolute;
  right: 0;
}


.header {
  display: flex;
  margin-bottom: 16px;
}

.user {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 8px;
	border-bottom: 1px solid #ddd;
	cursor: pointer;
	transition: background-color 0.2s;
	position: relative; /* Allow absolute positioning of status indicator */
  border-radius: 10px;
}

.user.highlight {
  background-color: #077a2c;
  animation: blink 1s step-start infinite;
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

.username {
  font-size: 14px;
  font-weight: bold;
  overflow: hidden; /* Hide overflow text */
  text-overflow: ellipsis; /* Show ellipsis for truncated text */
  max-width: 90px; /* Set a maximum width for the username */
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

@keyframes blink {
  50% { background-color: #d0f7d4; }
}
</style>
