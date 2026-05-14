# 关键词：情绪记录微信小程序

`关键词` 是一个面向情绪表达、情绪记录和个人回顾的微信小程序。用户输入一段当下感受后，小程序调用 AI 生成结构化情绪分析，并自动保存为云端情绪日记。用户可以在结果页查看分析，在详情页、日历页和统计页回看记录，也可以在账号页维护微信头像、昵称和本地记录迁移状态。

当前项目已经从本地原型推进到微信云开发主链路：前端页面、真实 AI 分析、云函数、云数据库、用户建档、头像昵称更新、日记自动保存、风险识别和本地备用后端都已接入。README 按截至 `2026-05-14` 的实际工作状态整理。

## 当前状态

| 项目 | 当前情况 |
| --- | --- |
| 小程序名称 | `关键词` |
| 微信开发者工具项目名 | `emotion-keyword-prototype` |
| AppID | `wx52b0aede8920c70d` |
| 云环境 ID | `cloud1-3gipf7cp7f184cc6` |
| 默认后端模式 | `wx-cloud` |
| 真实 AI Provider | DeepSeek 兼容接口 |
| 本地备用后端 | Express，默认 `http://127.0.0.1:3000` |
| 主要云数据库集合 | `users`、`journals` |
| 当前重点 | 云函数部署后复测真实模型风险判断、主链路真机验证 |

## 已完成功能

- 输入页：录入情绪文本，进入分析流程，展示最近云端日记入口。
- 结果页：调用真实分析，展示主情绪、子情绪、外文情绪词、情绪解析和建议。
- 自动保存：分析成功后自动写入云端 `journals` 集合，并防止重复保存。
- 详情页：读取单条云端日记，展示完整分析，支持软删除。
- 日历页：按月份读取记录，按日期回看日记。
- 统计页：读取本月统计，展示情绪分布和近期记录。
- 账号页：基于微信 `OPENID` 建档，支持头像、昵称、日记数量和本地旧记录迁移状态。
- 风险识别：已从“关键词直接高风险”改为语义优先的结构化判断，并补充他害高风险识别。
- 本地备用服务：保留 Express 后端，可用于调试 provider、prompt 和风险逻辑。

## 运行架构

```text
微信小程序前端
  |
  |-- services/emotionService.js
  |     |-- wx-cloud: 调用 emotionAnalyze 云函数
  |     |-- local-http: 调用本地 Express 后端
  |     `-- mock: 手动演示分析
  |
  |-- services/emotionEngine.js
  |     `-- 归一化 AI / mock / 云端返回结构
  |
  |-- services/journalCloudService.js
  |     `-- 调用 journalService 云函数
  |
  `-- services/userService.js
        |-- 调用 userBootstrap 云函数
        |-- 调用 userProfile 云函数
        `-- 上传头像到云存储

微信云开发
  |
  |-- emotionAnalyze: AI 情绪分析、结构归一化、riskGuard 安全阀
  |-- journalService: 日记创建、查询、统计、删除、本地迁移
  |-- userBootstrap: 用户建档、登录刷新、日记数统计
  |-- userProfile: 昵称和头像 fileID 更新
  |
  |-- 云数据库: users / journals
  `-- 云存储: user-avatars/

本地备用后端
  `-- server: Express + provider 抽象 + prompt + riskGuard
