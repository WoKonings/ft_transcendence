<template>
  <div class="complete-user-container">
    <h2>Complete Your Profile</h2>
    <p>Please choose a username to finish setting up your account.</p>
    <form @submit.prevent="submitUsername">
      <input v-model="username" type="text" placeholder="Enter a username" required />
      <button type="submit">Submit</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { defineEmits } from 'vue';

const emit = defineEmits(['completeProfile']);
const username = ref('');
const error = ref('');

const submitUsername = () => {
  if (username.value.trim()) {
    // Emit an event to notify the parent about the chosen username
    emit('completeProfile', username.value);
  } else {
    error.value = 'Please enter a valid username.';
  }
};
</script>

<style scoped>
.complete-user-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 10px;
  width: 300px;
  margin: 50px auto;
}

input {
  padding: 10px;
  margin-bottom: 15px;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 5px;
}

button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>
