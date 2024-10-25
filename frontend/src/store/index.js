import { createStore } from 'vuex';

const store = createStore({
  state() {
    return {
      isLoggedIn: false,
      currentUser: null,
      socket: null,
      inQueue: false,
    };
  },
  mutations: {
    SET_USER(state, user) {
      state.isLoggedIn = true;
      state.currentUser = user;
    },
    LOGOUT_USER(state) {
      if (state.socket) {
        state.socket.disconnect();
      }
      state.currentUser = null;
      state.isLoggedIn = false;
      state.socket = null;
    },
    SET_SOCKET(state, socket) {
      state.socket = socket;
    },
  },
  actions: {
    logIn({ commit }, user) {
      commit('SET_USER', user);
    },
    logOut({ commit }) {
      commit('LOGOUT_USER');
    },
  },
});

export default store;