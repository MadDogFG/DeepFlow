/**
 * @file services/storage.ts
 * @description LocalStorage 持久化存储服务层。
 * 封装了数据的读写操作，并包含对脏数据的容错处理。
 */

import { Essay, AISettings } from '../types';

const STORAGE_KEY = 'deepflow_essays';
const SETTINGS_KEY = 'deepflow_settings';

/**
 * 保存或更新一篇文章到 LocalStorage。
 * 如果文章已存在则更新，否则插入到列表头部。
 * 
 * @param essay - 需要保存的文章对象
 */
export const saveEssay = (essay: Essay): void => {
  try {
    const essays = getEssays();
    const index = essays.findIndex((e) => e.id === essay.id);
    
    if (index >= 0) {
      // 更新现有文章
      essays[index] = essay;
    } else {
      // 插入新文章
      essays.unshift(essay);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(essays));
  } catch (error) {
    console.error('[Storage] Failed to save essay:', error);
    // 在实际生产环境中，这里可能需要上报错误日志
  }
};

/**
 * 获取所有本地存储的文章。
 * 包含 JSON 解析的错误处理，防止数据损坏导致白屏。
 * 
 * @returns Essay 对象数组
 */
export const getEssays = (): Essay[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Storage] Failed to parse essays:', error);
    // 如果数据损坏，返回空数组以保证应用可用性
    return [];
  }
};

/**
 * 根据 ID 删除文章。
 * 
 * @param id - 文章 UUID
 */
export const deleteEssay = (id: string): void => {
  try {
    const essays = getEssays().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(essays));
  } catch (error) {
    console.error('[Storage] Failed to delete essay:', error);
  }
};

/**
 * 根据 ID 获取单篇文章。
 * 
 * @param id - 文章 UUID
 * @returns 找到的 Essay 对象或 undefined
 */
export const getEssayById = (id: string): Essay | undefined => {
  return getEssays().find((e) => e.id === id);
};

// ==========================================
// 设置存储 (Settings Storage)
// ==========================================

/**
 * 获取 AI 配置设置。
 * 如果没有保存的设置，返回默认值。
 * 
 * @returns AISettings 对象
 */
export const getAISettings = (): AISettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Storage] Failed to parse settings:', error);
  }
  return {
    provider: 'gemini',
    apiKey: '',
    modelName: 'gemini-2.5-flash'
  };
};

export const saveAISettings = (settings: AISettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[Storage] Failed to save settings:', error);
  }
};
