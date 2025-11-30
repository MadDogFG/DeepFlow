/**
 * @file types.ts
 * @description DeepFlow 应用程序的核心类型定义。
 * 按照领域模型（内容、AI、视图状态）进行分组管理。
 */

// ==========================================
// 核心内容领域 (Content Domain)
// ==========================================

/**
 * 文章快照版本。
 * 用于历史记录追踪和回滚功能。
 */
export interface EssayVersion {
  /** 版本创建的时间戳 (Unix Timestamp) */
  timestamp: number;
  /** 该版本的文章全量内容 */
  content: string;
  /** 该版本的标题 */
  title: string;
  /** 版本说明或触发原因（例如："AI 重构前备份"） */
  note?: string;
}

/**
 * 文章实体。
 * 代表用户的一个写作项目。
 */
export interface Essay {
  /** 唯一标识符 (UUID) */
  id: string;
  /** 文章标题 */
  title: string;
  /** Markdown 格式的文章正文 */
  content: string;
  /** 灵感命题（如果是通过灵感功能创建） */
  topic?: string; 
  /** 命题的详细背景描述 */
  topicDescription?: string; 
  /** 创建时间戳 (ISO String) */
  createdAt: string;
  /** 最后修改时间戳 (ISO String) */
  updatedAt: string;
  /** 历史版本列表，用于撤销和恢复 */
  versions?: EssayVersion[]; 
}

// ==========================================
// 视图状态领域 (View State Domain)
// ==========================================

/**
 * 应用程序的主要视图状态枚举。
 */
export enum ViewState {
  /** 仪表盘/首页 */
  HOME = 'HOME',
  /** 编辑器视图 */
  EDITOR = 'EDITOR',
  /** 历史列表视图 */
  HISTORY = 'HISTORY',
}

// ==========================================
// AI 与智能建议领域 (AI Domain)
// ==========================================

/**
 * AI 生成的灵感提示结构。
 */
export interface PromptIdea {
  /** 提示的主题或标题 */
  topic: string;
  /** 对该主题的深度解释或引导语 */
  description: string;
}

/**
 * 行内文本补全或润色建议选项。
 */
export interface CompletionOption {
  /** 建议类型的标签 (例如: "纠错", "润色") */
  label: string; 
  /** 建议的具体文本内容 */
  text: string;  
  /** 对修改原因的解释或描述 */
  description?: string;
}

/**
 * 全文结构分析建议。
 */
export interface StructureSuggestion {
  /** 风格名称 (例如: "苏格拉底式提问") */
  styleName: string; 
  /** 采用此风格的原因或优势说明 */
  explanation: string; 
  /** 重写后的完整内容 */
  rewrittenContent: string; 
}

/**
 * AI 异步操作的状态机枚举。
 */
export enum AIStatus {
  /** 空闲状态 */
  IDLE = 'IDLE',
  /** 请求处理中 */
  LOADING = 'LOADING',
  /** 请求成功 */
  SUCCESS = 'SUCCESS',
  /** 请求发生错误 */
  ERROR = 'ERROR',
}

/**
 * 支持的 AI 服务提供商类型。
 */
export type AIProvider = 'gemini' | 'openai';

/**
 * AI 服务配置接口。
 * 用于存储用户的自定义 API 设置。
 */
export interface AISettings {
  /** 当前选中的服务提供商 */
  provider: AIProvider;
  /** 用户提供的 API Key (优先于环境变量) */
  apiKey: string;
  /** OpenAI 兼容接口的基础 URL (可选) */
  baseUrl?: string; 
  /** 指定的模型名称 (例如: 'gemini-2.5-flash', 'gpt-4o') */
  modelName?: string;
  /** 幽灵文字生成的延迟时间 (毫秒)，默认 1000ms */
  ghostDelay?: number;
}
