<template>
  <div class="user-profile-page" v-if="isLoggedIn == true">
    <!-- Action Buttons -->
    <div class="profile-actions">
      <button class="action-button" @click="goToDashboard">Go back</button>
      
      
      <button class="action-button" @click="changeUsername">Change Username</button>
      <!-- Updated Avatar Button -->
      <button class="action-button" @click="openFilePicker">Change Avatar</button>
      <input type="file" ref="fileInput" @change="uploadAvatar" accept="image/*" style="display:none" />
      <button v-if="!currentUser.twoFactorEnabled" class="action-button" @click="enableTwoFactor">Enable 2FA</button>
      <button v-else class="action-button delete" @click="disableTwoFactor">Disable 2FA</button>
      <button class="action-button delete" @click="deleteAccount">Delete Account</button>
    </div>

    <!-- QR Code Modal -->
    <div v-if="showQRCode" class="qr-code-modal">
      <h4>Scan this QR code with your authenticator app</h4>
      <img :src="qrCodeUrl" alt="2FA QR Code" />
      <input v-model="verificationCode" placeholder="Enter verification code" />
      <button class="action-button" @click="verifyAndEnableTwoFactor">Verify and Enable 2FA</button>
      <p v-if="twoFactorError" class="error-message">{{ twoFactorError }}</p> <!-- Display error -->
      <button class="action-button delete" @click="cancelTwoFactor">Cancel</button>
    </div>
    
    <!-- Profile Information Section -->
    <div class="profile-header" v-if="currentUser && currentUser.username">
      <div class="profile-picture">
        <img :src="currentUser.avatar ? `http://localhost:3000${currentUser.avatar}` : `https://robohash.org/${currentUser.username}?set=set4`" :alt="`${currentUser.username}'s avatar`" />
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
        <span class="info-value">{{ new Date(userProfile.createdAt).toLocaleDateString() }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Games Played:</span>
        <!-- <span class="info-value">{{ currentUser.gamesPlayed }}</span> -->
        <span class="info-value">{{ matchHistory.length }}</span>
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
              v-if="match && match.players"
              :src="`https://robohash.org/${match.players[0].username}?set=set4`"
              :alt="`Player One - ${match.players[0].username}`"
              class="player-pic"
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
              :src="`https://robohash.org/${match.players[1].username}?set=set4`"
              :alt="`Player Two - ${match.players[1].username}`"
              class="player-pic"
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import router from '@/router/router';

const store = useStore();
const socket = computed(() => store.state.socket);
const currentUser = computed(() => store.state.currentUser);
const isLoggedIn = computed(() => store.state.isLoggedIn);
const userProfile = ref({});

const loading = ref(false);
const matchHistory = ref([]);

// 2fa vars //
const showQRCode = ref(false);
const qrCodeUrl = ref('');
const verificationCode = ref('');
const twoFactorError = ref(''); // Ref to track the error message


const goToDashboard = () => {
  router.push('/');
}

const enableTwoFactor = async () => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`http://localhost:3000/auth/2fa/generate`, {
        method: 'POST',
        token: verificationCode.value,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify({ newUsername }),
    });
    const data = await response.json()
    qrCodeUrl.value = data.qrCode;
    showQRCode.value = true;
  } catch (error) {
    console.error('Error generating 2FA:', error);
    // Handle error (e.g., show an error message to the user)
  }
}

const verifyAndEnableTwoFactor = async () => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`http://localhost:3000/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationCode.value }),
      });
    verificationCode.value = '';

    if (!response.ok)
    {
      console.error( 'failed to set 2FA');
      twoFactorError.value = 'Invalid 2FA code. Please try again.'
      return;
    }
    currentUser.value.twoFactorEnabled = true;
    showQRCode.value = false;
    twoFactorError.value = '';
    alert('2FA verified and enabled :D');
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    // Handle error (e.g., show an error message to the user)
  }
};

const disableTwoFactor = async () => {
  const confirmation = confirm('Are you sure you want to remove 2FA?');
  if (!confirmation) {
    console.log ('correct!');
    return;
  }

  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`http://localhost:3000/auth/2fa/disable`, {
        method: 'POST',
        token: verificationCode.value,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify({ newUsername }),
      });
    if (!response.ok)
      console.error( 'wtf bad');
    currentUser.value.twoFactorEnabled = false;
    console.log(response.json().message);
    alert('2FA has been removed');

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    // Handle error (e.g., show an error message to the user)
  }
};

const cancelTwoFactor = () => {
  showQRCode.value = false;
  verificationCode.value = '';
};


// Function to handle username change
const changeUsername = async () => {
  const newUsername = prompt('Enter your new username:');
  if (!newUsername) {
    return;
  }
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
};

const fileInput = ref(null);

const openFilePicker = () => {
  fileInput.value.click(); // Open file picker when clicking "Change Avatar" button
};

const uploadAvatar = async (event) => {
	const file = event.target.files[0]; // Get the selected file
  if (!file) {
    return;
  }
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Send the file to your backend
    const response = await fetch('http://localhost:3000/user/upload-avatar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: formData, id: currentUser.value.id
    });

    if (response.ok) {
      // const data = await response.json();
      alert('Avatar uploaded successfully!');

      // No need to manually commit or update currentUser directly.
      // The socket will handle this through 'userStatusUpdate'
    } else {
      alert('Failed to update avatar.');
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    alert('An error occurred while uploading your avatar.');
  }
};

// Function to handle account deletion
const deleteAccount = async () => {
  const confirmation = confirm('Are you sure you want to delete your account? This action cannot be undone.');
  if (!confirmation) {
    return;
  }
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
};

onMounted(async () => {
  if (!isLoggedIn.value) { 
    console.log ( "NOT LOG");
    router.push('/login');
    return;
  }
  console.log('current user!: ', currentUser.value);
  console.log('current username: ', currentUser.value.username);
  console.log('current avatar: ', currentUser.value.avatar);
  // loading.value = true;
  try {
    // Fetch the user profile
    const userResponse = await fetch(`http://localhost:3000/user/search/${currentUser.value.username}`);
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }
    userProfile.value = await userResponse.json();

    // Fetch the match history
    const matchResponse = await fetch(`http://localhost:3000/game/${currentUser.value.id}`);
    if (!matchResponse.ok) {
      console.log('failed to fetch match history');
      // throw new Error('Failed to fetch match history');
    }
    matchHistory.value = await matchResponse.json();
    matchHistory.value.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
    console.log ('fetched match history!: ', matchHistory);
    // loading.value = false
  } catch (error) {
    console.error(error);
  }

  socket.value.on('userStatusUpdate', (data) => {
    console.log('Received status update!');
		if (data.userId === currentUser.value.id) {
      if (data.avatar != null) {
        currentUser.value.avatar = data.avatar;
        console.log('Updated current user avatar:', data.avatar);
      }
		}
	});
});
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
  width: 20%;
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

/* 2fa */
.qr-code-modal {
  /* Style your modal here */
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.6); /* Lighter overlay */
  padding: 20px 40px;
  border-radius: 10px;
  color: white;
  font-size: 24px;
  text-align: center;
  box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000; /* Ensure it stays on top */
}
</style>
