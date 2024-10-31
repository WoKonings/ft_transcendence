<template>
  <div class="user-profile-badge" @click="goToProfile">
    <!-- <img :src="userProfilePicture" alt="User Avatar" class="profile-picture" /> -->
     <div class="profile-picture">
       <img :src="currentUser.avatar ? `http://localhost:3000${currentUser.avatar}` : `https://robohash.org/${currentUser.username}?set=set4`" :alt="`${currentUser.username}`" />
     </div>
    <span class="username">{{ currentUser.username }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();

const currentUser = computed(() => store.state.currentUser);

// Placeholder for profile picture; replace with real URL later
// const userProfilePicture = computed(() => store.state.currentUser.profilePicture || 'default-avatar.png');

const goToProfile = () => {
  router.push('/profile');
};
</script>

<style scoped>
.user-profile-badge {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #fff;
  background-color: #1a1a1a;
  padding: 8px;
  width: 100%;
  min-width: 200px;
  height: 4%;
  border-radius: 8px;
  box-shadow: 1px 1px 20px rgba(128, 40, 40, 0.829);
  transition: background-color 0.3s ease;
  margin-bottom: 20px;
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

.user-profile-badge:hover {
  background-color: #ddd;
}

.username {
  font-weight: bold;
  font-size: 16px;
  color: #fff;
}
</style>
