<template>
  <div class="chat-container">
    <!-- Sidebar with channels -->
    <div class="sidebar">
      <h2 class="sidebar-title">Channels</h2>
      <div class="chat-tabs">
        <div 
          v-for="(chat, index) in chats" 
          :key="index" 
          @click="selectChat(chat.name)" 
          :class="{ 'active-tab': selectedChat?.name === chat.name }" 
          class="tab"
        >
        {{ chat.isDM ? '@' : '#' }}{{ chat.name }}
        </div>
      </div>
      <button @click="joinNewChannel" class="join-button">
        <i class="fas fa-plus"></i> Join New Channel
      </button>
    </div>

    <!-- Main chat content -->
    <div class="main-content">
      <!-- Chat box for selected channel -->
      <div v-if="selectedChat" class="chat-box">
        <div class="chat-header">
          <h2>{{ selectedChat.isDM ? '@' : '#' }}{{ selectedChat.name }}</h2>
          <button v-if="selectedChat.name !== 'General'" @click="leaveChat" class="leave-button">
            {{ selectedChat.isDM ? 'Leave Chat' : 'Leave Channel' }}
          </button>
          <button v-if="currentRole === 'ADMIN'" @click="setPassword" class="set-password-button">
            Set Channel Password
          </button>
        </div>
        <div class="messages" ref="messagesContainer">
          <div 
            v-for="(message, index) in selectedChat.messages" 
            :key="index" 
            :class="['message', { 'current-user-message': message.sender === currentUser.username }]"
          >
            <div class="message-header">
              <span class="sender">{{ message.sender }}</span>
              <span class="timestamp">{{ formatTimestamp(message.timestamp) }}</span>
            </div>
            <div class="message-content">{{ message.text }}</div>
          </div>
        </div>

        <!-- Input form to send new message -->
        <form @submit.prevent="sendMessage" class="input-container">
          <input 
            v-model="newMessage" 
            placeholder="Type a message..."
          />
          <button type="submit" class="send-button">
            <i class="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>

      <div v-else class="empty-state">
        <p>Select a chat to view messages or join a new channel.</p>
      </div>
    </div>

    <!-- User list -->
    <div class="user-list-window">
      <h3>{{ selectedChat?.isDM ? 'Chat with' : 'Users in' }} {{ selectedChat?.name || 'Chat' }}</h3>
      <div v-if="userListError" class="error-message">{{ userListError }}</div>

      <!-- Single user list rendering -->
      <div v-else>
        <div 
          v-for="user in userList" 
          :key="user.id" 
          :class="['user-item', { 'admin-item': user.role === 'ADMIN' }]" 
          @contextmenu.prevent="openUserOptions(user, $event)"
        >
          <span class="profile-picture">
            <img 
              :src="user.avatar ? `http://localhost:3000${user.avatar}` : `https://robohash.org/${user.username}?set=set4`" 
              :alt="`${user.username}`" 
            />
          </span>
          <div class="status-indicator" :class="getStatusClass(user)"></div>
          <span class="user-name">{{ user.username }}</span>
        </div>
      </div>

      <!-- Modal for User Options (Assign Role, Kick) -->
      <div v-if="showUserOptions" class="user-options-modal" @click="closeUserOptions">
        <button v-if="currentRole === 'ADMIN'" @click="assignRole('ADMIN')">Assign Admin</button>
        <button v-if="currentRole === 'ADMIN'" @click="assignRole('MEMBER')">Assign User</button>
        <button v-if="currentRole === 'ADMIN'" @click="kickUser()">Kick from Channel</button>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted, onUpdated, watch, defineProps } from 'vue';
import { useStore } from 'vuex';

//to do: DMs , 
// handle disconnect; leave all channels
// socket parsing (every event)
// useroption modal position
// dms
// add private
// add owner - > aka; set the admin array[0] to the userId of the person who created it (in service?)

const store = useStore();
const socket = store.state.socket;
const currentUser = store.state.currentUser;
const chats = ref([]);
const selectedChat = ref(null);
const newMessage = ref('');
const userList = ref([]);
const userListError = ref(null);
const showUserOptions = ref(false);
// const modalPosition = ref({ x: 0, y: 0 });
const selectedUser = ref(null);
const currentRole = ref('MEMBER');

const props = defineProps({
  directMessage: {
    type: Object,
    default: () => (null)
  }
});

