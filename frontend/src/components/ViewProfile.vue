<template>
    <div v-if="isVisible" class="profile-modal">
      <div class="modal-content">
        <button class="close-button" @click="closeProfile">
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
            class="feather feather-x"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="profile-header">
          <div class="profile-picture">
            <img
              :src="`https://robohash.org/${userProfile.username}?set=set4`"
              :alt="`${userProfile.username}'s profile picture`"
            />
          </div>
          <h2>{{ userProfile.username }}</h2>
        </div>
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else class="profile-info">
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">{{ userProfile.email }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Joined:</span>
            <span class="info-value">{{ new Date(userProfile.createdAt).toLocaleDateString() }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Games Played:</span>
            <span class="info-value">{{ userProfile.gamesPlayed }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Wins:</span>
            <span class="info-value">{{ userProfile.gamesWon }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Losses:</span>
            <span class="info-value">{{ userProfile.gamesPlayed - userProfile.gamesWon }}</span>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref } from 'vue';

  export default {
    name: 'ViewProfile',
    props: {
      selectedUser: {
        type: Object,
        required: true,
        default: null,
      },
      isVisible: {
        type: Boolean,
        default: false,
      },
    },
    setup(props, { emit }) {
      const userProfile = ref({});
      const loading = ref(false);
  
      const fetchUserProfile = async () => {
        if (!props.selectedUser) 
        {
          console.log('failed fething user or selected user');
          return;
        }
        loading.value = true;
        try {
          const response = await fetch(`http://localhost:3000/user/search/${props.selectedUser.username}`);
          console.log(`fething ${props.selectedUser.username}`)
          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }
          userProfile.value = await response.json();
        } catch (error) {
          console.error(error);
        } finally {
          loading.value = false;
        }
      };
  
      const closeProfile = () => {
        emit('close');
      };
  
      return { userProfile, loading, fetchUserProfile, closeProfile };
    },
    watch: {
      isVisible(newVal) {
        if (newVal) {
          this.fetchUserProfile();
        }
      },
    },
  };
  </script>
  
  <style scoped>
  .profile-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 400px;
    max-width: 90%;
    position: relative;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  
  .close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    transition: color 0.3s;
  }
  
  .close-button:hover {
    color: #1f2937;
  }
  
  .profile-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .profile-picture {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 10px;
  }
  
  .profile-picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .profile-info {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-gap: 10px 20px;
    font-size: 14px;
  }
  
  .info-row {
    display: flex;
    align-items: center;
  }
  
  .info-label {
    font-weight: 600;
    color: #4b5563;
    margin-right: 10px;
  }
  
  .info-value {
    color: #6b7280;
  }
  
  .loading {
    text-align: center;
    padding: 20px;
    color: #6b7280;
  }
  </style>