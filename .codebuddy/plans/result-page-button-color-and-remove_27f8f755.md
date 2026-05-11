---
name: result-page-button-color-and-remove
overview: 将 result.wxml 中 "查看完整日记" 按钮的样式（secondary-btn）赋给 "去日历页查看记录" 按钮，然后删除 "查看完整日记" 按钮。
todos:
  - id: update-result-wxml
    content: 修改 result.wxml：将"去日历页查看记录"按钮 class 从 ghost-btn 改为 secondary-btn，删除"查看完整日记"按钮行
    status: completed
  - id: cleanup-dead-code
    content: （可选）删除 result.js 中不再使用的 openDetail 方法
    status: completed
    dependencies:
      - update-result-wxml
---

## 需求描述

在 result 页面（`pages/result/`）中，执行以下两项修改：

1. **颜色迁移**：将"查看完整日记"按钮的样式（`secondary-btn` 类）应用给"去日历页查看记录"按钮，即把该按钮的 `class` 从 `ghost-btn` 改为 `secondary-btn`。
2. **删除按钮**：删除"查看完整日记"按钮（包括其所在的行及 `wx:if` 条件渲染逻辑）。

## 视觉效果

- "去日历页查看记录"按钮从透明/白色底边框样式变为浅金色底（`rgba(237, 237, 165, 0.86)`）配深绿色文字（`#4f6e4e`）和金绿色边框的样式。
- "查看完整日记"按钮完全从页面中移除，不再显示。

## 额外清理（可选）

- `openDetail` 函数（`result.js` 第 175-183 行）在删除按钮后不再被调用，可考虑移除，避免死代码。

## 技术方案

### 技术栈

- **框架**：微信小程序（原生 wxml + wxss + js）
- **样式系统**：全局样式定义在 `app.wxss` 中，`.secondary-btn` 和 `.ghost-btn` 共享基础尺寸样式（高度 92rpx、圆角 999rpx），差异仅在背景色（`rgba(237, 237, 165, 0.86)` vs `rgba(255, 255, 255, 0.14)`）、边框色上。

### 实现方案

直接在 `result.wxml` 中：

1. 将"去日历页查看记录"按钮的 `class` 从 `"ghost-btn"` 改为 `"secondary-btn"`
2. 删除"查看完整日记"按钮的整个 `<button>` 行

无需新增任何样式代码，因为 `secondary-btn` 类已在全局 `app.wxss` 中定义且可直接复用，符合 DRY 原则。

### 关于 `openDetail` 函数的处理

`result.js` 中的 `openDetail` 方法（第 175-183 行）在删除按钮后将不再被任何模板事件绑定引用。理论上可以移除，但保留该方法不会产生任何副作用（不会被调用），为了避免引入不必要的变更风险，**建议保留**。如果希望清理死代码，也可以一并删除。

### 修改文件清单

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| `pages/result/result.wxml` | [MODIFY] | 第74行删除，第75行 class 修改 |
| `pages/result/result.js` | [MODIFY]（可选） | 删除 `openDetail` 方法（第175-183行） |