const openUserOptions = (user, event) => {
  selectedUser.value = user;
  event; //only here to remove error.
 // modalPosition.value = { x: event.clientX, y: event.clientY };
  console.log("Right-clicked user:", user); 
  console.log(`${currentUser.username} is ${currentRole.value}`);
  if (currentRole.value != "ADMIN") {
    return;
  }
  showUserOptions.value = true;
  console.log("Modal should be visible:", showUserOptions.value);
};

const closeUserOptions = () => {
  showUserOptions.value = false;
}

const assignRole = (role) => {
  console.log(`assigning ${selectedUser.value.username} to ${role} in ${selectedChat.value.name}`)
  if (selectedUser.value) {
    socket.emit('updateUserRole', {
      channelName: selectedChat.value.name,
      userId: selectedUser.value.id,
      role: role
    });
  }
  showUserOptions.value = false;

  console.log(`${selectedUser.value.username} is now ${role}.`);
};

const kickUser = () => {
  if (currentRole.value === 'ADMIN') {
    console.log(`kicking ${selectedUser.value.id} from ${selectedChat.value.name}`);
    socket.emit('kickUser', { channelName: selectedChat.value.name, userId: selectedUser.value.id }, (response) => {
      if (response.success) {
        console.log(response.message);
      } else {
        console.error('Failed to kick user:', response.error);
      }
    });
  } else {
    console.error('You do not have permission to kick users');
  }
};


document.addEventListener('click', (event) => {
  const modal = document.querySelector('.user-options-modal');
  if (!modal?.contains(event.target)) {
    showUserOptions.value = false;
  }
});

const fetchInitialChat = async () => {
  try {
    console.log(`fetching general for ${currentUser.username}`)
    const generalChat = { name: 'General', messages: [] };
    chats.value.push(generalChat);
    selectedChat.value = generalChat;
    socket.emit('joinChannel', { channelName: 'General', userId: currentUser.id, password: null });
  } catch (error) {
    console.error(`Failed to fetch initial chat for ${currentUser.username}`, error);
  }
};

console.log('Socket in chat:', socket);

const selectChat = (name) => {
  selectedChat.value = chats.value.find(chat => chat.name === name);
  const user = userList.value.find(user => user.username === currentUser.username);
  currentRole.value = user.role;
  if (!currentRole.value) {
    currentRole.value == "MEMBER";
  }
};

watch(() => selectedChat.value, (newChat) => {
  if (!newChat) {
    userList.value = [];
    userListError.value = null;
  }

  if (selectedChat.value.isDM) {
    socket.emit('getDMUserList', {
      userId: newChat.userId
    });
  } else {
    socket.emit('getUserList', {
      channel: newChat.name
    });
  }
});

watch(userList, (newUserList) => {
  try {
    // const oldRole = currentRole.value;
    const curUser = newUserList.find(user => user.username === currentUser.username);
    if (curUser) {
      currentRole.value = curUser.role;
    } else {
      currentRole.value = 'MEMBER'
    }
    //console.log(`${currentUser.username} 's role updated from ${oldRole} to ${currentRole.value}`);
  }
  catch(error){
    console.error('Failed to update userlist', error);
  }
});

watch(() => props.directMessage, (directMessage) => {
  if (directMessage) {
    if (!chats.value.find(chat => chat.id === directMessage.id));
      const directChat = { name: directMessage.username, isDM: true, userId: directMessage.id, messages: [] };
      console.log(`ya: ${directMessage.id}`);
      chats.value.push(directChat);
      socket.emit('getDMUserList', { userId: directChat.userId });
      selectChat(directChat.name);
      // Handle the direct message
      console.log('Received direct message:', newMessage);
      // You can add logic to display the direct message in your chat
  }
});

const setPassword = async () => {
  const password = prompt("Enter new password for this channel (leave blank for no password):");
  
  // Emit event to server to set the channel password
  socket.emit('setChannelPassword', {channelName: selectedChat.value.name, userId: currentUser.id, password: password || null }, (response) => {
    if (response.success) {
      alert(response.message);
    } else {
      alert(`Error setting password: ${response.message}`);
    }
  });
};


