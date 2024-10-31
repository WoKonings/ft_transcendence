<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  background-color: #161616;
  /*tests*/
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100vh;
}

html, body {
  margin: 0; /* Remove default body margin */
  padding: 0; /* Remove default body padding */
  width: 100%; /* Ensure full width */
  height: 100%; /* Ensure full height */
  overflow: hidden; /* Prevent scrollbars */
}
</style>
