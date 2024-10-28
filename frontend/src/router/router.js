import { createRouter, createWebHistory } from 'vue-router';
import HelloWorld from '@/components/HelloWorld.vue';
import LoginScreen from '@/components/LoginScreen.vue';
import UserProfile from '@/components/UserProfile.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HelloWorld,
    meta: { title: 'PONG: Transcending'}
  },
  {
    path: '/profile',
    name: 'Profile',
    component: UserProfile,
    meta: { title: 'PONG: Profile'}
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginScreen,
    meta: { title: 'PONG: Login'}
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach((to) => {
  document.title = to.meta.title || 'ft_transcendence';
});

export default router;