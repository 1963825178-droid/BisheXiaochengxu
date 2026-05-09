# 关键词：情绪记录微信小程序

`关键词` 是一个面向心理/情绪记录场景的微信小程序。用户输入一段当下的情绪文字后，小程序会调用云函数进行 AI 情绪分析，并把结果自动保存为云端情绪日记。用户可以在结果页查看分析，在详情页、日历页、统计页回看自己的历史记录，也可以在账号页维护微信昵称和头像资料。

本项目已经从本地原型推进到云端可运行阶段：前端主链路、真实 AI 分析、微信云函数、用户身份、云端日记存储和资料页都已经接入。当前默认正式链路为微信云开发，仓库内仍保留本地 Express 后端作为调试备用入口。

## 项目状态

- 小程序类型：微信小程序
- 产品方向：情绪识别、情绪日记、个人情绪回顾
- 小程序名称：`关键词`
- 微信开发者工具项目名：`emotion-keyword-prototype`
- 当前云环境 ID：`cloud1-3gipf7cp7f184cc6`
- 默认后端模式：`wx-cloud`
- 本地备用后端：Express，默认地址 `http://127.0.0.1:3000`
- 真实 AI Provider：DeepSeek 兼容接口
- 主要数据源：微信云数据库 `users`、`journals`

## 功能总览

### 已完成主链路

1. 用户在输入页写下情绪文字。
2. 小程序调用 `emotionAnalyze` 云函数进行真实 AI 情绪分析。
3. 云函数返回结构化分析结果。
4. 结果页展示为一篇情绪日记。
5. 分析成功后自动保存到云端。
6. 用户可在详情页查看完整记录。
7. 用户可在日历页按日期回看记录。
8. 用户可在统计页查看本月情绪分布和近期记录。
9. 用户可在账号页查看和更新头像、昵称、日记数量、本地迁移状态。

### 情绪分析能力

分析结果统一包含以下字段：

```json
{
  "rawInput": "用户原始输入",
  "mainEmotion": "委屈",
  "subEmotions": ["不甘", "疲惫"],
  "explanations": {
    "委屈": "你感到被评价或误解，同时又没有完全表达开的空间。"
  },
  "foreignEmotionWord": {
    "word": "lítost",
    "language": "捷克语",
    "meaning": "一种被伤害后的委屈、羞恼与自怜混在一起的复杂感受。"
  },
  "analysis": "这段表达里有复杂的情绪拉扯。",
  "isNegative": true,
  "isHighRisk": false,
  "suggestion": "先把情绪放稳，再决定下一步要怎么做。",
  "source": "ai",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "dateKey": "2026-05-09",
  "diaryText": "导出预留正文"
}
```

其中 `foreignEmotionWord` 用于补充一个更贴近用户复杂情绪的外文词。如果没有合适词汇，该字段可以为 `null`。

### 安全提示

本项目是情绪识别与表达辅助工具，不是医疗诊断工具，也不是心理治疗工具。

当用户内容涉及自伤、自杀、极端绝望等高风险表达时，系统会通过两层机制处理：

- AI 输出 `isHighRisk`
- 后端或云函数通过关键词规则二次兜底

前端展示高风险结果时应使用固定的安全支持导向文案，不直接展示模型自由生成的安抚语。

## 技术架构

```text
微信小程序前端
  |
  |-- services/emotionService.js
  |     |-- wx-cloud: 调用 emotionAnalyze 云函数
  |     |-- local-http: 调用本地 Express 后端
  |     `-- mock: 演示分析
  |
  |-- services/journalCloudService.js
  |     `-- 调用 journalService 云函数
  |
  |-- services/userService.js
        |-- 调用 userBootstrap 云函数
        |-- 调用 userProfile 云函数
        `-- 上传头像到云存储

微信云开发
  |
  |-- emotionAnalyze: 情绪分析
  |-- journalService: 日记增删查统和本地迁移
  |-- userBootstrap: 用户建档和刷新
  |-- userProfile: 用户资料更新
  |
  |-- 云数据库
  |     |-- users
  |     `-- journals
  |
  `-- 云存储
        `-- user-avatars/

本地备用后端
  |
  `-- server: Express + provider 抽象 + DeepSeek/stub provider