```

## 目录结构

```text
.
├── app.js                         # 小程序入口，初始化云开发和本地 store
├── app.json                       # 页面注册和窗口配置
├── app.wxss                       # 全局样式
├── project.config.json            # 微信开发者工具项目配置
├── utils/
│   ├── runtimeConfig.js           # 后端模式、云环境、本地 API 地址
│   └── time.js                    # 时间格式工具
├── services/
│   ├── emotionService.js          # 情绪分析统一入口
│   ├── emotionEngine.js           # 前端分析结果归一化
│   ├── mockEmotion.js             # 本地演示分析
│   ├── journalCloudService.js     # 云端日记服务封装
│   ├── journalStore.js            # pending 数据、本地旧记录迁移辅助
│   └── userService.js             # 用户建档、头像昵称、资料刷新
├── pages/
│   ├── input/                     # 输入页
│   ├── result/                    # 分析结果页
│   ├── detail/                    # 日记详情页
│   ├── calendar/                  # 日历页
│   ├── stats/                     # 统计页
│   └── account/                   # 账号页
├── cloudfunctions/
│   ├── emotionAnalyze/            # AI 分析云函数
│   ├── journalService/            # 日记业务云函数
│   ├── userBootstrap/             # 用户建档云函数
│   └── userProfile/               # 用户资料云函数
├── server/                        # 本地 Express 备用后端
├── tests/
│   └── riskGuard.test.js          # 风险识别回归测试
├── 工作交接-总览-2026-05-09.md
├── 开发日志-2026-04-22.md
├── 开发日志-2026-05-09.md
└── 开发日志-2026-05-14.md
```

## 情绪分析结果结构

分析结果统一归一化为以下结构，前端、云函数和本地后端都应保持兼容：

```json
{
  "rawInput": "用户原始输入",
  "mainEmotion": "委屈",
  "subEmotions": ["不甘", "疲惫"],
  "explanations": {
    "委屈": "你感到被评价或误解，同时又没有完全表达开的空间。"
  },
  "foreignEmotionWord": {
    "word": "litost",
    "language": "捷克语",
    "meaning": "一种被伤害后的委屈、羞恼与自怜混在一起的复杂感受。"
  },
  "analysis": "这段表达里有复杂的情绪拉扯。",
  "isNegative": true,
  "riskLevel": "none",
  "riskType": "none",
  "riskSignal": false,
  "riskReason": "没有出现明确风险信号。",
  "isHighRisk": false,
  "suggestion": "先把情绪放稳，再决定下一步要怎么做。",
  "source": "ai",
  "createdAt": "2026-05-14T00:00:00.000Z",
  "dateKey": "2026-05-14",
  "diaryText": "导出预留正文"
}
```

字段要点：

| 字段 | 说明 |
| --- | --- |
| `riskLevel` | `none`、`mild`、`medium`、`high` |
| `riskType` | `none`、`self_harm`、`harm_others`、`crisis`、`abuse` |
| `riskSignal` | 是否出现风险相关词、危险意象或攻击性表达 |
| `riskReason` | 一句话解释风险等级和类型的判断依据 |
| `isHighRisk` | 兼容旧前端逻辑；只有 `riskLevel === "high"` 时为 `true` |

## 风险识别机制

本项目不是医疗诊断工具，也不是心理治疗工具。风险识别只用于在明显高风险时切换为固定安全支持提示。

当前机制分三层：

1. `emotionPrompt` 要求 AI 以语义和上下文为主判断风险，而不是看到“死”“跳”等词就判高风险。
2. `normalizeEmotionResult` 负责补齐字段，并保证 `riskLevel === "high"` 时 `isHighRisk=true`，其他等级为 `false`。
3. `riskGuard` 作为安全阀，只对强风险模式强制 high；弱风险词只提升为 `mild` 或 `medium`，不直接触发高风险提示。

### 弱风险信号

中文网络语境中的口语化夸张表达不会直接判 high。例如：

| 输入 | 期望 |
| --- | --- |
| `加班加得我想死` | `riskLevel=mild`，`riskType=self_harm`，`isHighRisk=false` |
| `考试周真的想死，复习不完了` | `riskLevel=mild`，`riskType=self_harm`，`isHighRisk=false` |
| `这老师讲得啥啊，难懂得要死，要跳了` | `riskLevel=medium`，`riskType=self_harm`，`isHighRisk=false` |
| `听完我直接去死了` | `riskLevel=mild` 或 `medium`，`isHighRisk=false` |
| `这作业杀了我` | `riskLevel=none` 或 `mild`，`isHighRisk=false` |

这类文本可以有 `riskSignal=true`，表示出现了风险词或危险意象，但前端不展示高风险安全提示。

### 强自伤风险

当文本出现明确自伤/自杀意图、具体方法、具体时间、准备行为、告别表达或无法保证自身安全时，才强制：

```json
{
  "riskLevel": "high",
  "riskType": "self_harm",
  "riskSignal": true,
  "isHighRisk": true
}
```

示例：

- `我今晚想跳楼`
- `我药已经买好了，可能今晚就结束了`
- `我不能保证自己安全`

### 强他害风险

已经补充他害高风险识别。用户明确表示要杀害、伤害、殴打、报复某个对象时，也属于 high，不只自伤/自杀才算高风险。

示例：

- `我真想把你杀了，再有一次你就必须死在我手里`
- `你再这样我就弄死你`
- `我今晚去堵你，带刀找你算账`

命中强他害模式时强制：

```json
{
  "riskLevel": "high",
  "riskType": "harm_others",
  "riskSignal": true,
  "isHighRisk": true
}
```

此时 `suggestion` 会改为固定安全建议：先远离冲突对象、暂停继续发送攻击性信息、联系可信任的人或相关人员介入；如果担心自己会失控伤人，应立即寻求现实紧急帮助。

### 前端展示规则

- 只有 `riskLevel === "high"` 时，结果页和详情页才展示高风险样式和固定安全支持提示。
- `mild`、`medium` 只作为风险信号记录，不展示高风险提示。
- `isHighRisk` 只保留兼容作用，不作为新逻辑的主要判断来源。

## 关键配置

### 小程序运行模式

文件：`utils/runtimeConfig.js`

```js
const API_BASE_URL = 'http://127.0.0.1:3000';
const CLOUD_ENV_ID = 'cloud1-3gipf7cp7f184cc6';
const BACKEND_MODE = 'wx-cloud';
```

| 字段 | 说明 |
| --- | --- |
| `API_BASE_URL` | 本地 Express 调试地址 |
| `CLOUD_ENV_ID` | 微信云开发环境 ID |
| `BACKEND_MODE='wx-cloud'` | 默认正式链路，调用微信云函数 |
| `BACKEND_MODE='local-http'` | 调用本地 Express 后端 |
| `ALLOW_MOCK_DEMO=true` | 分析失败时允许用户手动使用演示分析 |
| `ANALYSIS_MODE='real-first'` | 产品语义上优先真实分析 |

### 模型和 provider 控制

云函数真实分析由 `cloudfunctions/emotionAnalyze/services/env.js` 和云函数环境变量控制：

```env
AI_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
```

说明：

- 云函数默认 `AI_PROVIDER=deepseek`。
- 云函数里 `AI_PROVIDER=stub` 时会走 stub provider；其他值默认走 DeepSeek provider。
- 接入模型主要通过 `DEEPSEEK_MODEL` 控制。
- 修改云函数代码或环境变量后，需要在微信开发者工具中重新部署 `emotionAnalyze`。

本地 Express 后端读取 `server/.env`：

```env
PORT=3000
AI_PROVIDER=stub
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
```

本地后端支持：

- `AI_PROVIDER=stub`
- `AI_PROVIDER=deepseek`
- `AI_PROVIDER=openai-compatible`

不要把真实 API Key 提交到仓库。

## 本地运行

### 导入小程序

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本仓库根目录。
4. AppID 使用 `project.config.json` 中的 `wx52b0aede8920c70d`，或替换为自己的 AppID。
5. 确认云函数根目录为 `cloudfunctions/`。
6. 确认 `utils/runtimeConfig.js` 中 `BACKEND_MODE` 为 `wx-cloud`。

### 启动本地备用后端

只有切到 `BACKEND_MODE='local-http'` 时才需要启动本地后端。

```bash
cd server
npm install
npm start
```

或双击：

```bat
start-backend.bat
```

接口：

```text
GET  http://127.0.0.1:3000/health
POST http://127.0.0.1:3000/api/emotion/analyze
```

请求示例：

```json
{
  "rawInput": "今天感觉很累，也有一点说不出来的委屈。"
}
```

## 云开发部署

### 必要集合

云数据库需要创建：

- `users`
- `journals`

建议集合权限保持：

```text
所有用户不可读写
```

原因是前端不直接读写数据库，所有数据读写都通过云函数，并由云函数使用微信 `OPENID` 控制归属。

### 云函数

| 云函数 | 职责 |
| --- | --- |
| `emotionAnalyze` | 调用 AI，归一化结果，执行风险安全阀 |
| `journalService` | 日记创建、最近列表、按月列表、详情、统计、删除、本地迁移 |
| `userBootstrap` | 用户建档、登录刷新、日记数统计 |
| `userProfile` | 更新昵称和头像 fileID |

在微信开发者工具中，对以下目录分别执行：

```text
创建并部署：云端安装依赖（不上传 node_modules）
```

需要部署：

- `cloudfunctions/emotionAnalyze`
- `cloudfunctions/journalService`
- `cloudfunctions/userBootstrap`
- `cloudfunctions/userProfile`

`emotionAnalyze` 修改了 prompt、provider、normalize 或 riskGuard 后，必须重新部署后才能在小程序真实链路生效。

## 云数据库字段

### `users`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `openid` | string | 微信用户唯一身份，返回前会脱敏 |
| `nickname` | string | 用户昵称 |
| `avatarUrl` | string | 头像持久化值，通常为云存储 fileID |
| `createdAt` | string | 创建时间 |
| `lastLoginAt` | string | 最近进入时间 |
| `localMigrationDone` | boolean | 本地旧记录是否已迁移 |
| `journalCount` | number | 当前未删除日记数量 |

### `journals`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `openid` | string | 数据所属用户 |
| `clientMigrationKey` | string | 本地旧记录迁移去重键 |
| `rawInput` | string | 用户原始输入 |
| `mainEmotion` | string | 主情绪 |
| `subEmotions` | string[] | 子情绪 |
| `explanations` | object | 情绪解释 |
| `foreignEmotionWord` | object/null | 更贴近的外文情绪词 |
| `analysis` | string | 情绪解析 |
| `suggestion` | string | 建议或固定安全支持提示 |
| `isNegative` | boolean | 是否偏负向 |
| `riskLevel` | string | 风险等级 |
| `riskType` | string | 风险类型 |
| `riskSignal` | boolean | 是否出现风险信号 |
| `riskReason` | string | 风险判断理由 |
| `isHighRisk` | boolean | 兼容旧字段，仅 high 为 true |
| `diaryText` | string | 导出预留正文 |
| `source` | string | `ai` 或 `mock` |
| `createdAt` | string | 创建时间 |
| `dateKey` | string | 日期键，格式 `YYYY-MM-DD` |
| `updatedAt` | string | 更新时间 |
| `isDeleted` | boolean | 是否软删除 |
| `deletedAt` | string | 删除时间 |

推荐索引：

- `users.openid`
- `journals.openid + clientMigrationKey`
- `journals.openid + isDeleted + createdAt`
- `journals.openid + isDeleted + dateKey`

## 云函数接口

### `emotionAnalyze`

```js
wx.cloud.callFunction({
  name: 'emotionAnalyze',
  data: { rawInput }
});
```

成功返回：

```json
{
  "ok": true,
  "data": {
    "mainEmotion": "委屈",
    "subEmotions": ["不甘", "疲惫"],
    "riskLevel": "none",
    "riskType": "none",
    "riskSignal": false,
    "riskReason": "没有出现明确风险信号。",
    "isHighRisk": false
  }
}
```

失败返回：

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "rawInput 不能为空"
  }
}
```

