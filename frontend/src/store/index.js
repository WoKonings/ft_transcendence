import { createStore } from 'vuex';

const store = createStore({
  state() {
    return {
      isAuthenticated: false,  // State to track authentication status
      isLoggedIn: false,
      currentUser: null,
      socket: null,
    };
  },
  mutations: {
    login(state) {
      state.isAuthenticated = true;  // Mutation to set authentication to true
      state.isLoggedIn = true; // Set logged in status
    },
    logout(state) {
      state.isAuthenticated = false;  // Mutation to set authentication to false
      state.isLoggedIn = false; // Set logged out status
      if (state.socket) {
        state.socket.disconnect();
      }
      state.currentUser = null;
      state.socket = null;
    },
    SET_USER(state, user) {
      state.currentUser = user;
    },
    SET_SOCKET(state, socket) {
      state.socket = socket;
    }
  },
  getters: {
    isAuthenticated: (state) => state.isAuthenticated,
    isLoggedIn: (state) => state.isLoggedIn,
  },
  actions: {
    logIn({ commit }, user) {
      commit('SET_USER', user);
      commit('login'); // Call login mutation
    },
    logOut({ commit }) {
      commit('logout'); // Call logout mutation
    },
  },
});

export default store;