```

## 目录结构

```text
.
├── app.js                         # 小程序全局入口，初始化本地 store 和云开发
├── app.json                       # 页面注册、窗口样式、基础配置
├── app.wxss                       # 全局样式
├── project.config.json            # 微信开发者工具项目配置
├── sitemap.json                   # 小程序 sitemap
├── start-backend.bat              # 本地 Express 后端启动脚本
├── utils/
│   ├── runtimeConfig.js           # 运行模式、云环境、本地 API 地址
│   └── time.js                    # 时间工具
├── config/
│   └── env.js                     # 小程序侧环境辅助配置
├── services/
│   ├── apiClient.js               # 本地 HTTP 请求封装
│   ├── emotionEngine.js           # 情绪结果归一化
│   ├── emotionService.js          # 情绪分析服务入口
│   ├── mockEmotion.js             # 本地 mock 分析
│   ├── journalStore.js            # 本地缓存、pending 数据、旧记录迁移辅助
│   ├── journalCloudService.js     # 云端日记服务封装
│   └── userService.js             # 用户建档、资料保存、头像展示解析
├── pages/
│   ├── input/                     # 输入页，首页和最近记录入口
│   ├── account/                   # 账号页，头像昵称和同步状态
│   ├── result/                    # 分析结果页，自动保存日记
│   ├── detail/                    # 日记详情页，支持删除
│   ├── calendar/                  # 日历页，按月查看记录
│   └── stats/                     # 统计页，月度情绪统计
├── cloudfunctions/
│   ├── emotionAnalyze/            # AI 情绪分析云函数
│   ├── journalService/            # 日记业务云函数
│   ├── userBootstrap/             # 用户建档和刷新云函数
│   └── userProfile/               # 用户资料更新云函数
├── server/
│   ├── package.json               # 本地后端依赖和脚本
│   └── src/
│       ├── app.js                 # Express 入口
│       ├── config/env.js          # 本地后端环境变量
│       ├── routes/emotion.js      # POST /api/emotion/analyze
│       └── services/              # prompt、provider、风险兜底、结果归一化
├── 工作交接-总览-2026-05-09.md    # 项目交接总览
├── 开发日志-2026-04-22.md         # 阶段开发日志
└── 开发日志-2026-05-09.md         # 阶段开发日志
```

## 页面说明

### 输入页 `pages/input`

输入页是小程序首页，负责承接用户输入和主要导航。

- 输入情绪文字
- 跳转结果页进行分析
- 展示最近保存的云端日记
- 进入账号页、日历页、统计页
- 账号入口优先展示真实头像，失败时回退到昵称首字或“我”

### 结果页 `pages/result`

结果页负责展示分析过程和分析结果。

- 支持分析中、分析成功、分析失败三态
- 默认调用真实分析
- 保留演示分析入口
- 分析成功后自动保存为云端日记
- 通过 `savedId` 和保存中状态锁防止重复保存
- 成功保存后提供查看完整日记入口

### 详情页 `pages/detail`

详情页用于查看单条情绪日记。

- 从云端读取日记详情
- 支持 loading、succeeded、failed 三态
- 展示主情绪、子情绪、外文情绪词、分析和建议
- 支持软删除云端日记

### 日历页 `pages/calendar`

日历页按月份读取云端记录。

- 按 `dateKey` 查询本月记录
- 保留 mock 日记的 `source=mock` 标识
- 真实分析不额外暴露“真实分析”文案

### 统计页 `pages/stats`

统计页用于月度回顾。

- 读取本月情绪统计
- 展示主要情绪分布
- 展示近期记录
- 兼容 `foreignEmotionWord` 结构

### 账号页 `pages/account`

账号页负责用户资料和本地记录迁移状态。

- 基于微信 `openid` 建档
- 缓存优先展示用户资料
- 无缓存时展示骨架屏
- 后台渐进刷新云端资料
- 刷新期间禁用头像、昵称、同步等写操作
- 点击头像单独更换头像，使用 `chooseAvatar`
- 点击昵称框单独设置昵称，使用 `input type="nickname"`
- 头像上传到云存储，数据库保留持久化 fileID
- 前端动态解析 `avatarDisplayUrl` 作为展示 URL
- 兼容历史 `cloud://`、`tcb.qcloud.la` 和普通 URL