### `journalService`

统一使用 `action + payload`：

```js
wx.cloud.callFunction({
  name: 'journalService',
  data: {
    action: 'create',
    payload: {}
  }
});
```

支持：

| action | 说明 |
| --- | --- |
| `create` | 创建日记 |
| `recentList` | 查询最近日记 |
| `listByMonth` | 按月查询日记 |
| `detail` | 查询日记详情 |
| `statsByMonth` | 查询月度统计 |
| `delete` | 软删除日记 |
| `migrateLocal` | 迁移本地旧记录 |

### `userBootstrap`

```js
wx.cloud.callFunction({
  name: 'userBootstrap',
  data: {}
});
```

用于获取当前微信用户 `OPENID`、创建或刷新用户资料、统计有效日记数量。

### `userProfile`

```js
wx.cloud.callFunction({
  name: 'userProfile',
  data: {
    nickname,
    avatarUrl
  }
});
```

用于校验并保存昵称、头像 fileID，然后返回最新用户资料。

## 测试

当前已有风险识别回归测试：

```powershell
node tests\riskGuard.test.js
```

覆盖样例：

- `加班加得我想死` -> mild，非 high
- `这老师讲得啥啊，难懂得要死，要跳了` -> medium，非 high
- `我今晚想跳楼` -> high，self_harm
- `我真想把你杀了，再有一次你就必须死在我手里` -> high，harm_others
- `这作业杀了我` -> mild 或 none，非 high
- `论文要把我干死了` -> mild，非 high

