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
			<input v-model="loginDetails.username" type="username" placeholder="username" required />
			<input v-model="loginDetails.password" type="password" placeholder="Password" required />
			<button type="submit">Login</button>
		</form>

		<div v-if="isLoggedIn && currentUser">
			<h2>Welcome, {{ currentUser.username }}</h2>
			<!-- <p>Email: {{ currentUser.email }}</p> -->
			<button @click="logoutUser">Logout</button>
			<button @click="deleteAccount">Delete Account</button>
			<button @click="showGame = !showGame">
				{{ showGame ? 'Stop playing Pong' : 'Play Pong' }}
			</button>
		</div>

		<PongGame v-if="isLoggedIn && showGame" />

		<p v-if="error" style="color: red">{{ error }}</p>
	</div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import PongGame from './PongGame.vue'; // Ensure the path is correct

export default {
	name: 'HelloWorld',
	components: {
		PongGame
	},
	data() {
		return {
			message: 'User Authentication',
			newUser: {
				username: '',
				email: '',
				password: ''
			},
			loginDetails: {
				username: '',
				password: ''
			},
			currentUser: null,
			isLoggedIn: false,
			error: '',
			showGame: false,
		};
	},
	computed: {
		...mapState(['isLoggedIn', 'currentUser'])
	},
	methods: {
		...mapActions(['logIn', 'logOut']),
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
					localStorage.setItem('access_token', data.access_token);
					console.log(`Received access token: ${data.access_token}`)
					this.currentUser = data.user; //todo: think about whether this is safe or not
					this.isLoggedIn = true;
					// console.log(`password?: ${this.currentUser.password}`);
				})
				.catch(error => {
					console.error('Error logging in:', error);
					this.error = error.message;
				});
		},
		logoutUser() {
			localStorage.setItem('access_token', null); //maybe not needed
			this.currentUser = null;
			this.isLoggedIn = false;
		},
		deleteAccount() {
			this.error = '';
			fetch(`http://localhost:3000/user/${this.currentUser.id}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
					'Content-Type': 'application/json'
				}
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
