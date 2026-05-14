const assert = require('assert');
const { applyRiskGuard } = require('../server/src/services/riskGuard');
const { normalizeEmotionResult } = require('../services/emotionEngine');

function guarded(rawInput) {
  return applyRiskGuard({
    rawInput,
    mainEmotion: '茫然',
    subEmotions: [],
    explanations: {},
    analysis: '测试',
    isNegative: true,
    riskLevel: 'none',
    riskType: 'none',
    riskSignal: false,
    riskReason: '',
    isHighRisk: false,
    suggestion: '普通建议'
  });
}

function assertRisk(rawInput, expected) {
  const result = guarded(rawInput);

  Object.keys(expected).forEach((key) => {
    assert.strictEqual(
      result[key],
      expected[key],
      `${rawInput} expected ${key}=${expected[key]}, got ${result[key]}`
    );
  });

  return result;
}

assertRisk('加班加得我想死', {
  riskLevel: 'mild',
  riskType: 'self_harm',
  riskSignal: true,
  isHighRisk: false
});

assertRisk('这老师讲得啥啊，难懂得要死，要跳了', {
  riskLevel: 'medium',
  riskType: 'self_harm',
  riskSignal: true,
  isHighRisk: false
});

assertRisk('我今晚想跳楼', {
  riskLevel: 'high',
  riskType: 'self_harm',
  riskSignal: true,
  isHighRisk: true
});

const harmOthers = assertRisk('我真想把你杀了，再有一次你就必须死在我手里', {
  riskLevel: 'high',
  riskType: 'harm_others',
  riskSignal: true,
  isHighRisk: true
});

assert(
  /远离冲突对象|暂停继续发送攻击性信息/.test(harmOthers.suggestion),
  'harm_others high risk should use fixed safety suggestion'
);

assertRisk('这作业杀了我', {
  riskLevel: 'mild',
  riskType: 'abuse',
  riskSignal: true,
  isHighRisk: false
});

assertRisk('论文要把我干死了', {
  riskLevel: 'mild',
  riskType: 'abuse',
  riskSignal: true,
  isHighRisk: false
});

const normalized = normalizeEmotionResult(harmOthers, { defaultSource: 'test' });
assert.strictEqual(normalized.riskType, 'harm_others');
assert.strictEqual(normalized.isHighRisk, true);
assert(
  /远离冲突对象|暂停继续发送攻击性信息/.test(normalized.suggestion),
  'frontend normalization should keep fixed harm_others safety suggestion'
);

console.log('riskGuard tests passed');
