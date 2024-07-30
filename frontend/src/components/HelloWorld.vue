<template>
  <div>
    <h1>{{ message }}</h1>
    <form @submit.prevent="createUser">
      <input v-model="newUser.username" placeholder="Username" required>
      <input v-model="newUser.email" placeholder="Email" required>
      <input v-model="newUser.password" type="password" placeholder="Password" required>
      <button type="submit">Create User</button>
    </form>
    <div v-if="createdUser">
      <h2>Created User</h2>
      <p>ID: {{ createdUser.id }}</p>
      <p>Username: {{ createdUser.username }}</p>
      <p>Email: {{ createdUser.email }}</p>
    </div>
    <p v-if="error" style="color: red">{{ error }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Create a new user',
      newUser: {
        username: '',
        email: '',
        password: ''
      },
      createdUser: null,
      error: ''
    }
  },
  methods: {
    createUser() {
      this.error = '';
      fetch('http://localhost:3000/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.newUser)
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.error); });
        }
        return response.json();
      })
      .then(data => {
        this.createdUser = data;
      })
      .catch(error => {
        console.error('Error creating user:', error);
        this.error = error.message;
      });
    }
  }
}
</script>
