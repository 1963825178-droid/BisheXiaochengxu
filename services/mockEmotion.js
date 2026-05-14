const MOCK_STRONG_RISK_PATTERN = /准备自杀|打算自杀|决定自杀|计划自杀|今晚.*结束自己|今天.*结束自己|想跳楼|想跳河|想割腕|(?:今晚|今天|现在|马上|等会儿|一会儿|明天).{0,16}从.{0,8}(楼上|楼顶|天台|桥上|窗户|高处).{0,8}跳下去|(?:我|自己).{0,8}(?:想|要|准备|打算|决定|计划).{0,12}从.{0,8}(楼上|楼顶|天台|桥上|窗户|高处).{0,8}跳下去|买好了?药|药.{0,8}买好了?|买了安眠药|安眠药.{0,8}买了|写好了?遗书|遗书.{0,8}写好了?|永别了|这是我最后一次/;
const MOCK_HARM_OTHERS_STRONG_PATTERN = /(?:我)?(?:真|真的|现在|马上|等会儿|一会儿)?(?:想|要|准备|打算|决定|必须|一定要).{0,10}(?:把你|将你|对你).{0,8}(?:杀了|弄死|砍死|打死|废了)|杀了你|弄死你|砍死你|打死你|废了你|捅死你|宰了你|(?:你|他|她|这个人|那个人).{0,8}(?:必须|一定要|就该|该).{0,8}(?:死在我手里|被我弄死|被我杀了)|(?:再有一次|你再这样|你再|再敢|下次再).{0,18}(?:杀了你|弄死你|砍死你|打死你|废了你|死在我手里|必须死)/;
const MOCK_WEAK_RISK_PATTERN = /想死|去死了|直接去死|不想活|撑不下去|活着没意思|原地消失|要跳了|想跳了|真要跳了|难懂得要死|难懂的要死|难听得要死|难听的要死|累死了|烦死了|气死了|困死了|累死|烦死/;
const MOCK_WEAK_HARM_OTHERS_PATTERN = /杀了我|要把我干死|把我干死|把我干死了|干死我|气得想打人|想骂人|想揍人/;
const MOCK_EXAGGERATION_CONTEXT_PATTERN = /加班|工作|考试|考试周|作业|论文|毕设|bug|Bug|BUG|代码|改得|累得|忙得|烦得|太难|老师|课程|这课|听完|难懂|难听|拖|老登/;

const DEFAULT_TEMPLATE = {
  mainEmotion: '茫然',
  subEmotions: ['疲惫', '迟滞', '分心'],
  explanations: {
    '茫然': '你感觉自己在经历一些情绪波动，但还没有完全找到它的名字。',
    '疲惫': '这更像是一种被消耗后的迟缓，做事的启动成本变高了。',
    '迟滞': '你不是没有想法，而是暂时很难把状态切换到行动上。',
    '分心': '注意力容易飘走，常见于压力累积或情绪没有被说清的时候。'
  },
  analysis:
    '这段感受里最明显的是一种说不清的内耗。你未必正被单一事件困住，更像是被许多小压力慢慢拉低了能量。',
  foreignEmotionWord: {
    word: 'ennui',
    language: '法语',
    meaning: '一种说不清缘由的倦怠、空虚和兴趣减退感。'
  },
  isNegative: true,
  riskLevel: 'none',
  riskType: 'none',
  riskSignal: false,
  riskReason: '没有出现明确自伤意图、计划、方法、准备行为或告别表达。',
  suggestion:
    '先不要逼自己一次性把原因想清楚。也许可以从一件最小的动作开始，比如喝口水、离开屏幕两分钟。'
};

