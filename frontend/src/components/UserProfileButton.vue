<template>
  <div class="user-profile-badge" @click="goToProfile">
    <img :src="userProfilePicture" alt="User Avatar" class="profile-picture" />
    <span class="username">{{ userProfile.username }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();

const userProfile = computed(() => store.state.currentUser);

// Placeholder for profile picture; replace with real URL later
const userProfilePicture = computed(() => store.state.currentUser.profilePicture || 'default-avatar.png');

const goToProfile = () => {
  router.push('/profile');
};
</script>

<style scoped>
.user-profile-badge {
  display: flex;
  align-items: center;
  cursor: pointer;
  background-color: #f4f4f4; /* Example background, adjust as per your theme */
  padding: 10px;
  width: 12%;
  border-radius: 10px;
  transition: background-color 0.3s ease;
  position: absolute; /* Absolute positioning */
  top: 20px; /* Adjust top spacing */
  right: 20px; /* Adjust right spacing */
}

.user-profile-badge:hover {
  background-color: #ddd;
}

.profile-picture {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.username {
  font-weight: bold;
  font-size: 16px;
  color: #333; /* Adjust to fit your theme */
}
</style>
