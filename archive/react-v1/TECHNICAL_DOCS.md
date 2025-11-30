# DeepFlow 技术文档

## 1. 架构概览

DeepFlow 是一个纯前端的单页应用 (SPA)，基于以下技术栈构建：

*   **Core**: React 19 (Hooks, Context)
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **AI SDK**: `@google/genai` (用于 Gemini), 原生 `fetch` (用于 OpenAI 兼容接口)
*   **Persistence**: Browser `localStorage`

应用没有后端数据库，所有数据（文章、设置）均存储在用户的浏览器本地，确保隐私与响应速度。

## 2. 目录结构

```
/
├── components/          # React 组件
│   ├── Dashboard.tsx    # 首页仪表盘
│   ├── Editor.tsx       # 核心编辑器 (包含 Ghost Text 逻辑)
│   ├── SettingsModal.tsx# 设置弹窗
│   ├── History.tsx      # 历史记录页
│   └── ...
├── services/            # 业务逻辑层
│   ├── geminiService.ts # AI 调用核心服务 (Gemini & OpenAI)
│   ├── storage.ts       # LocalStorage 封装
│   └── ...
├── config/              # 配置文件
│   └── appConfig.ts     # AI Prompts, 默认设置
├── types.ts             # TypeScript 接口定义
├── App.tsx              # 路由与根组件
└── index.tsx            # 入口文件
```

## 3. 核心功能实现细节

### 3.1 AI 服务层 (`geminiService.ts`)

为了支持多模型和多提供商，我们设计了一个统一的接口层。

*   **Provider Pattern**: `generateText` 函数根据用户配置 (`getAISettings()`) 动态决定调用 `callGemini` 还是 `callOpenAI`。
*   **Robust JSON Parsing**: LLM 有时会返回 Markdown 包裹的 JSON 或非标准 JSON。我们实现了 `parseAsArray` 辅助函数，通过正则清洗和深度对象遍历，确保前端始终能拿到 `Array` 格式的数据，避免页面崩溃。
*   **Deduplication**: 针对幽灵文本，服务层使用 `Set` 对 AI 返回的候选结果进行去重。

### 3.2 幽灵文本 (Ghost Text) 实现原理

这是编辑器最复杂的部分，位于 `components/Editor.tsx`。

1.  **UI 叠加层 (Overlay Technique)**:
    *   我们不直接操作 `textarea` 的 value 来显示建议（因为那会改变用户的实际内容）。
    *   我们在 `textarea` 底部绝对定位了一个完全透明的 `div` (Overlay)。
    *   Overlay 的字体、行高、Padding、Wrap 属性与 `textarea` 完全一致。
    *   Overlay 内容 = `用户当前内容` + `<span class="gray">AI建议</span>`。
    *   通过 `handleScroll` 事件同步两者的滚动条位置。

2.  **触发机制**:
    *   监听 `onChange` 事件，重置防抖定时器。
    *   用户停止输入 1000ms (可配置) 后，调用 `triggerGhostText`。
    *   API 请求期间显示 "Thinking" 状态。

3.  **采纳逻辑**:
    *   监听 `onKeyDown`。
    *   `Tab`: 将 `ghostText` 追加到 `content` 状态中，并清空建议。
    *   `Alt + Arrow`: 更改 `ghostIndex` 状态，循环切换显示的建议。

### 3.3 提示词工程 (`config/appConfig.ts`)

我们将所有 Prompt 抽取到了配置文件中，方便迭代。

*   **Ghost Text**: 强制要求返回 3 个不同风格（顺承、转折、修辞），并严格检查标点符号（如果上文以句号结尾，生成的句子首字母大写或作为新句）。
*   **Polishing**: 要求返回严格的 JSON 数组，包含 label, text, description 字段。

### 3.4 数据持久化

*   **文章存储**: `Essay` 对象包含 `versions` 数组。每次“应用 AI 建议”或“手动保存”时，都会将当前状态压入 `versions` 栈，并更新 `updatedAt`。
*   **设置存储**: API Key 和 Provider 配置单独存储，不随文章导出。

## 4. 扩展性

*   **添加新模型**: 只需在 `SettingsModal` 中允许用户输入新模型名称，`geminiService` 会自动透传该名称。
*   **添加新 AI 提供商**: 只需在 `geminiService.ts` 中扩展 `generateText` 的 `switch` 逻辑即可。