const TEMPLATES = [
  {
    keywords: ['领导', '批评', '委屈', '说了', '评价', '误解'],
    mainEmotion: '委屈',
    subEmotions: ['不甘', '疲惫', '困惑'],
    explanations: {
      '委屈': '你感到被评价或误解，同时又没有足够空间完整表达自己。',
      '不甘': '你知道事情本可以更好，所以心里会反复拉扯。',
      '疲惫': '这种拉扯会消耗很多注意力，让身体和情绪一起变沉。',
      '困惑': '你一边理解对方的立场，一边又不确定该怎样安放自己的感受。'
    },
    analysis:
      '你在这件事情里既感到被指出问题的不舒服，也隐约知道对方可能不全是错的，于是形成了一种复杂的委屈和内耗。',
    foreignEmotionWord: {
      word: 'lítost',
      language: '捷克语',
      meaning: '一种被伤害后的委屈、羞恼、自怜和不甘交织在一起的感受。'
    },
    isNegative: true,
    suggestion:
      '你现在的不舒服是可以理解的，不需要立刻把自己调整成“没事”。先把感受放稳，再决定要不要沟通。'
  },
  {
    keywords: ['提不起劲', '没意思', '空', '低落', '不想动', '无精打采'],
    mainEmotion: '低落',
    subEmotions: ['空心感', '无力', '迟缓'],
    explanations: {
      '低落': '你的情绪能量整体往下走，很多事情会失去原本的吸引力。',
      '空心感': '不是一定发生了坏事，而是心里像被抽掉了一块，难以连接到热情。',
      '无力': '你知道要做什么，却很难在当下提起行动的力气。',
      '迟缓': '情绪和身体像被放慢了一拍，连反应都变得更慢。'
    },
    analysis:
      '这更像是一种持续性的情绪走低，不一定有明确导火索，却会影响行动感和兴趣感。',
    foreignEmotionWord: {
      word: 'acedia',
      language: '拉丁语',
      meaning: '一种精神上的倦怠、提不起劲和与生活暂时断开连接的状态。'
    },
    isNegative: true,
    suggestion:
      '先别把目标放在“重新振作”，把它换成“让自己稍微好一点点”会更温和。'
  },
  {
    keywords: ['未来', '毕业', '选择', '迷茫', '方向', '怎么办'],
    mainEmotion: '迷茫',
    subEmotions: ['压力', '犹豫', '自我怀疑'],
    explanations: {
      '迷茫': '你正在面对不确定，却暂时看不见清晰的方向。',
      '压力': '选择越重要，心里承担的结果想象就越多。',
      '犹豫': '每个选项都像有代价，所以你很难轻松做决定。',
      '自我怀疑': '你会开始反复检视自己，担心能力或判断不够。'
    },
    analysis:
      '你现在更像是被“未来还没成形”的不确定感包围，所以压力和自我怀疑会一起冒出来。',
    foreignEmotionWord: {
      word: 'sehnsucht',
      language: '德语',
      meaning: '一种向往未知远方，同时又因尚未抵达而感到空落和焦灼的心情。'
    },
    isNegative: true,
    suggestion:
      '不必一下子选出终局答案。先把最近一周能推进的一小步列出来，会比一直卡在大方向里更容易缓解压力。'
  },
  {
    keywords: ['期待', '不安', '见面', '开始', '喜欢', '关系'],
    mainEmotion: '期待',
    subEmotions: ['不安', '心动', '谨慎'],
    explanations: {
      '期待': '你对接下来的事情有投入感，也愿意往前走一步。',
      '不安': '越在意，越容易担心结果不如预期。',
      '心动': '这份关系或变化对你来说是有吸引力和想象空间的。',
      '谨慎': '你并不是退缩，而是在努力保护自己不被轻易伤到。'
    },
    analysis:
      '这是一种很典型的混合情绪。你在向前靠近的同时，也担心自己投入后会失望，所以期待和不安会一起存在。',
    foreignEmotionWord: {
      word: 'forelsket',
      language: '挪威语',
      meaning: '一种刚开始喜欢某人时，兴奋、期待和紧张交织的微妙心动。'
    },
    isNegative: false,
    suggestion:
      '允许自己一边期待、一边保留分寸就好。你不需要逼自己现在就确定答案。'
  },
  {
    keywords: ['吵架', '生气', '火大', '烦', '争执', '冲突'],
    mainEmotion: '愤懑',
    subEmotions: ['受伤', '防御', '紧绷'],
    explanations: {
      '愤懑': '你不只是生气，更像是觉得边界被踩到了。',
      '受伤': '强烈情绪下面常常包着被忽视或被冒犯的不舒服。',
      '防御': '你会下意识绷起来，避免自己再被进一步影响。',
      '紧绷': '身体和情绪都处在随时准备应对的状态，难以放松。'
    },
    analysis:
      '这段情绪里最突出的不是单纯的火气，而是冲突带来的受伤和防御感。',
    foreignEmotionWord: {
      word: 'ressentiment',
      language: '法语',
      meaning: '一种被冒犯或压住后累积起来的怨愤、受伤和不平。'
    },
    isNegative: true,
    suggestion:
      '如果情绪还很高，可以先让自己离开争执现场一会儿。等身体不再那么绷，再决定要不要继续沟通。'
  }
];

function cloneExplanations(source) {
  const result = {};
  Object.keys(source).forEach((key) => {
    result[key] = source[key];
  });
  return result;
}

