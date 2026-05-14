const RISK_LEVELS = ['none', 'mild', 'medium', 'high'];
const RISK_TYPES = ['none', 'self_harm', 'harm_others', 'crisis', 'abuse'];
const HARM_OTHERS_HIGH_RISK_SUGGESTION =
  '先尽量远离冲突对象，暂停继续发送攻击性信息。可以联系可信任的人、辅导员、家人、老师或相关人员帮助介入。如果担心自己会失控伤人，应立即寻求现实紧急帮助。';
const WEAK_RISK_PATTERN = /想死|去死了|直接去死|要跳了|想跳了|真要跳了|难懂得要死|难懂的要死|难听得要死|难听的要死|累死了|烦死了|气死了|困死了|累死|烦死|撑不下去|活着没意思|原地消失|不想活|不想存在|不想醒来/;
const WEAK_HARM_OTHERS_PATTERN = /杀了我|要把我干死|把我干死|把我干死了|干死我|气得想打人|想骂人|想揍人/;
const SELF_HARM_STRONG_PATTERNS = [
  /(?:今晚|今天|现在|马上|等会儿|一会儿|明天).{0,16}(?:想|要|准备|打算|决定|计划).{0,12}(?:自杀|轻生|结束生命|结束自己|跳楼|跳河|跳海|割腕|服药|吞药|吃药|上吊|烧炭|卧轨)/,
  /(?:想|要|准备|打算|决定|计划).{0,16}(?:自杀|轻生|结束生命|结束自己|跳楼|跳河|跳海|割腕|服药|吞药|吃药|上吊|烧炭|卧轨)/,
  /(?:今晚|今天|现在|马上|等会儿|一会儿|明天).{0,16}从.{0,8}(?:楼上|楼顶|天台|桥上|窗户|高处).{0,8}跳下去/,
  /(?:我|自己).{0,8}(?:想|要|准备|打算|决定|计划).{0,12}从.{0,8}(?:楼上|楼顶|天台|桥上|窗户|高处).{0,8}跳下去/,
  /(?:药|安眠药|刀|绳子|炭|遗书|告别信).{0,12}(?:买好|买了|准备好|备好|写好|写了)/,
  /(?:买好|买了|准备好|备好|写好|写了).{0,12}(?:药|安眠药|刀|绳子|炭|遗书|告别信)/,
  /(?:无法|不能).{0,8}保证.{0,4}(?:自己)?安全/,
  /(?:控制不住|怕自己).{0,12}(?:伤害自己|做傻事|自杀|轻生)/,
  /(?:永别了|下辈子见|这是我最后一次).{0,20}(?:不想继续|结束|活不下去)?/
];
const HARM_OTHERS_STRONG_PATTERNS = [
  /(?:我)?(?:真|真的|现在|马上|等会儿|一会儿)?(?:想|要|准备|打算|决定|必须|一定要).{0,10}(?:把你|将你|对你).{0,8}(?:杀了|弄死|砍死|打死|废了)/,
  /(?:杀了你|弄死你|砍死你|打死你|废了你|捅死你|宰了你)/,
  /(?:你|他|她|它|这个人|那个人).{0,8}(?:必须|一定要|就该|该).{0,8}(?:死在我手里|被我弄死|被我杀了)/,
  /(?:再有一次|你再这样|你再|再敢|下次再).{0,18}(?:杀了你|弄死你|砍死你|打死你|废了你|死在我手里|必须死)/,
  /(?:我).{0,12}(?:带刀|拿刀|拿棍|堵你|去堵|找你算账).{0,18}(?:杀|打|砍|弄死|废了)?/,
  /(?:今晚|今天|现在|马上|等会儿|一会儿|明天).{0,18}(?:去|要去|准备去|打算去).{0,12}(?:杀|打|砍|堵|弄死|废了)(?:你|他|她|这个人|那个人)/
];
const STRONG_RISK_PATTERNS = SELF_HARM_STRONG_PATTERNS.concat(HARM_OTHERS_STRONG_PATTERNS);

function normalizeRiskLevel(value, fallbackValue) {
  if (RISK_LEVELS.includes(value)) {
    return value;
  }

  return RISK_LEVELS.includes(fallbackValue) ? fallbackValue : 'none';
}

function normalizeRiskType(value, fallbackValue) {
  if (RISK_TYPES.includes(value)) {
    return value;
  }

  return RISK_TYPES.includes(fallbackValue) ? fallbackValue : 'none';
}

