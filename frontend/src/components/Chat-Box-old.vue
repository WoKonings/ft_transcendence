<template>
  <div class="chat-box">
    <div class="chat-tabs">
      <div class="tabs">
        <div 
          v-for="(chat, index) in chats" 
          :key="index" 
          @click="selectChat(index)"
          :class="{ 'active-tab': selectedChatIndex === index }"
          class="tab"
        >
          {{ chat.name }}
        </div>
      </div>
    </div>

    <div class="messages">
      <div class="message-container">
        <div class="message" v-for="(message, index) in selectedChat.messages" :key="index">
          <div class="avatar">
            <img :src="message.avatarUrl" alt="Avatar" />
          </div>
          <div class="content">
            <div class="username">{{ message.sender }}</div>
            <div class="text">{{ message.text }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="play-pong-container">
      <button class="play-pong-button" @click="playPong">Play Pong</button>
    </div>

    <div class="input-container">
      <form @submit.prevent="sendMessage">
        <input v-model="text" placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  emits: ['send-message'],
  setup() {
    const text = ref('');
    const chats = ref([
      { name: 'General', messages: [{ sender: 'User1', text: 'Hello there!', avatarUrl: '/path/to/avatar1.png' }] },
      { name: 'John Doe', messages: [{ sender: 'John', text: 'Hi!', avatarUrl: '/path/to/avatar2.png' }] },
    ]);
    const selectedChatIndex = ref(0);

    const selectedChat = computed(() => chats.value[selectedChatIndex.value]);

    function selectChat(index) {
      selectedChatIndex.value = index;
    }

    function sendMessage() {
      if (text.value.trim() !== '') {
        selectedChat.value.messages.push({ sender: 'You', text: text.value, avatarUrl: '/path/to/your-avatar.png' });
        text.value = '';
      }
    }

    function playPong() {
      // Handle Play Pong action
      alert("Play Pong button clicked!");
    }

    return {
      text,
      chats,
      selectedChatIndex,
      selectedChat,
      selectChat,
      sendMessage,
      playPong,
    };
  },
};
</script>

<style scoped>
.chat-box {
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 100vh;
  background-color: #000;
  color: #fff;
  border: 1px solid #333;
  border-radius: 5px;
}

.chat-tabs {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #333;
}

.tabs {
  display: flex;
  flex-direction: row;
}

.tab {
  padding: 10px;
  cursor: pointer;
  color: #aaa;
}

.active-tab {
  font-weight: bold;
  border-bottom: 2px solid #fff;
  color: #fff;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.message-container {
  margin-bottom: 10px;
}

.message {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.avatar {
  width: 30px;
  height: 30px;
  margin-right: 10px;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.content {
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: bold;
  color: #fff;
}

.text {
  color: #ccc;
}

.play-pong-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
}

.play-pong-button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.play-pong-button:hover {
  background-color: #0056b3;
}

.input-container {
  border-top: 1px solid #333;
  padding: 10px;
  display: flex;
}

input {
  flex: 1;
  padding: 5px;
  border-radius: 3px;
  border: 1px solid #333;
  background-color: #222;
  color: #fff;
}

button {
  margin-left: 10px;
  padding: 5px 10px;
  border-radius: 3px;
  border: 1px solid #333;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
</style>
