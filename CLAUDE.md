# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个基于纯原生 JavaScript 的单文件题库/刷题 Web 应用，用于备考认证考试（如 ServiceNow CIS-CSM）。无构建工具、无框架、无包管理器，直接用浏览器打开 `index.html` 即可运行。

## Running the App

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080
```

应用启动时自动尝试加载 `./questions.json`（`cis-csm.json` 即为此文件），若不存在则显示文件上传界面。

## Architecture

整个应用是一个**单文件 SPA**（`index.html`，约 2265 行），从上到下：

1. **`<style>`** — 内嵌 CSS，使用 CSS 自定义属性实现明/暗主题（`.dark` 类切换），移动端优先，`768px` 断点切换到桌面布局。顶部导航 `#topnav`（桌面）和底部 Tab `#bottomtabs`（移动端）互斥显示。
2. **`<body>`** — 5 个视图 `div`（`#v-dash`、`#v-practice`、`#v-exam`、`#v-wrong`、`#v-profile`），通过 JS 动态 `innerHTML` 渲染，`.active` 类控制显隐。还有 2 个固定底部操作栏：`#practiceBar`、`#examBar`。
3. **`<script>`** — 所有业务逻辑，无模块化，全局变量。

### 全局变量

| 变量 | 说明 |
|------|------|
| `Q[]` | 当前加载的题目数组 |
| `meta{}` | 题库元数据（`exam`、`totalQuestions`、`officialCount`、`officialTime`、`passRate`） |
| `ST{}` | 用户状态，持久化到 `localStorage`，键名由 `lsKey()` 生成（格式：`{exam_name}_state`） |
| `EXAM_CFG{}` | 考试配置，由 `meta` 覆盖默认值 |
| `curTab` | 当前激活的 tab id（`'dash'`/`'practice'`/`'exam'`/`'wrong'`/`'profile'`） |
| `practiceMode` | 当前练习模式字符串，`null` 表示未在练习中 |
| `practiceQs[]` | 当前练习题目 id 列表 |
| `practiceIdx` | 当前练习题目下标 |
| `examActive` | 是否正在进行考试 |
| `examState{}` | 当前考试状态（题目列表、答案、计时等） |
| `REVIEW_INTERVALS` | Ebbinghaus 复习间隔天数 `[1,3,7,15,30]` |

### ST 对象结构

```js
{
  version: 1,
  answers: { [id]: { selected, correct, time, timeSpent, attempts, correctStreak, confidence } },
  wrongIds: [],          // 错题 id 列表
  masteredWrongIds: [],  // 已掌握的错题 id
  bookmarkIds: [],       // 收藏题 id
  notes: { [id]: string },
  examHistory: [{ date, mode, score, total, timeUsed, details }],
  pausedExam: null,      // 暂停的考试状态
  settings: { lang, showExplanation, darkMode, wrongMasteryThreshold, shuffleOptions },
  reviewSchedule: { [id]: { nextReview, interval, level } }
}
```

### 核心函数

| 函数 | 说明 |
|------|------|
| `loadLibFromFile(file)` | 加载题库 JSON 文件 |
| `switchTab(id)` | 切换 tab，触发 `renderView()` |
| `startPractice(mode)` | 开始练习，mode: `seq`/`random`/`wrong`/`unanswered`/`bookmark`/`review` |
| `startExam(mode)` | 开始考试，mode: `official`/`full`/`custom` |
| `submitAnswer()` | 提交练习答案，更新 `ST` 并调用 `updateReviewSchedule()` |
| `finishExam()` | 结束考试，批量更新 `ST.answers` 和 `ST.examHistory` |
| `saveState()` | 将 `ST` 序列化写入 `localStorage` |
| `renderPracticeQuestion()` | 渲染当前练习题目 |
| `renderExamActive()` | 渲染考试中视图 |

### 题目 JSON 格式

```json
{
  "meta": { "exam": "CIS-CSM", "totalQuestions": 245, "officialCount": 60, "officialTime": 105, "passRate": 70 },
  "questions": [
    {
      "id": "csm.1",
      "question": "...",
      "questionJa": "...",
      "options": [{ "key": "A", "text": "...", "textJa": "..." }],
      "answer": ["A"],
      "isMultiple": false,
      "explanation": "",
      "note": null
    }
  ]
}
```

### 键盘快捷键

练习模式下：`A`-`G` 直接选择选项，`↑`/`↓` 在选项间移动焦点，`Enter`/`Space` 选中当前聚焦选项，`←`/`→` 上/下一题，`Enter` 提交/继续。全局：`Shift+Alt+H` 打开帮助弹窗，`Esc` 关闭弹窗。

## 题库维护脚本（Python）

项目包含用于批量处理题库的 Python 脚本：

- **`process_questions.py`** — 对特定题号范围做拼写纠错，生成 `part_N_updates.json`
- **`generate_explanations.py`** / `generate_part3.py` 等 — 批量生成解析内容
- **`run_generate.py`** — 批量执行生成脚本

`part_1_updates.json` ~ `part_10_updates.json` 是各批次的中间处理结果，最终需手动或脚本合并回 `cis-csm.json`（即运行时的 `questions.json`）。

## 多题库支持

通过 `lib_history`（localStorage 键）存储多个题库的加载历史。每个题库对应独立的 localStorage 状态键（由题库的 `meta.exam` 字段决定，格式：`{exam}_state`）。
