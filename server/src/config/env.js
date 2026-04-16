const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

function readEnv(name, fallbackValue) {
  return process.env[name] || fallbackValue;
}

module.exports = {
  PORT: Number(readEnv('PORT', 3000)),
  AI_PROVIDER: readEnv('AI_PROVIDER', 'stub'),
  AI_BASE_URL: readEnv('AI_BASE_URL', ''),
  AI_API_KEY: readEnv('AI_API_KEY', ''),
  AI_MODEL: readEnv('AI_MODEL', ''),
  DEEPSEEK_BASE_URL: readEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
  DEEPSEEK_API_KEY: readEnv('DEEPSEEK_API_KEY', ''),
  DEEPSEEK_MODEL: readEnv('DEEPSEEK_MODEL', 'deepseek-chat')
};