<template>
	<div>
		<h1>{{ message }}</h1>
		<form v-if="!isLoggedIn" @submit.prevent="createUser">
			<h2>Create Account</h2>
			<input v-model="newUser.username" placeholder="Username" required />
			<input v-model="newUser.email" placeholder="Email" required />
			<input v-model="newUser.password" type="password" placeholder="Password" required />
			<button type="submit">Create User</button>
		</form>

		<form v-if="!isLoggedIn" @submit.prevent="loginUser">
			<h2>Login</h2>
			<input v-model="loginDetails.email" placeholder="Email" required />
			<input v-model="loginDetails.password" type="password" placeholder="Password" required />
			<button type="submit">Login</button>
		</form>

		<div v-if="isLoggedIn">
			<h2>Welcome, {{ currentUser.username }}</h2>
			<p>Email: {{ currentUser.email }}</p>
			<button @click="logoutUser">Logout</button>
			<button @click="deleteAccount">Delete Account</button>
		</div>

		<p v-if="error" style="color: red">{{ error }}</p>
	</div>
</template>

<script>
export default {
	data() {
		return {
			message: 'User Authentication',
			newUser: {
				username: '',
				email: '',
				password: ''
			},
			loginDetails: {
				email: '',
				password: ''
			},
			currentUser: null,
			isLoggedIn: false,
			error: ''
		};
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
						return response.json().then(err => {
							throw new Error(err.error);
						});
					}
					return response.json();
				})
				.then(data => {
					this.currentUser = data;
					this.isLoggedIn = true;
				})
				.catch(error => {
					console.error('Error creating user:', error);
					this.error = error.message;
				});
		},
		loginUser() {
			this.error = '';
			fetch('http://localhost:3000/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(this.loginDetails)
			})
				.then(response => {
					if (!response.ok) {
						return response.json().then(err => {
							throw new Error(err.error);
						});
					}
					return response.json();
				})
				.then(data => {
					this.currentUser = data.user;
					this.isLoggedIn = true;
				})
				.catch(error => {
					console.error('Error logging in:', error);
					this.error = error.message;
				});
		},
		logoutUser() {
			this.currentUser = null;
			this.isLoggedIn = false;
		},
		deleteAccount() {
			this.error = '';
			fetch(`http://localhost:3000/user/${this.currentUser.id}`, {
				method: 'DELETE'
			})
				.then(response => {
					if (!response.ok) {
						return response.json().then(err => {
							throw new Error(err.error);
						});
					}
					this.logoutUser();
				})
				.catch(error => {
					console.error('Error deleting account:', error);
					this.error = error.message;
				});
		}
	}
};
</script>