## 关键配置

### 小程序运行配置

文件：`utils/runtimeConfig.js`

```js
const API_BASE_URL = 'http://127.0.0.1:3000';
const CLOUD_ENV_ID = 'cloud1-3gipf7cp7f184cc6';
const BACKEND_MODE = 'wx-cloud';

module.exports = {
  API_BASE_URL,
  CLOUD_ENV_ID,
  BACKEND_MODE,
  ALLOW_MOCK_DEMO: true,
  ANALYSIS_MODE: 'real-first'
};
```

字段说明：

| 字段 | 当前值 | 说明 |
| --- | --- | --- |
| `API_BASE_URL` | `http://127.0.0.1:3000` | 本地 Express 调试地址 |
| `CLOUD_ENV_ID` | `cloud1-3gipf7cp7f184cc6` | 微信云开发环境 ID |
| `BACKEND_MODE` | `wx-cloud` | 默认使用云函数 |
| `ALLOW_MOCK_DEMO` | `true` | 允许手动演示分析 |
| `ANALYSIS_MODE` | `real-first` | 产品语义上优先真实分析 |

### 后端模式切换

正式运行推荐保持：

```js
const BACKEND_MODE = 'wx-cloud';
```

如需切回本地 Express 调试：

```js
const BACKEND_MODE = 'local-http';
```

切换到 `local-http` 后，需要同时启动本地后端。

## 本地运行

### 1. 准备工具

需要安装：

- 微信开发者工具
- Node.js
- npm

建议使用较新的微信基础库。当前 `project.config.json` 中的基础库版本为 `3.7.6`。

### 2. 导入小程序

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本仓库根目录。
4. AppID 使用 `project.config.json` 中的 `wx52b0aede8920c70d`，或替换为自己的 AppID。
5. 确认云函数根目录为 `cloudfunctions/`。

### 3. 使用云函数正式链路

默认配置已经是：

```js
BACKEND_MODE = 'wx-cloud'
```

因此只要云开发配置正确，小程序可以直接通过云函数分析和保存日记。

首次运行前请确认：

- 云环境存在：`cloud1-3gipf7cp7f184cc6`
- 云函数已部署
- 云数据库集合已创建
- 云数据库权限已设置
- `emotionAnalyze` 云函数已配置 DeepSeek 环境变量

### 4. 使用本地 Express 备用链路

本地后端位于 `server/`，主要用于开发和调试。

方式一：双击脚本

```bat
start-backend.bat
```

方式二：手动启动

```bash
cd server
npm install
npm start
```

启动后服务地址：

```text
http://127.0.0.1:3000
```

健康检查：

```text
GET http://127.0.0.1:3000/health
```

情绪分析接口：

```text
POST http://127.0.0.1:3000/api/emotion/analyze
```

请求示例：

```json
{
  "rawInput": "今天感觉很累，也有一点说不出来的委屈。"
}
```

## 本地后端环境变量

本地 Express 后端会读取 `server/.env`。

可用变量：

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

常用配置：

### 使用 stub provider

```env
AI_PROVIDER=stub
```

### 使用 DeepSeek

```env
AI_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
```

请不要把真实 API Key 提交到仓库。

## 云开发配置

### 云环境

当前项目使用的云环境 ID：

```text
cloud1-3gipf7cp7f184cc6
```

`app.js` 在启动时调用：

```js
wx.cloud.init({
  env: CLOUD_ENV_ID,
  traceUser: true
});
```

### 云函数

当前业务云函数如下：

| 云函数 | 目录 | 职责 |
| --- | --- | --- |
| `emotionAnalyze` | `cloudfunctions/emotionAnalyze` | 调用 AI 进行情绪分析，归一化结果，执行高风险兜底 |
| `journalService` | `cloudfunctions/journalService` | 日记创建、最近列表、按月列表、详情、统计、删除、本地迁移 |
| `userBootstrap` | `cloudfunctions/userBootstrap` | 基于 `OPENID` 建立或获取用户资料 |
| `userProfile` | `cloudfunctions/userProfile` | 更新昵称、头像 fileID，并返回最新用户资料 |

每个云函数都依赖：

```json
{
  "wx-server-sdk": "^3.0.1"
}
```

### 云函数部署方式

