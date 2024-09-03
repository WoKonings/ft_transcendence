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
        <div 
          v-for="(message, index) in selectedChat.messages" 
          :key="index" 
          :class="['message', { 'alternate-message': index % 2 === 0 }]"
        >
          <span>{{ message.sender }}:</span> {{ message.text }}
        </div>
      </div>

      <form @submit.prevent="sendMessage" class="input-container">
        <input v-model="newMessage" placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
      <button @click="joinNewChannel">Join New Channel</button>
      <button v-if="selectedChat.name !== 'General'" @click="leaveChat">Leave Chat</button>
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
    const message = { sender: currentUser.username, text: newMessage.value };
    selectedChat.value.messages.push(message);
    socket.emit('sendMessage', { senderId: currentUser.id, channel: selectedChat.value.name, message: newMessage.value });
    console.log(`sending: ${newMessage.value}`);
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
  if (selectedChat.value && selectedChat.value.name != 'General') {
    const channelName = selectedChat.value.name;
    socket.emit('leaveChannel', { channel: channelName, username: currentUser.username });
    
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
  height: 45%;
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
  padding: 8px;
  border-radius: 4px;
  background-color: #ffffff;
}

.alternate-message {
  background-color: #e0e0e0;
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

<!-- <template>
    <div class="chat-box">
      <div class="messages">
        <div class="message-container">
          < Add placeholder messages for demonstration >
          <div class="message">
            <div class="avatar">
              <img src="https://via.placeholder.com/40" alt="Avatar" />
            </div>
            <div class="content">
              <div class="username">User 1</div>
              <div class="text">Hello, how are you?</div>
            </div>
          </div>
          <div class="message">
            <div class="avatar">
              <img src="https://via.placeholder.com/40" alt="Avatar" />
            </div>
            <div class="content">
              <div class="username">User 2</div>
              <div class="text">I'm doing great, thanks for asking!</div>
            </div>
          </div>
        </div>
      </div>
      <div class="input-container">
        <form @submit.prevent="handleSubmit">
          <input v-model="text" placeholder="Type your message..." />
          <button type="submit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  const text = ref('');
  
  const handleSubmit = (event) => {
    event.preventDefault();
    console.log(text.value);
    text.value = '';
  };
  </script>
  
  <style scoped>
  .chat-box {
    position: relative;
    width: 100%;
    height: 400px;
    border: 1px solid #ccc;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .messages {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
  
  .message-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .message {
    display: flex;
    align-items: start;
    gap: 16px;
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
  }
  
  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .content {
    background-color: #f2f2f2;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
  }
  
  .username {
    font-weight: bold;
    margin-bottom: 4px;
  }
  
  .input-container {
    display: flex;
    padding: 8px 16px;
    background-color: #f2f2f2;
    border-top: 1px solid #ccc;
  }
  
  .input-container input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .input-container button {
    margin-left: 8px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .input-container button svg {
    width: 18px;
    height: 18px;
  }
  </style> -->