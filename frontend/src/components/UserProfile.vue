<template>
  <div class="user-profile-page">
    <!-- Action Buttons -->
    <div class="profile-actions">
      <button class="action-button" @click="changeUsername">Change Username</button>
      <button class="action-button" @click="changeAvatar">Change Avatar</button>
      <button class="action-button delete" @click="deleteAccount">Delete Account</button>
    </div>

    <!-- Profile Information Section -->
    <div class="profile-header">
      <div class="profile-picture">
        <img :src="`https://robohash.org/${currentUser.username}?set=set4`" :alt="`${currentUser.username}'s avatar`" />
      </div>
      <h2>{{ currentUser.username }}</h2>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="profile-info">
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">{{ currentUser.email }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Joined:</span>
        <span class="info-value">{{ new Date(currentUser.createdAt).toLocaleDateString() }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Games Played:</span>
        <span class="info-value">{{ currentUser.gamesPlayed }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Wins:</span>
        <span class="info-value">{{ currentUser.gamesWon }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Losses:</span>
        <span class="info-value">{{ currentUser.gamesPlayed - currentUser.gamesWon }}</span>
      </div>
    </div>

    <!-- Match History Section -->
    <div class="match-history" v-if="matchHistory.length">
      <h3>Match History</h3>
      <div class="match-history-content">
        <div v-for="match in matchHistory" :key="match.id" class="match-entry">
          <div class="player">
            <img
              :src="`https://robohash.org/${match.players[0].username}?set=set4`"
              :alt="`Player One - ${match.players[0].username}`"
              class="player-pic"
            />
            <div class="player-name">{{ match.players[0].username }}</div>
            <div class="score">{{ match.playerScores[0] }}</div>
          </div>
          <div class="vs-section">
            <span class="vs-text">VS</span>
            <span class="match-date">{{ new Date(match.startTime).toLocaleString() }}</span>
          </div>
          <div class="player">
            <img
              :src="`https://robohash.org/${match.players[1].username}?set=set4`"
              :alt="`Player Two - ${match.players[1].username}`"
              class="player-pic"
            />
            <div class="player-name">{{ match.players[1].username }}</div>
            <div class="score">{{ match.playerScores[1] }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const loading = ref(false);
const matchHistory = ref([]);

// Fetch the current user from Vuex
const currentUser = computed(() => store.state.currentUser);

// Function to handle username change
const changeUsername = async () => {
  const newUsername = prompt('Enter your new username:');
  if (newUsername) {
    try {
      const response = await fetch(`http://localhost:3000/user/update-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newUsername }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        store.commit('setCurrentUser', updatedUser); // Update Vuex store with the new username
        alert('Username updated successfully!');
      } else {
        throw new Error('Failed to update username');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      alert('An error occurred while updating your username.');
    }
  }
};

// Function to handle avatar change
const changeAvatar = async () => {
  const avatarUrl = prompt('Enter the URL of your new avatar:');
  if (avatarUrl) {
    try {
      const response = await fetch(`http://localhost:3000/user/update-avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        store.commit('setCurrentUser', updatedUser); // Update Vuex store with the new avatar
        alert('Avatar updated successfully!');
      } else {
        throw new Error('Failed to update avatar');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('An error occurred while updating your avatar.');
    }
  }
};

// Function to handle account deletion
const deleteAccount = async () => {
  const confirmation = confirm('Are you sure you want to delete your account? This action cannot be undone.');
  if (confirmation) {
    try {
      const response = await fetch(`http://localhost:3000/user/delete/${currentUser.value.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Account deleted successfully!');
        // Add any additional actions, such as logging the user out
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('An error occurred while deleting your account.');
    }
  }
};
</script>

<style scoped>
.user-profile-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.profile-actions {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 600px;
  margin-bottom: 20px;
}

.action-button {
  padding: 10px 20px;
  margin: 0 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.action-button:hover {
  background-color: #45a049;
}

.delete {
  background-color: #f44336;
}

.delete:hover {
  background-color: #d32f2f;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.profile-picture {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
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
</style>
