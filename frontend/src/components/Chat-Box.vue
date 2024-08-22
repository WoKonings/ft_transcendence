<template>
  <div class="chat-container">
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

    <div v-if="selectedChat" class="chat-box">
      <div class="messages" ref="messagesContainer">
        <div v-for="(message, index) in selectedChat.messages" :key="index" class="message">
          <span>{{ message.sender }}:</span> {{ message.text }}
        </div>
      </div>

      <form @submit.prevent="sendMessage" class="input-container">
        <input v-model="newMessage" placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
    </div>
    <div v-else class="chat-box">
      <p>Select a chat to view messages.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated } from 'vue';
import { useStore } from 'vuex';

// Dummy data for the example
const chats = ref([
  { name: 'Chat 1', messages: [{ sender: 'John', text: 'Hello!' }, { sender: 'You', text: 'Hi!' }] },
  { name: 'Chat 2', messages: [{ sender: 'Bob', text: 'Hey there!' }] },
  { name: 'Chat 3', messages: [{ sender: 'Alice', text: 'What\'s up?' }] }
]);

// import { ref, onMounted, onUnmounted } from 'vue';

const store = useStore();
const socket = store.state.socket;
const currentUser = store.state.currentUser;
const selectedChatIndex = ref(0);
const selectedChat = ref(chats.value[selectedChatIndex.value]);
const newMessage = ref('');

const selectChat = (index) => {
  selectedChatIndex.value = index;
  selectedChat.value = chats.value[index];
};

const sendMessage = () => {
  if (newMessage.value.trim() !== '') {
    selectedChat.value.messages.push({ sender: 'You', text: newMessage.value });
    console.log(`socket is : ${socket.id}`);
    socket.emit('sendMessage', { userId: currentUser.id, channelId: 1, message: newMessage.value });
    newMessage.value = '';
    scrollToBottom();
  }
};

const scrollToBottom = () => {
  const messagesContainer = document.querySelector('.messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// Ensure that the chat scrolls to the bottom when a new message is added
onUpdated(() => {
  scrollToBottom();
});

onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 30%;
}

.tabs {
  display: flex;
  width: 100%;
}

.tab {
  padding: 10px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active-tab {
  border-bottom: 2px solid white;
}

.chat-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f1f1f1;
}

.messages {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}

.message {
  margin-bottom: 10px;
}

.input-container {
  display: flex;
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #ccc;
}

input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 10px;
}

button {
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
</style>