function hasStrongRiskSignal(text) {
  return STRONG_RISK_PATTERNS.some((pattern) => pattern.test(text));
}

function hasSelfHarmStrongSignal(text) {
  return SELF_HARM_STRONG_PATTERNS.some((pattern) => pattern.test(text));
}

function hasHarmOthersStrongSignal(text) {
  return HARM_OTHERS_STRONG_PATTERNS.some((pattern) => pattern.test(text));
}

function hasWeakRiskSignal(text) {
  return WEAK_RISK_PATTERN.test(text) || WEAK_HARM_OTHERS_PATTERN.test(text);
}

function resolveWeakRiskType(text) {
  if (WEAK_RISK_PATTERN.test(text)) {
    return 'self_harm';
  }

  if (WEAK_HARM_OTHERS_PATTERN.test(text)) {
    return 'abuse';
  }

  return 'none';
}

function hasAmbiguousJumpSignal(text) {
  return /要跳了|想跳了|真要跳了/.test(text);
}

function applyRiskGuard(result) {
  const rawInput = result && result.rawInput ? result.rawInput : '';
  const fallbackRiskLevel = result && result.isHighRisk ? 'high' : 'none';
  let riskLevel = normalizeRiskLevel(result && result.riskLevel, fallbackRiskLevel);
  let riskType = normalizeRiskType(result && result.riskType, riskLevel === 'high' ? 'crisis' : 'none');
  let riskSignal = Boolean(result && result.riskSignal);
  let riskReason = typeof (result && result.riskReason) === 'string'
    ? result.riskReason.trim()
    : '';
  const selfHarmStrong = hasSelfHarmStrongSignal(rawInput);
  const harmOthersStrong = hasHarmOthersStrongSignal(rawInput);
  const strongRisk = selfHarmStrong || harmOthersStrong;
  const weakRisk = hasWeakRiskSignal(rawInput);
  const ambiguousJump = hasAmbiguousJumpSignal(rawInput);

  if (riskLevel === 'high' || strongRisk) {
    riskLevel = 'high';
    riskSignal = true;
    if (harmOthersStrong) {
      riskType = 'harm_others';
    } else if (selfHarmStrong && riskType === 'none') {
      riskType = 'self_harm';
    } else if (riskType === 'none') {
      riskType = 'crisis';
    }
    if (!riskReason && strongRisk) {
      riskReason = harmOthersStrong
        ? '文本出现明确伤害他人的对象、威胁、条件式升级或致死表达，已按他害高风险处理。'
        : '文本出现明确自伤/自杀意图、具体方法、时间、准备行为、告别表达或无法保证安全的强风险信号。';
    }
  } else {
    if (weakRisk) {
      riskSignal = true;
      if (riskLevel === 'none') {
        riskLevel = ambiguousJump ? 'medium' : 'mild';
      }
      if (riskType === 'none') {
        riskType = resolveWeakRiskType(rawInput);
      }
      if (!riskReason) {
        riskReason = '文本出现风险相关词或危险意象，但缺少明确自伤意图、具体计划、方法、时间、准备行为或告别表达。';
      }
    } else if (riskLevel !== 'none') {
      riskSignal = true;
      if (riskType === 'none') {
        riskType = 'crisis';
      }
    }
  }

  return Object.assign({}, result, {
    riskLevel,
    riskType,
    riskSignal,
    riskReason,
    isHighRisk: riskLevel === 'high',
    suggestion: riskLevel === 'high' && riskType === 'harm_others'
      ? HARM_OTHERS_HIGH_RISK_SUGGESTION
      : result && result.suggestion
  });
}

module.exports = {
  RISK_LEVELS,
  RISK_TYPES,
  HARM_OTHERS_HIGH_RISK_SUGGESTION,
  WEAK_RISK_PATTERN,
  WEAK_HARM_OTHERS_PATTERN,
  SELF_HARM_STRONG_PATTERNS,
  HARM_OTHERS_STRONG_PATTERNS,
  STRONG_RISK_PATTERNS,
  normalizeRiskLevel,
  normalizeRiskType,
  hasStrongRiskSignal,
  hasSelfHarmStrongSignal,
  hasHarmOthersStrongSignal,
  hasWeakRiskSignal,
  hasAmbiguousJumpSignal,
  applyRiskGuard
};