const sendMessage = () => {
  if (newMessage.value.trim() !== '' && selectedChat.value) {
    // const message = { 
    //   sender: currentUser.username, 
    //   text: newMessage.value,
    //   timestamp: new Date()
    // };


    // selectedChat.value.messages.push(message);

    if (selectedChat.value.isDM && selectedChat.value.userId) {
      socket.emit('directMessage', {
        targetId: selectedChat.value.userId,
        message: newMessage.value,
      });
      selectedChat.value.messages.push({
        sender: currentUser.username,
        text: newMessage.value,
        timestamp: new Date()
      });
      console.log(`DMing: ${newMessage.value}`);
    }
    else if (socket) {
      console.log(`sending message [${newMessage.value}] from ${currentUser.username}`);
      socket.emit('sendMessage', {
        senderId: currentUser.id,
        channelName: selectedChat.value.name,
        message: newMessage.value,
      });
    } else {
      console.error('Socket is not initialized.');
    }
    newMessage.value = '';
  }
}

const joinNewChannel = async () => {
  try {
    const channelName = prompt("Enter Channel name to join:");

    if (!channelName) return;
    console.log(`input: ${channelName}`);
    
    socket.emit('joinChannel', { channelName: channelName, userId: currentUser.id, password: null }, (response) => {
      console.log(response);
      if (response.success === true) {
        const newChat = { name: channelName, messages: [] };
        chats.value.push(newChat);
        selectChat(channelName);
        //alert(response.message);
        socket.emit('getUserList', { channel: channelName });
      } else if (response.success === false && response.passwordRequired) {
        const password = prompt("Enter password");
        socket.emit('submitPassword', { channelName: channelName, userId: currentUser.id, password: password }, (response) => {
          if (response.success === false) {
            alert("Wrong password");
            return;
          }
          console.log(`welcome to ${channelName}`);
          const newChat = { name: channelName, messages: [] };
          chats.value.push(newChat);
          selectChat(channelName);
          socket.emit('getUserList', { channel: channelName });
        })
      } else {
        alert(response.message);
      }
    });
  } catch (error) {
    console.error('Failed to join new channel:', error);
  }
};

const leaveChat = () => {
  //todo: refactor
  if (selectedChat.value && selectedChat.value.isDM == true){
    const channelName = selectedChat.value.name;
    console.log('leaving DM!: ', selectedChat.value.name);
    chats.value = chats.value.filter(chat => chat.name !== channelName);
    if (chats.value.length > 0) {
      selectedChat.value = chats.value[0];
    } else {
      selectedChat.value = null;
    }
    // userList.value = [];
  }
  if (selectedChat.value && selectedChat.value.name !== 'General') {
    const channelName = selectedChat.value.name;
    console.log(`leaving ${selectedChat.value.name}`);
    socket.emit('leaveChannel', { channelName: channelName });
    
    chats.value = chats.value.filter(chat => chat.name !== channelName);
    if (chats.value.length > 0) {
      selectedChat.value = chats.value[0];
    } else {
      selectedChat.value = null;
    }
    // Clear the user list after leaving
    userList.value = [];
  }
};