在微信开发者工具中，对以下目录分别执行：

```text
创建并部署：云端安装依赖（不上传 node_modules）
```

需要部署的目录：

- `cloudfunctions/emotionAnalyze`
- `cloudfunctions/journalService`
- `cloudfunctions/userBootstrap`
- `cloudfunctions/userProfile`

如果账号页报 `FUNCTION_NOT_FOUND`，第一优先排查项是重新部署 `userProfile`。

### `emotionAnalyze` 环境变量

真实 AI 分析需要在云函数环境变量中配置：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

`DEEPSEEK_API_KEY` 必填。没有配置时，真实分析会失败。

## 云数据库

### 必要集合

云数据库必须存在：

- `users`
- `journals`

### 权限策略

建议两个集合都保持：

```text
所有用户不可读写
```

原因：

- 前端不直接读写数据库
- 所有读写统一走云函数
- 云函数根据微信 `OPENID` 控制数据归属

### `users` 集合

主要字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `openid` | string | 微信用户唯一身份，云端真实保存，返回前会被脱敏 |
| `nickname` | string | 用户昵称 |
| `avatarUrl` | string | 用户头像持久化值，通常为云存储 fileID |
| `createdAt` | string | 用户创建时间 |
| `lastLoginAt` | string | 最近进入时间 |
| `localMigrationDone` | boolean | 本地旧记录是否已迁移 |
| `journalCount` | number | 当前未删除日记数量 |

### `journals` 集合

主要字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `openid` | string | 数据所属用户 |
| `clientMigrationKey` | string | 本地旧记录迁移去重键 |
| `rawInput` | string | 用户原始输入 |
| `mainEmotion` | string | 主情绪 |
| `subEmotions` | string[] | 子情绪 |
| `explanations` | object | 情绪解释 |
| `foreignEmotionWord` | object/null | 更贴近的外文情绪词 |
| `analysis` | string | 结构化分析文本 |
| `suggestion` | string | 建议文案 |
| `isNegative` | boolean | 是否偏负向 |
| `isHighRisk` | boolean | 是否高风险 |
| `diaryText` | string | 导出预留正文 |
| `source` | string | `ai` 或 `mock` |
| `createdAt` | string | 创建时间 |
| `dateKey` | string | 日期键，格式 `YYYY-MM-DD` |
| `updatedAt` | string | 更新时间 |
| `isDeleted` | boolean | 是否软删除 |
| `deletedAt` | string | 删除时间 |

### 推荐索引

`users`：

- `openid`

`journals`：

- `openid + clientMigrationKey`
- `openid + isDeleted + createdAt`
- `openid + isDeleted + dateKey`

这些索引用于支撑用户查询、最近记录、日历按月查询和本地迁移去重。

## 云函数接口约定

### `emotionAnalyze`

调用方式：

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
    "analysis": "这段表达里有复杂的情绪拉扯。",
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

统一使用 `action + payload` 路由：

```js
wx.cloud.callFunction({
  name: 'journalService',
  data: {
    action: 'create',
    payload: {}
  }
});
```

支持 action：

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

调用方式：

```js
wx.cloud.callFunction({
  name: 'userBootstrap',
  data: {}
});
```

职责：

- 获取当前微信用户 `OPENID`
- 若用户不存在，则创建默认用户
- 更新 `lastLoginAt`
- 统计当前用户有效日记数量
- 返回脱敏用户资料

### `userProfile`

调用方式：

```js
wx.cloud.callFunction({
  name: 'userProfile',
  data: {
    nickname,
    avatarUrl
  }
});
```

职责：

- 校验昵称
- 更新昵称和头像 fileID
- 返回最新用户资料

## 前端服务层

### `services/emotionService.js`

情绪分析统一入口。

- `analyze(rawInput)`：根据 `BACKEND_MODE` 调用云函数或本地 HTTP
- `analyzeWithMock(rawInput)`：执行本地演示分析
- `canUseMockDemo()`：判断是否允许演示分析
- `normalizeError(error)`：将底层错误转换为用户可读中文提示

### `services/emotionEngine.js`

负责把不同来源的分析结果归一化为前端统一结构，避免页面层直接适配 provider 差异。

### `services/mockEmotion.js`

