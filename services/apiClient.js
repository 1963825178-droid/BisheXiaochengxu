const { API_BASE_URL } = require('../config/env');

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: options.timeout || 12000,
      header: Object.assign(
        {
          'content-type': 'application/json'
        },
        options.header || {}
      ),
      success(response) {
        const { statusCode, data } = response;
        if (statusCode >= 200 && statusCode < 300) {
          resolve(data);
          return;
        }

        reject({
          code: data && data.error && data.error.code ? data.error.code : 'HTTP_ERROR',
          message: data && data.error && data.error.message ? data.error.message : '请求失败，请稍后再试'
        });
      },
      fail() {
        reject({
          code: 'NETWORK_ERROR',
          message: '网络连接失败，请确认后端服务已启动'
        });
      }
    });
  });
}

function post(url, data, options) {
  return request(
    Object.assign({}, options, {
      url,
      method: 'POST',
      data
    })
  );
}

module.exports = {
  post,
  request
};
