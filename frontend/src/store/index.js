import { createStore } from 'vuex';

const store = createStore({
  state() {
    return {
      isLoggedIn: false,
      currentUser: null,
    };
  },
  mutations: {
    setIsLoggedIn(state, isLoggedIn) {
      state.isLoggedIn = isLoggedIn;
    },
    setCurrentUser(state, user) {
      state.currentUser = user;
    },
  },
  actions: {
    logIn({ commit }, user) {
      commit('setIsLoggedIn', true);
      commit('setCurrentUser', user);
    },
    logOut({ commit }) {
      commit('setIsLoggedIn', false);
      commit('setCurrentUser', null);
    },
  },
});

export default store;