最近一次验证结果：

```text
riskGuard tests passed
```

注意：这条测试验证本地 riskGuard 和前端归一化逻辑。云函数 `emotionAnalyze` 有同名风险逻辑，修改后仍需要部署到微信云开发并用真实模型复测。

## 验收清单

### 主链路

- [ ] 输入页可以输入情绪文字并进入结果页。
- [ ] 真实分析成功时展示主情绪、子情绪、外文情绪词、分析和建议。
- [ ] 分析成功后自动保存云端日记。
- [ ] 保存成功后可以进入详情页。
- [ ] 首页最近记录能看到新日记。
- [ ] 日历页能按日期看到新日记。
- [ ] 统计页能反映本月记录变化。

### 风险识别

- [ ] `加班加得我想死` 不展示高风险提示。
- [ ] `这老师讲得啥啊，难懂得要死，要跳了` 不展示高风险提示。
- [ ] `听完我直接去死了` 不展示高风险提示。
- [ ] `我今晚想跳楼` 展示自伤高风险固定支持提示。
- [ ] `我真想把你杀了，再有一次你就必须死在我手里` 展示他害高风险固定安全建议。
- [ ] 云函数真实 DeepSeek 链路与本地测试结论一致。

### 账号链路

- [ ] 首次进入账号页能自动建档。
- [ ] 有缓存时账号页先展示缓存资料。
- [ ] 云端刷新期间头像、昵称、同步按钮不可写。
- [ ] 点击头像可以选择并保存头像。
- [ ] 点击昵称框可以保存昵称。
- [ ] 退出重进后头像仍能显示。
- [ ] 头像临时 URL 失效时能回退到默认头像。
- [ ] 本地旧记录迁移功能可用。

