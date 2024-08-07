import { createStore } from 'vuex';

const store = createStore({
  state() {
    return {
      isLoggedIn: false,
      currentUser: null,
    };
  },
  mutations: {
    SET_USER(state, user) {
      state.isLoggedIn = true;
      state.currentUser = user;
    },
    LOGOUT_USER(state) {
      state.currentUser = null;
      state.isLoggedIn = false;
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