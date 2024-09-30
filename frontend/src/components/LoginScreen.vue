<template>
  <div class="login-container">
    <div ref="mountRef" class="pong-animation"></div>
    <div class="pong-title">
      <img src="/ponglogo.png" alt="PONG" />
    </div>    
    <form class="login-form" @submit.prevent="loginUser">
      <button type="submit" class="fancy-login-button">
        <img src="/42logo-trans.png" alt="Login Icon" />
        <span>Login</span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useStore } from 'vuex';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import router from '@/router/router';

const store = useStore();
const isLoggedIn = computed(() => store.state.isLoggedIn);

const mountRef = ref(null);
let scene, camera, renderer, composer;
let paddle1, paddle2, ball;
let animationFrameId;

const init = () => {
  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  mountRef.value.appendChild(renderer.domElement);

  // resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Camera position
  camera.position.z = 20;

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Paddles with white glow effect
  const paddleGeometry = new THREE.BoxGeometry(1, 4, 1);
  const paddleMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,              // White paddles
    emissive: 0xffffff,           // White glow
    emissiveIntensity: 0.6,       // Adjust glow intensity
    shininess: 100               // Glossy finish
  });
  paddle1 = new THREE.Mesh(paddleGeometry, paddleMaterial);
  paddle2 = new THREE.Mesh(paddleGeometry, paddleMaterial);
  paddle1.position.x = -14;
  paddle2.position.x = 14;
  scene.add(paddle1);
  scene.add(paddle2);

  // Ball
  const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  // const ballMaterial = new THREE.MeshPhongMaterial({
  //   color: 0xff00ff,
  //   emissive: 0x550055,
  //   emissiveIntensity: 0.5,
  //   shininess: 100
  // });
  ball = new THREE.Mesh(ballGeometry, paddleMaterial);
  scene.add(ball);

  const pointLight1 = new THREE.PointLight(0x00ffff, 0.5, 10); // Soft blue light
  pointLight1.position.set(-14, 0, 0);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x00ffff, 0.5, 10); // Soft blue light
  pointLight2.position.set(14, 0, 0);
  scene.add(pointLight2);

  // Lighting
  // const ambientLight = new THREE.AmbientLight(0x404040);
  // scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);
};

const animate = () => {
  animationFrameId = requestAnimationFrame(animate);

  // Animate ball
  ball.position.x = Math.sin(Date.now() * 0.002) * 13;
  ball.position.y = Math.cos(Date.now() * 0.003) * 9;

  // Animate paddles
  paddle1.position.y = Math.sin(Date.now() * 0.001) * 8;
  paddle2.position.y = Math.sin(Date.now() * 0.001 + Math.PI) * 8;

  renderer.render(scene, camera);
};

onMounted(() => {
  if (isLoggedIn.value == true) {
    console.log('ALREADY LGOGGEGED IN !');
    router.push('/');
  } else {
    console.log(`loginstatus: ${isLoggedIn.value}`)
  }
  init();
  handleCallback();
  animate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
  if (mountRef.value) {
    mountRef.value.removeChild(renderer.domElement);
  }
});

//todo: switch logic
const loginUser = async () => {
  console.log('Login clicked');
  window.location.href = 'http://localhost:3000/auth/42';
  // router.push('/')
};

const handleCallback = async () => {
  const route = router.currentRoute.value;
  const token = route.query.token;

  if (token) {
    localStorage.setItem('access_token', token);

    if (route.path === '/choose-username') {
      // isCompleteProfileNeeded.value = true;
    } else {
      console.log('should be logging in');
      // Clear query params from the URL without reloading the page
      router.replace({ path: route.path, query: {} });
      router.push('/');
      // fetchMe();
      // initializeSocket();
    }
  } else {
    // isCompleteProfileNeeded.value = false;
  }
};
</script>

<style scoped>
.login-container {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: black;
  overflow: hidden;
}

.pong-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Existing styles for .pong-title, .login-form, and .fancy-login-button */
.login-form {
  position: relative; /* Add this to allow z-index to work */
  z-index: 2; /* Ensure it's above .pong-animation */
}

.fancy-login-button {
  display: flex;
  align-items: center;
  padding: 15px 30px;
  background-color: #fff;
  color: black;
  font-family: 'Micro5', monospace;
  font-size: 16px;
  border: 2px solid white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.fancy-login-button img {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.fancy-login-button:hover {
  background-color: black;
  color: white;
  border-color: white;
}

.fancy-login-button:hover img {
  filter: invert(1);
}
</style>