function findTemplate(text) {
  let bestMatch = DEFAULT_TEMPLATE;
  let bestScore = 0;

  TEMPLATES.forEach((template) => {
    const score = template.keywords.reduce((count, keyword) => {
      return count + (text.indexOf(keyword) > -1 ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestMatch = template;
      bestScore = score;
    }
  });

  return bestMatch;
}

function classifyMockRisk(text) {
  if (MOCK_HARM_OTHERS_STRONG_PATTERN.test(text)) {
    return {
      riskLevel: 'high',
      riskType: 'harm_others',
      riskSignal: true,
      riskReason: '表达中出现明确伤害他人的对象、威胁、条件式升级或致死表达。'
    };
  }

  if (MOCK_STRONG_RISK_PATTERN.test(text)) {
    return {
      riskLevel: 'high',
      riskType: 'self_harm',
      riskSignal: true,
      riskReason: '表达中出现明确自伤/自杀意图、方法、准备行为或告别表达。'
    };
  }

  if (MOCK_WEAK_RISK_PATTERN.test(text)) {
    const hasAmbiguousJump = /要跳了|想跳了|真要跳了/.test(text);
    return {
      riskLevel: hasAmbiguousJump ? 'medium' : MOCK_EXAGGERATION_CONTEXT_PATTERN.test(text) ? 'mild' : 'medium',
      riskType: 'self_harm',
      riskSignal: true,
      riskReason: '表达中有弱风险词，但语义上更接近压力宣泄或自怨自艾，没有明确计划、方法或准备行为。'
    };
  }

  if (MOCK_WEAK_HARM_OTHERS_PATTERN.test(text)) {
    return {
      riskLevel: 'mild',
      riskType: 'abuse',
      riskSignal: true,
      riskReason: '表达中出现攻击性或危险词，但没有明确伤害他人的对象、计划或真实意图。'
    };
  }

  return {
    riskLevel: 'none',
    riskType: 'none',
    riskSignal: false,
    riskReason: '没有出现明确自伤意图、计划、方法、准备行为或告别表达。'
  };
}

function buildResult(rawInput, template, extra) {
  const payload = Object.assign({}, template, extra || {});
  const riskLevel = payload.riskLevel || (payload.isHighRisk ? 'high' : 'none');
  const riskType = payload.riskType || (riskLevel === 'high' ? 'crisis' : 'none');
  return {
    rawInput,
    mainEmotion: payload.mainEmotion,
    subEmotions: payload.subEmotions.slice(),
    explanations: cloneExplanations(payload.explanations),
    foreignEmotionWord: payload.foreignEmotionWord || null,
    analysis: payload.analysis,
    isNegative: payload.isNegative,
    riskLevel,
    riskType,
    riskSignal: typeof payload.riskSignal === 'boolean' ? payload.riskSignal : riskLevel !== 'none',
    riskReason: payload.riskReason || '',
    isHighRisk: riskLevel === 'high',
    suggestion: payload.suggestion,
    source: payload.source || 'mock'
  };
}

function analyzeEmotionText(text) {
  const normalizedText = (text || '').trim();
  const risk = classifyMockRisk(normalizedText);

  if (risk.riskLevel === 'high') {
    return buildResult(normalizedText, {
      mainEmotion: risk.riskType === 'harm_others' ? '强烈愤怒' : '极度低落',
      subEmotions: risk.riskType === 'harm_others' ? ['报复冲动', '失控感', '敌意'] : ['失控感', '绝望', '孤立感'],
      explanations: {
        [risk.riskType === 'harm_others' ? '强烈愤怒' : '极度低落']: risk.riskType === 'harm_others' ? '这段表达里愤怒和攻击冲动已经很强，需要先拉开现实距离。' : '你现在的情绪负荷已经很重，单靠硬撑可能会越来越困难。',
        '报复冲动': '你把痛苦指向了具体对象，并出现了报复性表达。',
        '敌意': '语言里包含明确攻击和威胁，需要先停止升级。',
        '失控感': '很多事情像从手里滑出去，让你难以稳住自己。',
        '绝望': '你可能会觉得眼前没有出口，这种感受值得被认真对待。',
        '孤立感': '人在极端低落时，很容易觉得自己只能一个人扛。'
      },
      analysis:
        risk.riskType === 'harm_others'
          ? '这段表达包含明确伤害他人的威胁和升级信号，当前最重要的是让冲突降温，并尽快让现实中的第三方介入。'
          : '这段表达已经超出了普通的情绪波动，说明你正承受非常高的痛苦和压力。现在最重要的不是继续分析，而是尽快让自己回到有人能支持你的环境里。',
      isNegative: true,
      riskLevel: risk.riskLevel,
      riskType: risk.riskType,
      riskSignal: risk.riskSignal,
      riskReason: risk.riskReason,
      isHighRisk: risk.riskLevel === 'high',
      suggestion:
        risk.riskType === 'harm_others'
          ? '先尽量远离冲突对象，暂停继续发送攻击性信息。可以联系可信任的人、辅导员、家人、老师或相关人员帮助介入。如果你担心自己会失控伤人，请立即寻求现实紧急帮助。'
          : '如果你已经有伤害自己的念头，请优先联系身边可信任的人陪着你，或尽快联系当地心理援助热线、医院急诊或紧急求助渠道。先确保自己不是一个人。',
      source: 'mock'
    });
  }

  return buildResult(normalizedText, findTemplate(normalizedText), risk);
}

module.exports = {
  analyzeEmotionText
};