本地演示分析，基于关键词规则和模板返回结构化结果。它不是真实 AI 分析，主要用于演示和服务不可用时的人工备用入口。

### `services/journalCloudService.js`

云端日记服务封装。

- `createJournal(result)`
- `getRecentJournals(limit)`
- `getMonthEntries(year, month)`
- `getJournalDetail(id)`
- `getMonthStats(year, month)`
- `deleteJournal(id)`
- `migrateLocalJournals(journals)`

### `services/journalStore.js`

本地缓存层现在不再作为正式日记数据源，主要保留：

- `pendingInput`
- `pendingAnalysis`
- 旧版本本地日记迁移辅助

### `services/userService.js`

用户服务封装。

- `bootstrapCurrentUser(options)`
- `ensureCurrentUser()`
- `getCurrentUserSync()`
- `refreshCurrentUser()`
- `rerunLocalMigration()`
- `saveUserProfile(profile)`
- `getAccountInitial(user)`

同时负责：

- 上传头像到云存储
- 将云存储 fileID 解析成临时展示 URL
- 兼容历史头像 URL
- 将当前用户同步到 `App.globalData.currentUser`

## 主要业务流程

### 情绪分析并自动保存

1. 输入页写入内容。
2. 输入内容暂存为 `pendingInput`。
3. 跳转结果页。
4. 结果页调用 `emotionService.analyze(rawInput)`。
5. `emotionService` 根据 `BACKEND_MODE` 选择云函数或本地 HTTP。
6. 分析结果通过 `emotionEngine` 归一化。
7. 结果页展示分析成功态。
8. 结果页调用 `journalCloudService.createJournal(result)`。
9. `journalService` 云函数写入 `journals` 集合。
10. 云函数刷新 `users.journalCount`。
11. 前端拿到 `savedId`，展示查看详情入口。

### 用户建档和资料刷新

1. 账号页优先读取内存中的当前用户。
2. 如果有缓存，先展示缓存资料。
3. 后台调用 `userBootstrap` 刷新资料。
4. `userBootstrap` 根据 `OPENID` 查找或创建用户。
5. 前端更新 `App.globalData.currentUser`。
6. 如果本地旧记录未迁移，后台触发迁移。

### 更新头像和昵称

1. 点击头像触发微信官方 `chooseAvatar`。
2. 前端压缩图片。
3. 图片上传到云存储 `user-avatars/`。
4. 获取云存储 fileID。
5. 调用 `userProfile` 保存 `nickname` 和 `avatarUrl`。
6. 前端把 `avatarUrl` 保留为持久化值，把 `avatarDisplayUrl` 作为展示用临时 URL。

## 验收清单

### 主链路

- [ ] 输入页可以输入情绪文字
- [ ] 点击分析后能进入结果页
- [ ] 真实分析成功时结果页展示主情绪、子情绪、分析和建议
- [ ] 分析成功后自动保存云端日记
- [ ] 保存成功后可以进入详情页
- [ ] 首页最近记录能看到新日记
- [ ] 日历页能按日期看到新日记
- [ ] 统计页能反映本月记录变化

### 账号链路

- [ ] 首次进入账号页能自动建档
- [ ] 有缓存时账号页能先展示上次资料
- [ ] 无缓存时展示骨架屏，不闪默认资料
- [ ] 云端刷新期间头像、昵称、同步按钮不可写
- [ ] 点击头像可以选择并保存头像
- [ ] 点击昵称框可以选择或输入昵称并自动保存
- [ ] 退出重进后头像仍能显示
- [ ] 头像 URL 失效时能回退到默认圆形字母头像
- [ ] 重新同步本地记录功能可用

### 云端配置

- [ ] `emotionAnalyze` 已部署
- [ ] `journalService` 已部署
- [ ] `userBootstrap` 已部署
- [ ] `userProfile` 已部署
- [ ] `users` 集合存在
- [ ] `journals` 集合存在
- [ ] 集合权限为“所有用户不可读写”
- [ ] 推荐索引已创建
- [ ] `emotionAnalyze` 已配置 DeepSeek 环境变量

### 真机复核

账号资料链路建议必须真机再跑一遍，因为开发者工具里的 `chooseAvatar` 和 `input type="nickname"` 存在模拟行为，不能完全代表真实微信环境。

