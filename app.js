const { CLOUD_ENV_ID } = require('./utils/runtimeConfig');
const { initializeStore } = require('./services/journalStore');
const userService = require('./services/userService');

App({
  globalData: {
    appName: '\u5173\u952e\u8bcd',
    cloudEnvId: CLOUD_ENV_ID,
    currentUser: null
  },

  onLaunch() {
    initializeStore();

    if (!wx.cloud) {
      console.warn('wx.cloud is unavailable in the current base library');
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    });

    userService.bootstrapCurrentUser().then((user) => {
      this.globalData.currentUser = user;
    }).catch((error) => {
      console.warn('user bootstrap failed', error);
    });
  }
});
