<template>
  <div v-if="isVisible" class="profile-modal">
    <div class="modal-content">
      <button class="close-button" @click="closeProfile">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="feather feather-x"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="profile-header">
        <div class="profile-picture">
          <img
          :src=" userProfile.avatar ? `http://localhost:3000${userProfile.avatar}` : `https://robohash.org/${userProfile.username}?set=set4`"
          :alt="`${userProfile.username}'s profile picture`"
          />
        </div>
        <h2>{{ userProfile.username }}</h2>
        <div class="buttons" v-if="!isCurrentUserProfile">
          <button class="button" @click="sendMessage(selectedUser)">Send Message</button>
          <button class="button" v-if="!props.isFriend" @click="addAsFriend(selectedUser)">Add as Friend</button>
          <button class="button" v-if="props.isFriend" @click="inviteToPlay(selectedUser)">Invite to Play</button>
          <button class="button-red" v-if="props.isFriend" @click="removeFriend(selectedUser)">Remove Friend</button>
          <button class="button-red" v-if="!props.isBlocked" @click="blockUser(selectedUser)">Block Chat</button>
          <button class="button-red" v-if="props.isBlocked" @click="unblockUser(selectedUser)">Unblock Chat</button>
        </div>
        <!-- <button @click="todo" v-if="isInviteSender(selectedUser.id)">Accept Invite</button>
        <button @click="todo" v-if="isInviteSender(selectedUser.id)">Decline Invite</button> -->
      </div>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else class="profile-info">
        <div class="info-row">
          <span class="info-label">Joined:</span>
          <span class="info-value">{{ new Date(userProfile.createdAt).toLocaleDateString() }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Games Played:</span>
          <span class="info-value">{{ userProfile.gamesPlayed }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Wins:</span>
          <span class="info-value">{{ userProfile.gameWins }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Losses:</span>
          <span class="info-value">{{ userProfile.gamesPlayed - userProfile.gameWins }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Elo:</span>
          <span class="info-value">{{ userProfile.elo }}</span>
        </div>
      </div>

      <!-- Match History Section -->
      <div class="match-history" v-if="matchHistory.length">
        <h3>Match History</h3>
        <div class="match-history-content">
          <div v-for="match in matchHistory" :key="match.id" class="match-entry">
            <div class="player">
              <img
                :src=" match.players[0].avatar ? `http://localhost:3000${match.players[0].avatar}` : `https://robohash.org/${match.players[0].username}?set=set4`"
                :alt="`Player One - ${match.players[0].username}`"
                class="profile-picture small"
              />
              <div class="player-name">{{ match.players[0].username }}</div>
              <div class="score">{{ match.playerScores[0] }}</div>
              <div class="elo-change">
                <span :class="match.playerEloChanges[0] > 0 ? 'elo-gain' : 'elo-loss'">
                  {{ match.playerEloChanges[0] > 0 ? '+' : '' }}{{ match.playerEloChanges[0] }}
                </span>
              </div>
            </div>
            <div class="vs-section">
              <span class="vs-text">VS</span>
              <span class="match-date">{{ new Date(match.startTime).toLocaleString() }}</span>
            </div>
            <div class="player">
              <img
                :src=" match.players[1].avatar ? `http://localhost:3000${match.players[1].avatar}` : `https://robohash.org/${match.players[1].username}?set=set4`"
                :alt="`Player Two - ${match.players[1].username}`"
                class="profile-picture small"
              />
              <div class="player-name">{{ match.players[1].username }}</div>
              <div class="score">{{ match.playerScores[1] }}</div>
              <div class="elo-change">
                <span :class="match.playerEloChanges[1] > 0 ? 'elo-gain' : 'elo-loss'">
                  {{ match.playerEloChanges[1] > 0 ? '+' : '' }}{{ match.playerEloChanges[1] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineEmits, defineProps, computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const currentUser = store.state.currentUser;
const userProfile = ref({});
const loading = ref(false);
const matchHistory = ref([]);
const isCurrentUserProfile = computed(() => currentUser.id === userProfile.value.id);
const emit = defineEmits(['close', 'friendRemoved', 'invite', 'directMessage', 'blockUser', 'unblockUser']);
const props = defineProps({
  selectedUser: {
    type: Object,
    default: null,
  },
  isVisible: {
    type: Boolean,
    default: false,
  },
  isFriend: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  }
});

// Fetch user profile function
const fetchUserProfile = async () => {
  if (!props.selectedUser) {
    console.log('failed fetching user or selected user');
    return;
  }
  loading.value = true;
  try {
    // Fetch the user profile
    console.log(`fetching: ${props.selectedUser.username}, ${props.selectedUser.id}`)
    const userResponse = await fetch(`http://localhost:3000/user/search/${props.selectedUser.username}`, {
      method: 'GET',  
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      }
    });
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }
    userProfile.value = await userResponse.json();

    // Fetch the match history
    console.log(`fetching games: ${props.selectedUser.username}, ${props.selectedUser.id}`)
    const matchResponse = await fetch(`http://localhost:3000/game/${props.selectedUser.id}`, {
      method: 'GET',  
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      }
    });
    if (!matchResponse.ok) {
      throw new Error('Failed to fetch match history');
    }
    matchHistory.value = await matchResponse.json();
    matchHistory.value.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

    // Ensure players are not scrambled.
    matchHistory.value.forEach(game => {
      if (game.players[0].id !== game.winner.id) {
        console.log('switching invalid game');
        [game.players[0], game.players[1]] = [game.players[1], game.players[0]];
      }
      if (game.playerScores[0] < game.playerScores[1]) {
        [game.playerScores[0], game.playerScores[1]] = [game.playerScores[1], game.playerScores[0]];
      }
    });
    console.log("history?: ", matchHistory);
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// Close profile function
const closeProfile = () => {
  console.log('test: ', userProfile.value.gamesWon);
  emit('close');
};

// Watcher for isVisible prop
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    fetchUserProfile();
  }
});

const addAsFriend = (user) => {
  console.log(`Adding ${userProfile.value.username}, id: ${userProfile.value.id} as a friend`);
  // console.log(`Current user ID: ${currentUser.value.id}`);
  // console.log(`token?: ${sessionStorage.getItem('access_token')}`);
  fetch('http://localhost:3000/user/add', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      targetId: user.id,
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
  emit('close');
};

const removeFriend = async (friend) => {
  emit('friendRemoved', friend);
  emit('close');
};

const blockUser = async (user) => {
  emit('blockUser', user);
  emit('close');
};

const unblockUser = async (user) => {
  emit('unblockUser', user);
  emit('close');
};

const inviteToPlay = (friend) => {
  emit('invite', friend);
  emit('close');
  // console.log(`friend?: ${friend} ??:`, friend);
  // socket.value.emit('sendGameInvite', {
  //   targetName: friend.username,
  // });
  // store.dispatch('toggleShowGame', true);
  // closeOptions();
};

const sendMessage = (selectedUser) => {
  emit('directMessage', selectedUser);
  emit('close');
}

// Fetch user profile when component mounts (if needed)
// fetchUserProfile();
</script>

<style scoped>
.profile-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #2c2c2c;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #2c2c2c;
  color: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  position: relative;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.3s;
}

.close-button:hover {
  color: #1f2937;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.profile-picture {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 10px;
}

.small {
  display: flex;
  flex-direction: column;
  object-fit: cover;
  align-items: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-bottom: 10px;
}

.profile-picture img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-info {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-gap: 10px 20px;
  font-size: 14px;
}

.info-row {
  display: flex;
  align-items: center;
}

.info-label {
  font-weight: 600;
  color: #4b5563;
  margin-right: 10px;
}

.info-value {
  color: #6b7280;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #6b7280;
}

.match-history {
  margin-top: 20px;
}

.match-history-content {
  max-height: 200px;
  overflow-y: auto;
  padding-right: 10px;
}

.buttons {
	padding: 2px;
	border-radius: 8px;
	box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: row;
	gap: 1px;
}

.button {
	background-color: #4CAF50;
	color: white;
	border: none;
	border-radius: 4px;
	padding: 8px;
	cursor: pointer;
	font-size: 14px;
	transition: background-color 0.2s;
}

.button-red {
	background-color: #af534c;
	color: white;
	border: none;
	border-radius: 4px;
	padding: 8px;
	cursor: pointer;
	font-size: 14px;
	transition: background-color 0.2s;
}

/* Sleek scrollbar styling */
.match-history-content::-webkit-scrollbar {
  width: 8px;
}

.match-history-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.match-history-content::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: 10px;
}

.match-history-content::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

.match-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #ddd;
}

.player {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.player-pic {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-bottom: 5px;
}

.player-name {
  font-weight: bold;
}

.score {
  font-size: 16px;
  font-weight: bold;
  margin-top: 5px;
}

.vs-section {
  text-align: center;
}

.vs-text {
  display: block;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.match-date {
  font-size: 12px;
  color: #6b7280;
}

.elo-change {
  font-size: 14px;
  margin-top: 5px;
}

.elo-gain {
  color: green;
}

.elo-loss {
  color: red;
}
</style>