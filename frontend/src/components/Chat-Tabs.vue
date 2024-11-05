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
    <div class="user-list-window">
      <h3>Users in {{ selectedChat?.name || 'Chat' }}</h3>
      <div v-if="userListError" class="error-message">{{ userListError }}</div>
      <ul v-else>
        <li v-for="user in userList" :key="user.id" class="user-item">
          <span class="user-name">{{ user.username }}</span>
          <span class="user-status" :class="{ 'online': user.isOnline }"></span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated, watch } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const socket = store.state.socket;
const currentUser = store.state.currentUser;

const chats = ref([]);
const selectedChat = ref(null);
const newMessage = ref('');
const userList = ref([]);
const userListError = ref(null);

const fetchInitialChat = async () => {
  try {
    // Initialize with the General chat
    const generalChat = { name: 'General', messages: [], };
    chats.value.push(generalChat);
    selectedChat.value = generalChat;
    socket.emit('joinChannel', { channel: 'General', username: currentUser.username });
  } catch (error) {
    console.error('Failed to fetch initial chat:', error);
  }
};

const fetchUserList = async () => {
  if (!selectedChat.value) return;

  const chatname = selectedChat.value.name;
    // Construct the URL with query parameters
    try{
      socket.emit('allUsers', { chatname }, (response) => {
      const data = response.json();
      console.log(`error: ${data.message}`);
      if (data.success) {
      userList.value = Object.values(data.users);
      console.log(`userlist; ${userList.value}`);
      userListError.value = null; // Clear any previous errors
    } else {
      userListError.value = 'Failed to fetch user list';
    }
    });
    } catch (error) {

       console.error('Error fetching user list:', error);
       userListError.value = 'Error fetching user list';
    }

    // Check if the response is successful
};


const selectChat = (name) => {

  selectedChat.value = chats.value.find(chat => chat.name === name);
};

watch(() => selectedChat.value, (newChat) => {
  if (newChat) {
    fetchUserList();
  } else {
    userList.value = [];
    userListError.value = null;
  }
});

const sendMessage = () => {
  if (newMessage.value.trim() !== '' && selectedChat.value) {
    const message = { sender: currentUser.username, text: newMessage.value };
    
    // Push the new message to the selected chat
    selectedChat.value.messages.push(message);

    console.log(`Sending message to chat: ${selectedChat.value.name}`);
    
    socket.emit('sendMessage', {
      senderId: currentUser.id,
      channelName: selectedChat.value.name,
      message: newMessage.value,
    });
  
    newMessage.value = '';

    scrollToBottom();
  }
};

const joinNewChannel = async () => {
  try {
    const channelName = prompt("Enter Channel name to join:");
    if (!channelName) return;  // Check if a name was entered
    
     // Ask for a password
    
    // Send join channel request with the password if provided
    socket.emit('joinChannel', { channel: channelName, username: currentUser.username, password: null}, (response) => {
      if (response.success == true) {
        const newChat = { name: channelName, messages: [] };
        chats.value.push(newChat);
        selectChat(channelName);
        alert(response.message);
        fetchUserList();
      }
      else if (response.password)  {
        const password = prompt("Enter password");
        socket.emit('joinChannel', { channel: channelName, username: currentUser.username, password: password || null}, (response) => {
          if (response.success == true) {
            const newChat = { name: channelName, messages: [] };
            chats.value.push(newChat);
            selectChat(channelName);
            alert(response.message);
            fetchUserList();
          }
        });
      }
      else {
        alert(response.message);
      }
    });
  } 
  catch (error) {
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

  socket.on('updateUserList', () => {
    fetchUserList();
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

.user-list-window {
  width: 250px;
  background-color: #f1f1f1;
  padding: 10px;
  overflow-y: auto;
  border-left: 1px solid #ccc;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

.user-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ccc;
}

.user-status.online {
  background-color: #4CAF50;
}

.error-message {
  color: red;
}
</style>
