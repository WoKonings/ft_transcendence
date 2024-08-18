<template>
  <div class="user-settings">
    <h2>User Settings</h2>

    <div class="setting">
      <h3>Two-Factor Authentication (2FA)</h3>
      <button @click="toggle2FA">{{ is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA' }}</button>
    </div>

    <div class="setting">
      <h3>Upload Avatar</h3>
      <input type="file" @change="uploadAvatar" />
      <div v-if="avatarUrl">
        <h4>Current Avatar:</h4>
        <img :src="avatarUrl" alt="Avatar" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserSettings',
  data() {
    return {
      is2FAEnabled: false,
      avatarUrl: '',
    };
  },
  methods: {
    toggle2FA() {
      this.is2FAEnabled = !this.is2FAEnabled;
      // Add logic to enable/disable 2FA
      console.log(this.is2FAEnabled ? '2FA Enabled' : '2FA Disabled');
    },
    uploadAvatar(event) {
      const file = event.target.files[0];
      if (file) {
        // Handle avatar upload logic here
        this.avatarUrl = URL.createObjectURL(file);
        console.log('Avatar uploaded:', file.name);
      }
    },
  },
};
</script>

<style scoped>
.user-settings {
  background-color: #ecf0f1;
  padding: 20px;
  border-radius: 10px;
  width: 400px;
  margin: 0 auto;
  color: #34495e;
}

h2 {
  margin-bottom: 20px;
  text-align: center;
}

.setting {
  margin-bottom: 30px;
}

button {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #2980b9;
}

input[type="file"] {
  margin-top: 10px;
}

img {
  margin-top: 20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
