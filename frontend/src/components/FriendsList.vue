<template>
  <div class="friends-list">
    <h2>Friends List</h2>
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
  </div>
</template>

<script>
export default {
  name: 'FriendsList',
  props: {
    friends: {
      type: Array,
      required: true,
    },
  },
  methods: {
    inviteToPlay(friend) {
      console.log('Inviting to play:', friend.name);
    },
    sendMessage(friend) {
      console.log('Sending message to:', friend.name);
    },
  },
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
</style>
