# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

基于 Vite + 原生 JavaScript（ES 模块）的题库/刷题 Web 应用，用于备考认证考试（如 ServiceNow CIS-CSM）。支持 Supabase 用户登录与云端状态同步，可选配置。

## 常用命令

```bash
npm run dev        # 启动开发服务器（Vite，热重载）
npm run build      # 构建生产版本到 dist/
npm run preview    # 预览构建结果
```

`public/questions.json` 是默认加载的题库（即 `cis-csm.json`）；启动时自动 fetch，若不存在则显示文件上传界面。

## 环境变量（可选）

复制 `.env.example` 为 `.env`，填入 Supabase 凭据即可启用云同步：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

不配置时应用完全离线运行，auth/sync 模块暴露空操作 stub。

## 架构

### 模块结构

```
src/
  main.js              # 入口：导入 CSS + 调用 init()
  init.js              # 初始化：绑定文件拖放、auto-fetch questions.json、keyboard/touch
  state/
    store.js           # 全局状态对象 state{}、saveState()、loadState()、lsKey()
    constants.js       # TABS 定义、DEFAULT_EXAM_CFG、REVIEW_INTERVALS
    question-helpers.js # getQ(id) 等题目查询工具
    statistics.js      # 统计计算
  views/
    router.js          # registerView()、switchTab()、renderTabs()（tab 路由核心）
    dashboard.js       # 仪表盘视图
    practice.js        # 练习模式（startPractice、submitAnswer、renderPracticeQuestion）
    exam.js            # 考试模式（startExam、finishExam、renderExamActive）
    wrong.js           # 错题本视图
    profile.js         # 个人中心视图
    modal.js           # 通用弹窗（showModalRaw、hideModal）
    help.js            # 帮助弹窗
  library/
    loader.js          # 题库加载（loadLibFromFile、bootApp、reloadLib、renderLibPicker）
  auth/
    supabase.js        # 初始化 Supabase client（未配置时导出 null）
    auth.js            # 登录/注册/Google OAuth，initAuth()
    sync.js            # 云同步（debouncedSync、syncState、mergeState）
  input/
    keyboard.js        # 全局键盘快捷键
    touch.js           # 触摸滑动手势
  lib/
    dom.js             # $()、$$()、h()（DOM 工具）
    utils.js           # isoNow() 等通用工具
  icons/icons.js       # ic(name) SVG 图标函数
  styles/              # CSS 拆分：variables、base、nav、components、practice、exam、views、responsive
public/
  questions.json       # 默认题库（运行时从此路径 fetch）
```

### 状态管理

所有运行时状态集中在 `src/state/store.js` 导出的 `state` 对象（非全局变量）：

| 字段 | 说明 |
|------|------|
| `state.Q[]` | 当前题目数组 |
| `state.meta{}` | 题库元数据 |
| `state.ST{}` | 用户状态，持久化到 localStorage（键由 `lsKey()` 生成：`{exam}_state`） |
| `state.curTab` | 当前激活 tab（`'dash'`/`'practice'`/`'exam'`/`'wrong'`/`'profile'`） |
| `state.practiceMode` | 当前练习模式，`null` 表示未在练习 |
| `state.examActive` / `state.examState` | 考试状态 |

`ST` 对象结构：
```js
{
  version: 1,
  answers: { [id]: { selected, correct, time, timeSpent, attempts, correctStreak, confidence } },
  wrongIds: [], masteredWrongIds: [], bookmarkIds: [],
  notes: { [id]: string },
  examHistory: [{ date, mode, score, total, timeUsed, details }],
  pausedExam: null,
  settings: { lang, showExplanation, darkMode, wrongMasteryThreshold, shuffleOptions },
  reviewSchedule: { [id]: { nextReview, interval, level } }
}
```

### 视图路由

`router.js` 的 `registerView(id, fn)` 注册各视图渲染函数，`switchTab(id)` 切换 tab 并调用对应渲染函数。各视图模块在 `init.js` 中 import 后自动注册。

### 全局暴露约定

部分函数需从 HTML `onclick` 调用，通过 `window.xxx = fn` 暴露（如 `window.switchTab`、`window.showAuthModal`、`window.bootApp`）。新增此类函数须显式赋值到 `window`。

### 云同步

`sync.js` 使用 Supabase `user_states` 表（字段：`user_id`、`exam_key`、`state`、`updated_at`）。`saveState()` 调用后触发 3 秒防抖推送；页面重新可见时自动 pull+merge+push。`mergeState()` 实现细粒度合并（answers 取 attempts 多者、arrays 取并集、settings 按时间戳选胜者）。

### 题目 JSON 格式

```json
{
  "meta": { "exam": "CIS-CSM", "totalQuestions": 245, "officialCount": 60, "officialTime": 105, "passRate": 70 },
  "questions": [
    {
      "id": "csm.1",
      "question": "...", "questionJa": "...",
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

练习模式：`A`–`G` 直接选项，`↑`/`↓` 移动焦点，`Enter`/`Space` 选中，`←`/`→` 上/下一题，`Enter` 提交/继续。全局：`Shift+Alt+H` 帮助弹窗，`Esc` 关闭弹窗。

## 题库维护脚本（Python）

- `process_questions.py` — 拼写纠错，生成 `part_N_updates.json`
- `generate_explanations.py` / `generate_part3.py` 等 — 批量生成解析
- `run_generate.py` — 批量执行生成脚本

`part_1_updates.json` ~ `part_10_updates.json` 是中间处理结果，最终需合并回 `cis-csm.json`（即 `public/questions.json`）。

## 多题库支持

`quiz_libraries`（localStorage 键）存储最近 10 个题库历史。每个题库独立状态键（`{exam}_state`）。`bootApp()` 负责切换题库并重置运行时状态。
