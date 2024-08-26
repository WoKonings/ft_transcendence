<template>
  <div class="chat-container">
    <div class="chat-tabs">
      <div class="tabs">
        <div 
          v-for="(chat, index) in chats" 
          :key="index" 
          @click="selectChat(chat.name)" 
          :class="{ 'active-tab': selectedChat?.name === chat.name }" 
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

      <button @click="joinNewChannel">Join New Channel</button>
      <button @click="leaveChat">Leave Chat</button> <!-- New Leave Chat Button -->
    </div>
    <div v-else class="chat-box">
      <p>Select a chat to view messages.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const socket = store.state.socket;
const currentUser = store.state.currentUser;

const chats = ref([]);
const selectedChat = ref(null);
const newMessage = ref('');

const fetchInitialChat = async () => {
  try {
    // Initialize with the General chat
    const generalChat = { name: 'General', messages: [] };
    chats.value.push(generalChat);
    selectedChat.value = generalChat;
    socket.emit('joinChannel', { channel: 'General', username: currentUser.username });
  } catch (error) {
    console.error('Failed to fetch initial chat:', error);
  }
};

const selectChat = (name) => {
  selectedChat.value = chats.value.find(chat => chat.name === name);
};

const sendMessage = () => {
  if (newMessage.value.trim() !== '') {
    console.log (`sending: ${newMessage.value} to: ${selectedChat.value.name} from: ${currentUser.id}`);
    const message = { sender: 'You', text: newMessage.value };
    selectedChat.value.messages.push(message);
    socket.emit('sendMessage', { senderId: currentUser.id, channel: selectedChat.value.name, message: newMessage.value });
    newMessage.value = '';
    scrollToBottom();
  }
};

const joinNewChannel = async () => {
  try {
    const channelname = prompt("Enter Channel name to join:");
    if (!channelname) return;  // Check if a name was entered
    const newChat = { name: channelname, messages: [] };
    
    chats.value.push(newChat);
    socket.emit('joinChannel', { channel: channelname, username: currentUser.username, userId: currentUser.id });
    selectChat(channelname);  // Automatically select the newly joined chat
  } catch (error) {
    console.error('Failed to join new channel:', error);
  }
};

const leaveChat = () => {
  if (selectedChat.value) {
    const channelName = selectedChat.value.name;
    socket.emit('leave', { channel: channelName, userId: currentUser.id });
    
    // Remove the chat from the list
    chats.value = chats.value.filter(chat => chat.name !== channelName);
    
    // Select another chat or clear selection
    if (chats.value.length > 0) {
      selectedChat.value = chats.value[0];  // Select the first chat in the list
    } else {
      selectedChat.value = null;  // No chats left, clear selection
    }
  }
};

const scrollToBottom = () => {
  const messagesContainer = document.querySelector('.messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

onUpdated(() => {
  scrollToBottom();
});

onMounted(async () => {
  await fetchInitialChat();

  socket.on('recieveMessage', (message) => {
    console.log(`received: ${message.message} in channel: ${message.channel} from ${message.sender}`);
    const chat = chats.value.find(c => c.name === message.channel);
    if (chat) {
      chat.messages.push({ sender: message.sender, text: message.message });
    } else {
      // If the chat doesn't exist, create it
      const newChat = { name: message.channel, messages: [{ sender: message.sender, text: message.message }] };
      chats.value.push(newChat);
    }
    if (selectedChat.value.name === message.channel) {
      scrollToBottom();
    }
  });
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
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