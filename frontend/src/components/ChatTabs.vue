<template>
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
    <div class="chat-content">
      <div v-if="selectedChat">
        <h3>{{ selectedChat.name }}</h3>
        <div class="messages">
          <div v-for="(message, index) in selectedChat.messages" :key="index" class="message">
            <span>{{ message.sender }}:</span> {{ message.text }}
          </div>
        </div>
        <div class="input-container">
          <form @submit.prevent="sendMessage">
            <input v-model="newMessage" placeholder="Type a message..." />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
      <div v-else>
        <p>Select a chat to view messages.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      chats: [
        // Sample data for demonstration
        { name: 'General', messages: [{ sender: 'Alice', text: 'Hello!' }, { sender: 'Bob', text: 'Hi there!' }] },
        { name: 'John Doe', messages: [{ sender: 'John', text: 'Ready to play?' }, { sender: 'You', text: 'Yes!' }] },
      ],
      selectedChatIndex: 0,
      newMessage: '',
    };
  },
  computed: {
    selectedChat() {
      return this.chats[this.selectedChatIndex];
    },
  },
  methods: {
    selectChat(index) {
      this.selectedChatIndex = index;
    },
    sendMessage() {
      if (this.newMessage.trim() !== '') {
        this.selectedChat.messages.push({ sender: 'You', text: this.newMessage });
        this.newMessage = '';
      }
    },
  },
};
</script>

<style scoped>
.chat-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tabs {
  display: flex;
  background-color: #2c3e50;
  border-bottom: 2px solid #34495e;
}

.tab {
  padding: 10px 20px;
  cursor: pointer;
  color: white;
}

.tab:hover {
  background-color: #34495e;
}

.active-tab {
  background-color: #1abc9c;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #ecf0f1;
  overflow-y: auto;
}

.messages {
  flex: 1;
  margin-bottom: 20px;
  overflow-y: auto;
}

.message {
  margin-bottom: 10px;
}

.input-container {
  display: flex;
  align-items: center;
}

input {
  flex: 1;
  padding: 10px;
  margin-right: 10px;
  border: 1px solid #bdc3c7;
  border-radius: 5px;
  font-size: 14px;
}

button {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #2980b9;
}
</style>
