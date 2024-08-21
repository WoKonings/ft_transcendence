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
  </div>
</template>

<script>
export default {
  name: 'FriendsList',
  data() {
    return {
      friends: [],
      pendingFriendRequests: [], // Store for pending friend requests
      error: ''
    };
  },
  created() {
    this.fetchFriends();
    this.fetchPendingRequests(); // Fetch pending requests on load
    this.initializeSocketListeners(); // Initialize socket listeners on component creation
  },
  methods: {
    async fetchFriends() {
      this.error = '';
      const userId = this.$store.state.currentUser.id; // Assuming Vuex store contains currentUser
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
        this.friends = data; // Update the friends list
      } catch (err) {
        console.error('Error fetching friends:', err);
        this.error = err.message;
      }
    },
    async fetchPendingRequests() {
      this.error = '';
      const userId = this.$store.state.currentUser.id; // Assuming Vuex store contains currentUser
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
        this.pendingFriendRequests = data; // Update the pending requests list
      } catch (err) {
        console.error('Error fetching pending requests:', err);
        this.error = err.message;
      }
    },
    initializeSocketListeners() {
      const socket = this.$store.state.socket; // Access the socket from the Vuex store
      if (socket) {
        socket.on('newFriendRequest', (data) => {
          this.pendingFriendRequests.push(data);
          console.log('New friend request:', data);
        });
      }
    },
    viewPendingRequests() {
      console.log('Viewing pending friend requests:', this.pendingFriendRequests);
      // Add logic to view and handle pending friend requests
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
.friends-list {
  background-color: #34495e;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  color: white;
}

h2 {
  margin-bottom: 20px;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.friend-info {
  display: flex;
  align-items: center;
}

.friend-info img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 10px;
}

.actions button {
  background-color: #2ecc71;
  border: none;
  color: white;
  padding: 5px 10px;
  margin-left: 10px;
  border-radius: 5px;
  cursor: pointer;
}

.actions button:hover {
  background-color: #27ae60;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification {
  background-color: #e74c3c;
  border: none;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  margin-left: 10px;
}

.notification:hover {
  background-color: #c0392b;
}
</style>
