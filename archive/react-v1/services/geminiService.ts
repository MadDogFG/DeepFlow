/**
 * @file services/geminiService.ts
 * @description AI 服务层，负责与 LLM 提供商 (Google Gemini & OpenAI) 进行交互。
 * 实现了提示词构建、API 请求发送、错误处理以及响应数据的标准化解析。
 */

import { GoogleGenAI } from "@google/genai";
import { PromptIdea, StructureSuggestion, CompletionOption, AISettings } from "../types";
import { getAISettings } from "./storage";
import { PROMPTS, DEFAULT_AI_SETTINGS } from "../config/appConfig";

/**
 * 获取有效的 API 配置。
 * 优先级：用户本地存储设置 > 环境变量
 */
const getConfig = (): AISettings => {
  const settings = getAISettings();
  // 注意：process.env.API_KEY 是构建时注入或运行时提供的环境变量
  const effectiveApiKey = settings.apiKey || process.env.API_KEY || '';
  return { ...settings, apiKey: effectiveApiKey };
};

/**
 * 检查当前是否有可用的 API Key。
 */
export const hasApiKey = (): boolean => !!getConfig().apiKey;

/**
 * 统一的文本生成接口。
 * 根据配置分发请求给 Gemini SDK 或 OpenAI 兼容接口。
 * 
 * @param systemPrompt - 系统指令 (Persona/System Instruction)
 * @param userPrompt - 用户输入的具体任务或上下文
 * @param jsonMode - 是否强制要求返回 JSON 格式
 */
async function generateText(
  systemPrompt: string, 
  userPrompt: string, 
  jsonMode: boolean = false
): Promise<string> {
  const config = getConfig();

  if (!config.apiKey) {
    console.warn("DeepFlow: 未检测到 API Key，AI 功能可能无法工作。");
  }

  if (config.provider === 'openai') {
    return callOpenAI(config, systemPrompt, userPrompt, jsonMode);
  } else {
    return callGemini(config, systemPrompt, userPrompt, jsonMode);
  }
}

/**
 * 辅助函数：健壮的 JSON 数组解析器。
 * LLM 经常会在返回的 JSON 外面包一层 Markdown 代码块 (```json ... ```) 或者嵌套在对象中。
 * 此函数尝试提取并清理出纯净的数组数据。
 * 
 * @param text - LLM 返回的原始文本
 * @returns 解析后的数组，失败则返回空数组
 */
function parseAsArray<T>(text: string): T[] {
  try {
    // 1. 移除 Markdown 代码块标记
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    if (!cleanText) return [];

    const parsed = JSON.parse(cleanText);
    
    // 场景 A: 直接返回了数组
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    
    // 场景 B: 包裹在对象中 (例如 { "suggestions": [...] })
    // 我们尝试遍历对象的值，寻找第一个数组
    if (parsed && typeof parsed === 'object') {
      const values = Object.values(parsed);
      for (const val of values) {
        if (Array.isArray(val)) {
          return val as T[];
        }
      }
    }
    
    return [];
  } catch (e) {
    console.error("[JSON Parser] 解析失败，原始文本:", text);
    return [];
  }
}

// ==========================================
// Google Gemini 实现 (使用 @google/genai SDK)
// ==========================================

async function callGemini(
  config: AISettings, 
  systemPrompt: string, 
  userPrompt: string, 
  jsonMode: boolean
): Promise<string> {
  // 严格遵循 SDK 规范：使用命名参数初始化
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  
  // 如果未指定模型，默认使用 gemini-2.5-flash
  const modelId = config.modelName || DEFAULT_AI_SETTINGS.modelName;
  
  const generateConfig: any = {
    systemInstruction: systemPrompt,
    temperature: 0.7,
  };

  if (jsonMode) {
    generateConfig.responseMimeType = "application/json";
  }

  try {
    // 严格遵循 SDK 规范：使用 ai.models.generateContent
    const response = await ai.models.generateContent({
      model: modelId,
      contents: userPrompt,
      config: generateConfig
    });
    
    // 直接访问 .text 属性获取结果
    return response.text || '';
  } catch (e) {
    console.error("Gemini API Error:", e);
    throw e;
  }
}