重点检查：

- 头像选择
- 头像上传
- 昵称保存
- 云函数调用
- 弱网状态下的加载和保存提示

## 常见问题

### 真实分析失败，提示服务繁忙或超时

可能原因：

- DeepSeek 服务繁忙
- 云函数执行超时
- 网络不稳定
- API Key 未配置或失效

处理方式：

1. 检查 `emotionAnalyze` 云函数环境变量。
2. 检查 DeepSeek API Key 是否有效。
3. 查看云函数日志。
4. 稍后重试。
5. 临时使用演示分析入口完成演示。

### 账号页提示 `FUNCTION_NOT_FOUND`

通常是 `userProfile` 云函数未部署或名称不匹配。

处理方式：

1. 在微信开发者工具中找到 `cloudfunctions/userProfile`。
2. 右键执行“创建并部署：云端安装依赖（不上传 node_modules）”。
3. 清缓存并重新编译小程序。
4. 再次进入账号页验证。

### 头像显示 403 或加载失败

历史云存储临时链接可能过期。当前前端已经通过 `avatarDisplayUrl` 做展示解析和失败回退。

如果仍出现问题：

1. 确认 `users.avatarUrl` 中保存的是 fileID，而不是过期临时 URL。
2. 确认云存储文件仍存在。
3. 检查 `wx.cloud.getTempFileURL` 调用结果。

### 日记无法保存

排查顺序：

1. `journalService` 是否已部署。
2. `journals` 集合是否存在。
3. 集合权限是否为“所有用户不可读写”。
4. 云函数日志中是否存在 `OPENID_MISSING`、权限错误或索引错误。
5. 前端是否拿到了有效的分析结果。

### 日历或统计页查不到记录

排查顺序：

1. `journals.dateKey` 是否存在且格式为 `YYYY-MM-DD`。
2. `isDeleted` 是否为 `false`。
3. 当前微信用户是否与记录的 `openid` 一致。
4. `openid + isDeleted + dateKey` 索引是否存在。

### 本地后端启动失败

处理方式：

```bash
cd server
npm install
npm start
```

如果端口被占用，可以在 `server/.env` 中修改：

```env
PORT=3001
```

同时需要修改 `utils/runtimeConfig.js` 中的 `API_BASE_URL`。

## 开发注意事项

### 不要绕过云函数直接读写数据库

当前安全模型依赖云函数通过 `OPENID` 控制数据归属。前端直接读写数据库会破坏权限设计。

### 不要把临时头像 URL 写回数据库

数据库中的 `users.avatarUrl` 应保存持久化值，通常是云存储 fileID。展示用临时 URL 由前端动态解析为 `avatarDisplayUrl`。

### 不要自动把真实分析失败降级保存为 mock

当前设计允许用户手动使用演示分析，但不建议在真实分析失败后静默保存 mock 结果，否则会混淆用户数据来源。

### 保持结果结构向后兼容

新增字段时需要同步检查：

- `services/emotionEngine.js`
- `services/mockEmotion.js`
- `services/journalCloudService.js`
- `cloudfunctions/emotionAnalyze`
- `cloudfunctions/journalService`
- `pages/result`
- `pages/detail`
- `pages/stats`

### 修改云函数后记得重新部署

小程序前端修改后重新编译即可，云函数修改后必须在微信开发者工具中重新部署对应函数。

## 后续建议

优先级从高到低：

1. 重新部署并真机验证 `userProfile` 云函数。
2. 真机完整验证头像和昵称更新链路。
3. 清缓存后验证首次建档和本地旧记录迁移。
4. 完整跑通输入、分析、自动保存、详情、日历、统计主链路。
5. 优化账号页加载和保存状态的细节体验。
6. 继续打磨统计页的信息密度和月度回顾表达。
7. 为云函数补充更系统的日志和错误分类。
8. 根据毕业设计需要补充论文或答辩材料中的系统设计图。

## 相关文档

本 README 是项目入口说明，更多交接过程和历史背景请看：

- `工作交接-总览-2026-05-09.md`
- `开发日志-2026-04-22.md`
- `开发日志-2026-05-09.md`

如果需要先理解全局，建议先读本 README，再读交接总览。如果需要追溯具体开发过程，再读两份开发日志。
