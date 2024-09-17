import { createRouter, createWebHistory } from 'vue-router';
import HelloWorld from '@/components/HelloWorld.vue';
import LoginScreen from '@/components/LoginScreen.vue';
import CompleteUser from '@/components/CompleteUser.vue';
import UserProfile from '@/components/UserProfile.vue';

const routes = [
	{
		path: '/',
		name: 'Home',
		component: HelloWorld,
	},
	{
		path: '/profile',
		name: 'Profile',
		component: UserProfile,  // Profile page
	},
  {
    path: '/login',
    name: 'Login',
    component: LoginScreen,
  },
  {
    path: '/choose-username',
    name: 'complete user',
    component: CompleteUser,
  },
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

export default router;