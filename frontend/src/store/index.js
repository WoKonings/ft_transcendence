import { createStore } from 'vuex';

const store = createStore({
  state() {
    return {
      isLoggedIn: false,
      currentUser: null,
      socket: null,
      showGame: false,
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
    SET_SHOW_GAME(state, value) {
      state.showGame = value;
    }
  },
  actions: {
    logIn({ commit }, user) {
      commit('SET_USER', user);
    },
    logOut({ commit }) {
      commit('LOGOUT_USER');
    },
    toggleShowGame({ commit }, value) {
      commit('SET_SHOW_GAME', value);
    }
  },
});

export default store;