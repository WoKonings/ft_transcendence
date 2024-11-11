<template>
  <div class="user-list">
    <h2>Friends</h2>
    <div class="header">
      <button v-if="pendingFriendRequests.length > 0" class="notification" @click="viewPendingRequests">
        {{ pendingFriendRequests.length }} Pending Requests
      </button>
      <button v-if="invites.length > 0 && ingame == false" class="notification" @click="viewInvites">
        {{ invites.length }} Game Invites
      </button>
    </div>
    <div v-for="friend in sortedFriends" :key="friend.id" class="user"
      @click="viewProfile(friend)">
      <div class="avatar">
        <img :src="friend.avatar ? `http://localhost:3000${friend.avatar}` : `https://robohash.org/${friend.username}?set=set4`" :alt="`${friend.username}`" />
      </div>
      <div class="status-indicator" :class="getStatusClass(friend)"></div>
      <div class="username">{{ friend.username }}</div>
    </div>

    <ViewProfile
      :selectedUser="selectedUser"
      :isVisible="isProfileVisible"
      :isFriend="true"
      :isBlocked="isBlocked"
      @close="isProfileVisible = false" 
      @friendRemoved="removeFriend"
      @invite="inviteToPlay"
      @directMessage="directMessage"
      @blockUser="blockUser"
      @unblockUser="unblockUser"
    />
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
          <button @click="acceptGameInvite(invite)">Accept</button>
          <button @click="declineGameInvite(invite)">Decline</button>
        </div>
        <button @click="closeInvites">Close</button>
      </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, defineEmits } from 'vue';
import { useStore } from 'vuex';
import ViewProfile from './ViewProfile.vue';

const store = useStore();
const socket = computed(() => store.state.socket);

const emit = defineEmits(['directMessage']);

const friends = ref([]);
const blocked = ref([]);
const pendingFriendRequests = ref([]);
const invites = ref([]);
const error = ref('');
const showPendingRequestsModal = ref(false);
const showInvitesModal = ref(false);
const selectedUser = ref(null);
const isProfileVisible = ref(false); // State to manage profile visibility
const isBlocked = ref(false);
const ingame = ref(false);


const fetchFriends = async () => {
  error.value = '';
  try {
    const response = await fetch('http://localhost:3000/user/friends', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
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

const fetchPendingRequests = async () => {
  error.value = '';
  try {
    const response = await fetch('http://localhost:3000/user/pending', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
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
    pendingFriendRequests.value = pendingFriendRequests.value.filter(request => request.id !== data.id);
    friends.value.push(data);
  });

  socket.value.on('removedFriend', (data) => {
    friends.value = friends.value.filter(friend => friend.id !== data.userId && friend.username !== data.username);
  });

  socket.value.on('block', (data) => {
    blocked.value.push(data);
  });
  
  socket.value.on('unblock', (data) => {
    blocked.value = blocked.value.filter(friend => friend.id !== data.id);
  });

  socket.value.on('gameInvite', (data) => {
    invites.value.push(data);
  });

  socket.value.on('gameJoined', () => {
    console.log('FRIEND LIST GAME JOINED!');
    ingame.value = true;
  });

  socket.value.on('gameWon', () => {
    console.log('FRIEND LIST GAME WON!');

    ingame.value = false;
  });

  socket.value.on('gameLost', () => {
    console.log('FRIEND LIST GAME LOST!');

    ingame.value = false;
  });

  socket.value.on('opponentLeft', () => {
    console.log('FRIEND LIST OPPONENT LEFT!');

    ingame.value = false;
  });

  socket.value.on('opponentJoined', () => {
    console.log('FRIEND LIST OPPONENT JOINED!');

    ingame.value = true;
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
  selectedUser.value = user;
  if (selectedUser.value.id && blocked.value.some(user => user.id === selectedUser.value.id)) {
    isBlocked.value = true;
  } else {
    isBlocked.value = false;
  }
  isProfileVisible.value = true;
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
        targetId: requestId,
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

const acceptGameInvite = async (invite) => {
  console.log('Accepted invite:', invite);
  socket.value.emit('acceptInvite', {
    gameId: invite.gameId,
  })
  invites.value = invites.value.filter(i => i.gameId !== invite.gameId);
  closeInvites();
};

const declineGameInvite = async (invite) => {
  console.log('Declined invite for game:', invite.gameId);
  invites.value = invites.value.filter(i => i.gameId !== invite.gameId);
};

const closeOptions = () => {
  selectedUser.value = null;
};

const inviteToPlay = (friend) => {
  const existingInvite = invites.value.find((invite) => invite.id === friend.id);

  if (existingInvite) {
    console.log('Already have an invite, accepting instead of creating another invite!')
    acceptGameInvite(existingInvite);
    return;
  }

  socket.value.emit('sendGameInvite', {
    targetName: friend.username,
  });
  closeOptions();
};

const directMessage = (user) => {
  emit('directMessage', user);
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
  } finally {
    closeOptions();
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
  } finally {
    closeOptions();
  }
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

const getStatusClass = (friend) => {
  if (friend.isOnline == false) return 'status-offline';
  if (friend.isInGame) return 'status-in-game';
  if (friend.isInQueue) return 'status-in-queue';
  if (friend.isOnline) return 'status-online';
  return 'status-offline';
};

onMounted(() => {
  fetchFriends();
  fetchBlocked();
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
  background-color: #1a1a1a;
  color: #fff;
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

.username {
  font-size: 14px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis; /* Show ellipsis for truncated text */
  max-width: 90px;
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
