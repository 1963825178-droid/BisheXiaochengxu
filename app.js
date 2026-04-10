const { initializeStore } = require('./services/journalStore');

App({
  globalData: {
    appName: '关键词'
  },

  onLaunch() {
    initializeStore();
  }
});
