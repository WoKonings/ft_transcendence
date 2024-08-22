<template>
  <div class="friends-list">
    <div class="header">
      <h2>Friends List</h2>
      <button v-if="pendingFriendRequests.length > 0" class="notification" @click="viewPendingRequests">
        {{ pendingFriendRequests.length }} Pending Requests
      </button>
    </div>
    <ul>
      <li v-for="friend in friends" :key="friend.id">
        <div class="friend-info">
          <img :src="friend.avatar" alt="Avatar" />
          <span>{{ friend.name }}</span>
        </div>
        <div class="actions">
          <button @click="inviteToPlay(friend)">Invite to Play</button>
          <button @click="sendMessage(friend)">Send Message</button>
        </div>
      </li>
    </ul>
    <p v-if="error" style="color: red">{{ error }}</p>

    <!-- Modal for viewing pending requests -->
    <div v-if="showPendingRequestsModal" class="modal">
      <div class="modal-content">
        <h3>Pending Friend Requests</h3>
        <ul>
          <li v-for="request in pendingFriendRequests" :key="request.id">
            <div class="request-info">
              <span>{{ request.name }}</span>
              <button @click="acceptRequest(request.id)">Accept</button>
              <button @click="declineRequest(request.id)">Decline</button>
            </div>
          </li>
        </ul>
        <button @click="closePendingRequests">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'FriendsList',
  data() {
    return {
      friends: [],
      pendingFriendRequests: [],
      error: '',
      showPendingRequestsModal: false,
    };
  },
  computed: {
    ...mapState(['currentUser', 'socket']),
  },
  created() {
    this.fetchFriends();
    this.fetchPendingRequests();
    this.initializeSocketListeners();
  },
  methods: {
    async fetchFriends() {
      this.error = '';
      const userId = this.currentUser.id;  
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
        this.friends = data;
      } catch (err) {
        console.error('Error fetching friends:', err);
        this.error = err.message;
      }
    },
    async fetchPendingRequests() {
      this.error = '';
      const userId = this.currentUser.id;
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
        this.pendingFriendRequests = data;
      } catch (err) {
        console.error('Error fetching pending requests:', err);
        this.error = err.message;
      }
    },
    initializeSocketListeners() {
      if (this.socket) {
        this.socket.on('newFriendRequest', (data) => {
          this.pendingFriendRequests.push(data);
          console.log('New friend request:', data);
        });
      }
    },
    viewPendingRequests() {
      this.showPendingRequestsModal = true;
    },
    closePendingRequests() {
      this.showPendingRequestsModal = false;
    },
    async acceptRequest(requestId) {
      try {
        const response = await fetch(`http://localhost:3000/user/add`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetId: requestId, userId: this.currentUser.id })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error);
        }
        this.pendingFriendRequests = this.pendingFriendRequests.filter(r => r.id !== requestId);
        this.fetchFriends();
      } catch (err) {
        console.error('Error accepting request:', err);
        this.error = err.message;
      }
    },
    async declineRequest(requestId) {
      try {
        const response = await fetch(`http://localhost:3000/remove`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requestId })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error);
        }
        this.pendingFriendRequests = this.pendingFriendRequests.filter(r => r.id !== requestId);
      } catch (err) {
        console.error('Error declining request:', err);
        this.error = err.message;
      }
    },
    inviteToPlay(friend) {
      console.log('Inviting to play:', friend.name);
    },
    sendMessage(friend) {
      console.log('Sending message to:', friend.name);
    }
  }
};
</script>

<style scoped>
/* Existing styles */

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: #2c3e50;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  color: white;
}

.request-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.request-info button {
  background-color: #2ecc71;
  border: none;
  color: white;
  padding: 5px 10px;
  margin-left: 10px;
  border-radius: 5px;
  cursor: pointer;
}

.request-info button:hover {
  background-color: #27ae60;
}

.modal-content button {
  background-color: #e74c3c;
  border: none;
  color: white;
  padding: 5px 10px;
  margin-top: 10px;
  border-radius: 5px;
  cursor: pointer;
}

.modal-content button:hover {
  background-color: #c0392b;
}
</style>
