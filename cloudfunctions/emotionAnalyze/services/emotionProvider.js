const { AI_PROVIDER } = require('./env');
const stubProvider = require('./providers/stubProvider');
const deepseekProvider = require('./providers/deepseekProvider');

function getProvider() {
  if (AI_PROVIDER === 'stub') {
    return stubProvider;
  }

  return deepseekProvider;
}

async function analyze(rawInput) {
  return getProvider().analyze(rawInput);
}

module.exports = {
  analyze
};