// ==========================================
// OpenAI 兼容接口实现 (使用 fetch)
// ==========================================

async function callOpenAI(
  config: AISettings, 
  systemPrompt: string, 
  userPrompt: string, 
  jsonMode: boolean
): Promise<string> {
  const baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'https://api.openai.com/v1';
  const url = `${baseUrl}/chat/completions`;
  const model = config.modelName || 'gpt-4o-mini';

  const body: any = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error("OpenAI API Error:", e);
    throw e;
  }
}

// ==========================================
// 公共业务方法 (Public Facade)
// ==========================================

/**
 * 生成灵感命题 (PromptIdea)。
 * @param hint - 可选的用户提示词或关键词
 */
export const generateInspiration = async (hint?: string): Promise<PromptIdea> => {
  try {
    const prompt = PROMPTS.INSPIRATION.userTemplate(hint);
    const text = await generateText(PROMPTS.INSPIRATION.system, prompt, true);
    
    // 手动清理，因为这里返回的是单个对象而非数组
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as PromptIdea;
  } catch (error) {
    console.error("Error generating inspiration:", error);
    // 降级策略：返回默认命题
    return {
      topic: "自我与世界的边界",
      description: "我们如何定义真实的自我？是在独处时，还是在与他人的互动中？(API 调用失败)"
    };
  }
};

/**
 * 生成“幽灵文本”补全 (Ghost Text)。
 * 返回多个短句建议，用于行内展示。
 */
export const generateGhostCompletion = async (currentText: string): Promise<string[]> => {
    try {
        // 截取最近的 1000 个字符作为上下文，既节省 Token 又能保证连贯性
        const context = currentText.slice(-1000); 
        
        const systemPrompt = PROMPTS.GHOST_TEXT.system;
        const prompt = PROMPTS.GHOST_TEXT.userTemplate(context);

        const text = await generateText(systemPrompt, prompt, true);
        
        let suggestions: string[] = parseAsArray<string>(text);

        // 容错：如果模型返回了普通字符串而非 JSON 数组
        if (suggestions.length === 0 && text.trim().length > 0 && !text.includes('{') && !text.includes('[')) {
           suggestions = [text.trim()];
        }
        
        // 去重逻辑：使用 Set 过滤重复建议
        const uniqueSuggestions = new Set<string>();
        suggestions.forEach(s => {
            const clean = s.trim();
            if (clean.length > 0) uniqueSuggestions.add(clean);
        });

        return Array.from(uniqueSuggestions);

    } catch (error) {
        console.error("Ghost text error", error);
        return [];
    }
}

/**
 * 生成文本润色选项 (Polishing Options)。
 * 针对选中的文本片段提供“纠错”、“润色”、“重写”三个版本的建议。
 */
export const generatePolishingOptions = async (selectedText: string, context: string): Promise<CompletionOption[]> => {
    try {
        // 上下文取选中内容之前的 300 个字符，帮助 AI 理解语境
        const prompt = PROMPTS.POLISHING.userTemplate(selectedText, context.slice(-300));
        const systemPrompt = PROMPTS.POLISHING.system;
        
        const result = await generateText(systemPrompt, prompt, true);
        return parseAsArray<CompletionOption>(result);
    } catch (e) {
        console.error("Polishing API error:", e);
        return [];
    }
}

/**
 * 全文结构分析 (Structural Analysis)。
 * 生成从基础校对到创意改写的多个版本。
 */
export const analyzeStructure = async (text: string, topic?: string): Promise<StructureSuggestion[]> => {
  try {
    if (text.length < 10) return []; // 文本太短不进行分析
    
    const prompt = PROMPTS.STRUCTURE_ANALYSIS.userTemplate(text);
    const system = PROMPTS.STRUCTURE_ANALYSIS.system;

    const result = await generateText(system, prompt, true);
    return parseAsArray<StructureSuggestion>(result);
  } catch (error) {
    console.error("Error analyzing structure:", error);
    return [];
  }
};