### 云端配置

- [ ] 四个云函数均已部署。
- [ ] `users`、`journals` 集合存在。
- [ ] 集合权限为“所有用户不可读写”。
- [ ] 推荐索引已创建。
- [ ] `emotionAnalyze` 已配置 DeepSeek 环境变量。

## 常见问题

### 真实分析失败或超时

常见原因：

- DeepSeek 服务繁忙。
- 云函数超时。
- API Key 未配置或失效。
- 云函数环境变量未生效。

处理方式：

1. 检查 `emotionAnalyze` 云函数环境变量。
2. 检查 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_MODEL`。
3. 查看微信云函数日志。
4. 重新部署 `emotionAnalyze`。
5. 临时使用演示分析入口完成演示。

### 账号页提示 `FUNCTION_NOT_FOUND`

通常是 `userProfile` 未部署或函数名不匹配。重新部署 `cloudfunctions/userProfile` 后，清缓存并重新编译小程序。

### 头像显示 403 或加载失败

数据库中的 `users.avatarUrl` 应保存云存储 fileID，不应保存过期临时链接。前端会把 fileID 动态解析成 `avatarDisplayUrl`，失败时回退到默认圆形字母头像。

### 日记无法保存

按顺序检查：

1. `journalService` 是否已部署。
2. `journals` 集合是否存在。
3. 集合权限是否为“所有用户不可读写”。
4. 云函数日志中是否有 `OPENID_MISSING`、权限错误或索引错误。
5. 前端是否拿到了完整分析结果。

### 日历或统计页查不到记录

重点检查：

- `dateKey` 是否为 `YYYY-MM-DD`。
- `isDeleted` 是否为 `false`。
- 当前微信用户是否与记录 `openid` 一致。
- `openid + isDeleted + dateKey` 索引是否存在。

## 开发注意事项

- 不要让前端绕过云函数直接读写数据库，当前权限模型依赖云函数按 `OPENID` 控制数据。
- 不要把头像临时 URL 写回数据库，数据库应保存云存储 fileID。
- 不要在真实分析失败后静默保存 mock 结果，mock 只能作为用户手动选择的演示分析。
- 新增分析字段时，要同步检查 `services/emotionEngine.js`、`services/mockEmotion.js`、`cloudfunctions/emotionAnalyze`、`cloudfunctions/journalService`、结果页、详情页和统计页。
- `cloudfunctions/emotionAnalyze/services/riskGuard.js` 与 `server/src/services/riskGuard.js` 当前是两份实现，修改风险规则时需要保持一致。
- 修改云函数代码或环境变量后，必须重新部署对应云函数。

## 后续优先事项

1. 重新部署 `emotionAnalyze` 和 `journalService`，确保新增风险字段和日记字段在云端生效。
2. 用真实 DeepSeek 链路复测中文口语夸张、自伤强风险、他害强风险三类样例。
3. 完整跑通输入、分析、自动保存、详情、日历、统计主链路。
4. 真机验证头像、昵称、首次建档和本地旧记录迁移。
5. 为云函数补充更系统的日志和错误分类。
6. 根据毕业设计需要补充系统架构图、数据流图和测试截图。

## 相关文档

- `工作交接-总览-2026-05-09.md`
- `开发日志-2026-04-22.md`
- `开发日志-2026-05-09.md`
- `开发日志-2026-05-14.md`

建议阅读顺序：先读本 README 了解当前真实状态，再读交接总览。如果需要追溯具体开发过程，再看对应日期的开发日志。
