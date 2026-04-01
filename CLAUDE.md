# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个基于纯原生 JavaScript 的单文件题库/刷题 Web 应用，用于备考认证考试（如 ServiceNow CIS-CSM）。无构建工具、无框架、无包管理器，直接用浏览器打开 `index.html` 即可运行。

## Architecture

整个应用是一个**单文件 SPA**（`index.html`，约 1900 行），结构如下：

- **CSS**：内嵌在 `<style>` 中，使用 CSS 自定义属性实现明/暗主题，移动端优先，768px 断点切换到桌面布局
- **HTML**：多个 `<div>` 视图（`#v-dash`、`#v-practice`、`#v-exam`、`#v-wrong`、`#v-profile`），通过 JS 动态 `innerHTML` 渲染切换
- **JS**：内嵌在 `<script>` 中，核心数据流：

```
JSON 文件（题库） → loadLibFromFile() → Q[]（题目数组）
用户交互 → submitAnswer() / startPractice() / startExam()
→ ST{}（用户状态，持久化到 localStorage）
→ render*() 函数重新渲染对应视图
```

### 核心状态

| 变量 | 说明 |
|------|------|
| `Q[]` | 当前加载的题目数组 |
| `meta{}` | 题库元数据（考试名、题数、通过率等） |
| `ST{}` | 用户状态（答题记录、书签、笔记、复习计划），持久化到 `localStorage` |
| `examState{}` | 当前进行中的模拟考试状态 |

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

### 练习模式

`startPractice(mode)` 支持的 mode 值：`seq`（顺序）、`rand`（随机）、`wrong`（错题）、`unanswered`（未做）、`bookmarks`（收藏）、`review`（今日复习）

`startExam(mode)` 支持：`official`（官方模式）、`full`（全题）、`custom`（自定义）

## Running the App

直接在浏览器中打开 `index.html`，或通过本地 HTTP 服务器（避免 CORS 问题）：

```bash
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

应用启动时会自动尝试加载 `./questions.json`，若不存在则显示文件上传界面手动加载题库 JSON。

## Adding a New Question Bank

在项目根目录放置符合上述 JSON 格式的文件，命名为 `questions.json`，或通过界面上传任意名称的 JSON 文件。支持同时管理多个题库（通过 `lib_history` localStorage 键存储历史记录）。
