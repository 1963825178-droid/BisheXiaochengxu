const { AI_PROVIDER } = require('../config/env');
const stubProvider = require('./providers/stubProvider');
const openaiCompatibleProvider = require('./providers/openaiCompatibleProvider');

function getProvider() {
  if (AI_PROVIDER === 'openai-compatible') {
    return openaiCompatibleProvider;
  }
  return stubProvider;
}

async function analyze(rawInput) {
  return getProvider().analyze(rawInput);
}

module.exports = {
  analyze
};
