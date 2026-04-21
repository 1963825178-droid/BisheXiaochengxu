const HIGH_RISK_PATTERN = /自杀|自残|自伤|不想活|想死|结束自己|活着没意思|伤害自己|撑不下去/;

function applyRiskGuard(result) {
  const rawInput = result && result.rawInput ? result.rawInput : '';
  const keywordRisk = HIGH_RISK_PATTERN.test(rawInput);

  return Object.assign({}, result, {
    isHighRisk: Boolean(result && result.isHighRisk) || keywordRisk
  });
}

module.exports = {
  HIGH_RISK_PATTERN,
  applyRiskGuard
};
