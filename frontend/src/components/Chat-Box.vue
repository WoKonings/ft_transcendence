<template>
    <div class="chat-box">
      <div class="messages">
        <div class="message-container">
          <!-- Add placeholder messages for demonstration -->
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
  </style>