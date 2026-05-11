---
name: calendar-default-today
overview: 修改日历页，每次打开时默认选中今天的日期。
todos:
  - id: add-today-selection
    content: 修改 calendar.js：引入 formatDateKey，在 onLoad 中生成今日 dateKey 传参
    status: completed
---

## 需求描述

修改日历页（`pages/calendar/`），确保每次打开时默认选中的日期为**今天**。

- 当前行为：`onLoad` 只传年月，无 `preferredDateKey`，导致今天没有日记时不会被选中。
- 期望行为：每次打开日历页，今日的日期格自动高亮选中，下方明细区显示今日的情绪日记列表（如有）。

## 修改范围

仅修改 `pages/calendar/calendar.js` 一个文件，无需改动 wxml、wxss 或其他文件。

## 技术方案

### 技术栈

微信小程序原生开发（wxml + wxss + js）。

### 实现策略

最小改动原则，直接利用已存在的接口和数据流。

### 改动点

1. **引入 `formatDateKey`**：在 `calendar.js` 顶部导入 `const { formatDateKey } = require('../../utils/time');`
2. **`onLoad` 中生成今日 `dateKey`**：

```js
onLoad() {
const now = new Date();
const todayKey = formatDateKey(now);
this.loadMonth(now.getFullYear(), now.getMonth() + 1, todayKey);
}
```

3. **`onShow` 中也改用今日 `dateKey`**：不再保持上次选中日期，每次页面显示都指向今天。

```js
onShow() {
if (this.data.year && this.data.month) {
const now = new Date();
const todayKey = formatDateKey(now);
this.loadMonth(this.data.year, this.data.month, todayKey);
}
}
```

### 数据流

`onLoad/onShow` -> `loadMonth(year, month, todayKey)` -> `applyMonthEntries(entries, year, month, todayKey)` -> `buildCalendarMonthView(entries, year, month, todayKey)` -> `selectedDateKey = todayKey` -> 页面渲染高亮今日

### 为什么这样设计

- `loadMonth` 的第3个参数 `preferredDateKey` 已经是现有接口，复用即可。
- `formatDateKey` 已在 `utils/time.js` 中定义并导出，直接复用。
- `onLoad`（首次进入页面）和 `onShow`（从其他页面返回该页面）都统一使用今日日期，实现"每次进入都选中今天"的效果。

### 性能

零额外开销 —— 仅一次 dateKey 字符串拼接（O(1)）。

### 涉及文件

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| `pages/calendar/calendar.js` | [MODIFY] | 第1行添加 import；onLoad 和 onShow 方法均增加 todayKey 传参 |