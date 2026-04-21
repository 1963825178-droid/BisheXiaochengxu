const { CLOUD_ENV_ID } = require('./utils/runtimeConfig');
const { initializeStore } = require('./services/journalStore');

App({
  globalData: {
    appName: '关键词',
    cloudEnvId: CLOUD_ENV_ID
  },

  onLaunch() {
    initializeStore();

    if (!wx.cloud) {
      console.warn('当前基础库不支持云开发能力，已跳过 wx.cloud.init');
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    });
  }
});
