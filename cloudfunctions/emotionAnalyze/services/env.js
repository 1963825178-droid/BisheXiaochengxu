function readEnv(name, fallbackValue) {
  return process.env[name] || fallbackValue;
}

module.exports = {
  AI_PROVIDER: readEnv('AI_PROVIDER', 'deepseek'),
  DEEPSEEK_BASE_URL: readEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
  DEEPSEEK_API_KEY: readEnv('DEEPSEEK_API_KEY', ''),
  DEEPSEEK_MODEL: readEnv('DEEPSEEK_MODEL', 'deepseek-chat')
};
