<template>
  <!-- HIGHLIGHT: Added v-if="isAuthenticated" to conditionally render the layout -->
  <div v-if="isAuthenticated">
    <!-- Your GameLayout content -->
    <h1>Welcome to the Game Layout</h1>
    <div class="game-layout">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="friends-list-container">
        <FriendsList />
      </div>
      <div class="chat-box-container">
        <ChatBox />
      </div>
    </div>

    <!-- Main Game Content -->
    <div class="main-content">
      <div class="center-container">
        <StatHistory class="stat-history" />
        <button class="play-pong">test</button>
      </div>
    </div>
  </div>
    <!-- Rest of the component -->
  </div>
  <!-- HIGHLIGHT: Added fallback message for unauthenticated users -->
  <div v-else>
    <p>Please log in to access the game.</p>
  </div>
</template>

<script>
import FriendsList from './FriendsList.vue';
import ChatBox from './ChatBox.vue'; 
import StatHistory from './StatHistory.vue'; 

export default {
  name: 'GameLayout',
  data() {
    return {
      isAuthenticated: false,
    }
  },
  components: {
    FriendsList,
    ChatBox,
    StatHistory,
  },
};
</script>

<style scoped>
/* Game Layout: Full-screen grid with a sidebar and main content area */
.game-layout {
  display: flex;
  height: 100vh; /* Full height of the viewport */
}

/* Sidebar: Occupies a fixed width on the left */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 300px; /* Example width of the sidebar */
  background-color: #111; /* Black background */
  color: #fff;
}

/* Friends List Container: Top half of the sidebar */
.friends-list-container {
  flex: 1; /* Occupies 50% of the height */
  overflow-y: auto; /* Allows scrolling if content overflows */
  border-bottom: 1px solid #333; /* Separates FriendsList and ChatBox visually */
}

/* Chat Box Container: Bottom half of the sidebar */
.chat-box-container {
  flex: 1; /* Occupies 50% of the height */
  overflow-y: auto; /* Allows scrolling if content overflows */
}

/* Main Content: Centered game components */
.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000; /* Black background */
}

/* Center Container: Holds the StatHistory and Play Pong button */
.center-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Styling for StatHistory Component */
.stat-history {
  margin-bottom: 20px;
  color: white;
}

/* Styling for the Play Pong Button */
.play-pong {
  padding: 10px 20px;
  border: none;
  background-color: #007bff; /* Blue background */
  color: white;
  font-size: 16px;
  cursor: pointer;
  border-radius: 5px;
}

.play-pong:hover {
  background-color: #0056b3; /* Darker blue on hover */
}
</style>