const scrollToBottom = () => {
  const messagesContainer = document.querySelector('.messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getStatusClass = (user) => {
  if (user.isInGame) return 'status-in-game';
  if (user.isInQueue) return 'status-in-queue';
  if (user.isOnline) return 'status-online';
  return 'status-offline';
};

onUpdated(() => {
  scrollToBottom();
});

onMounted(async () => {
  await fetchInitialChat();

  socket.on('receiveMessage', (message) => {
    console.log(`Message received in frontend:`, message);
    console.log('Available chats:', chats.value.map(c => c.name))
    console.log('looking for: ', message.channelName);
  // Find the chat (channel) that corresponds to the received message
  const chat = chats.value.find(c => c.name === message.channel);
  if (chat) {
    // Add the new message to the chat's message list
    console.log(`${chat.channelName} recieved ${message}`);
    chat.messages.push({
      sender: message.sender,
      text: message.message,
      timestamp: new Date()
    });
  }
  else
  {
    console.log(`chat is invalid`);
  }
  // Ensure selectedChat exists and matches the message channel
  if (selectedChat.value?.name === message.channel) {
    scrollToBottom();
  }
});
  socket.on('updateUserList', (userListData) => {
    userList.value = userListData;

    const currentUserInList= userList.value.find(user => user.id === currentUser.id)
    if (!currentUserInList || !currentUserInList.role) {
      currentRole.value = "MEMBER";
      return;
    }
    console.log(`currentuser Role ${currentUserInList.role}`);
    currentRole.value = currentUserInList.role;
  });

  socket.on('updateDMUserList', (userListData) => {
    console.log('updated user list!');
    userList.value = userListData;

    // const currentUserInList= userList.value.find(user => user.id === currentUser.id)
    // console.log(`currentuser Role ${currentUserInList.role}`);
    // currentRole.value = currentUserInList.role;
  });

  socket.on('directMessage', (data) => {
    console.log(`surely DM: ${data.userId}: ${data.message}`);
    const chat = chats.value.find(chat => chat.userId === data.userId);
    if (chat) {
      console.log('dm already exists');
      chat.messages.push({
        sender: data.name,
        text: data.message,
        timestamp: new Date()
      });
    } else {
      const directChat = { name: data.name, isDM: true, userId: data.userId, messages: [] };
      console.log(`new DM!: ${data.userId}`);
      directChat.messages.push({
        sender: data.name,
        text: data.message,
        timestamp: new Date()
      });
      chats.value.push(directChat);
    }


    // const currentUserInList= userList.value.find(user => user.id === currentUser.id)
    // console.log(`currentuser Role ${currentUserInList.role}`);
    // currentRole.value = currentUserInList.role;
  });


  socket.on('userStatusUpdate', (data) => {
    console.log(`USER STATUS UDPATE event called: User ${data.username}`);

    const user = userList.value.find((user) => user.id === data.id);
    if (user) {
      if (data.username != null)
          user.username = data.username;
        if (data.avatar != null)
          user.avatar = data.avatar;
    }

  });

  socket.on('userRoleUpdated', ({ username, newRole, message }) => {
    console.log(`userRoleUpdated event called: User ${username} role updated to ${newRole}`);

    const user = userList.value.find((user) => user.username === username);
    if (user) {
      user.role = newRole;
    }
    // selectedChat.value = chats.value.find(chat => chat.name === name);
    // const curUser = userList.value.find(user => user.username === currentUser.username);
    // currentRole.value = curUser.role;
    console.log(`${username} is now ${newRole}. ${message}`);


  });
  
  socket.on('userKicked', ({userId, channelName}) => {
    if (userId === currentUser.id && selectedChat.value.name === channelName) {
      chats.value = chats.value.filter(chat => chat.name !== channelName);
      if (chats.value.length > 0) {
        selectedChat.value = chats.value[0];
      } else {
        selectedChat.value = null;
      }
    userList.value = [];
    // alert('You have been removed from this channel.');
    } else {
    // Update the user list for other users still in the channel
    userList.value = userList.value.filter(user => user.id !== userId);
    }
  });

//   socket.on('restoreChannels', (channels) => {
//   console.log('Restoring channels:', channels);
  
//   // Clear existing channels and populate with restored channels
//   chats.value = channels.map(channel => ({
//     name: channel.name,
//     messages: channel.messages || [],
//   }));

//   // Auto-select the first chat or keep the previously selected chat if it exists
//   const previouslySelectedChat = selectedChat.value;
//   if (previouslySelectedChat && channels.some(c => c.name === previouslySelectedChat.name)) {
//     selectedChat.value = chats.value.find(chat => chat.name === previouslySelectedChat.name);
//   } else {
//     selectedChat.value = chats.value[0] || null;
//   }

//   // Fetch user list for selected chat if any
//   if (selectedChat.value) {
//     socket.emit('getUserList', { channel: selectedChat.value.name });
//   }

//   console.log('Restoring channels:', channels);

// });

});

</script>

<style scoped>
:root {
  height: 100%;
}

body {
  height: 100%;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chat-container {
  display: flex;
  width: 100%; /* Percentage of the parent width */
  height: 100%; /* 80% of the viewport height */
  font-family: Arial, sans-serif;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.sidebar {
  width: 25%; /* Percentage of the chat container width */
  background-color: #2c2c2c;
  color: #fff;
  padding: 2%;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  margin-bottom: 5%;
  font-size: 1.2em;
}

.chat-tabs {
  flex: 1;
  overflow-y: auto;
}

.tab {
  padding: 2.5%;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 2%;
  transition: background-color 0.3s;
  font-size: 0.9em;
}

.tab:hover {
  background-color: #3a3a3a;
}

.tab.active-tab {
  background-color: #4a4a4a;
}

.join-button {
  margin-top: 5%;
  padding: 2.5%;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 0.9em;
}

.join-button:hover {
  background-color: #45a049;
}

.main-content {
  display: flex;
  flex-direction: column;
  background-color: #1a1a1a;
  color: #fff;
  height: 100%;
  width: 50%;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2%;
  border-bottom: 1px solid #e0e0e0;
}

.chat-header h2 {
  font-size: 1.2em;
  margin: 0;
}

.leave-button {
  padding: 1% 2%;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 0.8em;
}

.leave-button:hover {
  background-color: #d32f2f;
}

.chat-box {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages {
  flex: 1;
  padding: 2%;
  overflow-y: auto; /* Enables scrolling when content overflows */
  max-height: calc(80vh - 100px);
}

.message {
  margin-bottom: 2%;
  padding: 1.5%;
  border-radius: 8px;
  max-width: 70%;
}

.current-user-message {
  background-color: #dcf8c6;
  align-self: flex-end;
  margin-left: auto;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1%;
  font-size: 0.8em;
}

.sender {
  font-weight: bold;
}

.timestamp {
  color: #888;
}

.message-content {
  word-break: break-word;
  font-size: 0.9em;
}

.input-container {
  display: flex;
  padding: 1%;

  border-top: 1px solid #e0e0e0;
}

input {
  flex: 1;
  padding: 1.5%;
  border: 1px solid #ccc;
  border-radius: 20px;
  font-size: 0.9em;
}

.send-button {
  padding: 1.5% 3%;
  background-color: #1e88e5;
  color: white;
  border: none;
  border-radius: 20px;
  margin-left: 2%;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 0.9em;
}

.send-button:hover {
  background-color: #1565c0;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1em;
  color: #888;
}

.user-list-window {
  width: 25%; /* Percentage of the chat container width */
  min-width: 40px; /* Minimum width to ensure readability */
  background-color: #2c2c2c;
  color: #fff;
  padding: 0.5%;
  overflow-y: auto;
  border-left: 1px solid #e0e0e0;
}

.user-list-window h3 {
  font-size: 1em;
  margin-top: 5px;
  margin-bottom: 10px;
}

/*.user-item {
  display: flex;
  align-items: center;
  padding: 2% 0;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s ease;
}

.user-item:hover {
  background-color: #f0f0f0;
}*/

.user-item {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 6px;
  border: 1px solid #ddd;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  border-radius: 10px;
  margin-bottom: 4px;
}

.user-item:hover {
  background-color: #e0e0e0;
  border-radius: 10px;
}

.user-item .user-name {
  margin-left: 10px;
  font-weight: bold;
  transition: color 0.2s ease;
}

.user-item:hover .user-name {
  color: #e47d29; /* Change text color on hover */
}

.admin-item {
	border: 2px solid #1e90ff;
	border-radius: 10px;
}

.admin-item:hover {
	background-color: #1e8fff5d;
	font-weight: bold;
}

.admin-item .user-name {
	color: #1e90ff;
	font-weight: bold;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  position: absolute;
  bottom: 5px;
  left: 35px;
}


.status-online {
  background-color: #4CAF50;
}

.status-offline {
  background-color: #9e9e9e;
}

.status-in-queue {
  background-color: #FFC107;
}

.status-in-game {
  background-color: #2196F3;
}


.user-status.online {
  background-color: #4CAF50;
}

.error-message {
  color: #f44336;
  margin-top: 5%;
  font-size: 0.8em;
}

/* Media query for smaller screens */
@media (max-width: 768px) {
  .chat-container {
    width: 95%;
    height: 90vh;
  }

  .sidebar, .user-list-window {
    min-width: 100px;
  }

  .sidebar-title, .chat-header h2 {
    font-size: 1em;
  }

  .tab, .join-button, .send-button, input {
    font-size: 0.8em;
  }
}

.profile-picture {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	margin-right: 10px;
	overflow: hidden;
}

.profile-picture img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

/* Modal CSS */
.user-options-modal {
  position: fixed; /* Change to fixed for centering */
  top: 50%; /* Center vertically */
  left: 50%; /* Center horizontally */
  transform: translate(-50%, -50%); /* Adjust for its own dimensions */
  background-color: white;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 8000;
  width: 200px; /* Optional: Set a width for the modal */
  display: block;
}
.user-options-modal button {
  display: block;
  width: 100%;
  padding: 8px;
  border: none;
  background: #007bff;
  color: white;
  margin-bottom: 5px;
  border-radius: 4px;
  cursor: pointer;
}

.user-options-modal button:hover {
  background-color: #0056b3;
}

.profile-picture img {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.user-status.online {
  background-color: green;
  border-radius: 50%;
  width: 10px;
  height: 10px;
  margin-right: 8px;
}

.user-name {
  margin-left: 10px;
}
</style>

