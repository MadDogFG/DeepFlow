
import React, { useState, useEffect } from 'react';
import { X, Settings, Check } from 'lucide-react';
import { AISettings, AIProvider } from '../types';
import { getAISettings, saveAISettings } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AISettings>({
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    modelName: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getAISettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveAISettings(settings);
    setSaved(true);
    setTimeout(() => {
        setSaved(false);
        onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold font-serif flex items-center gap-2 text-gray-800">
              <Settings size={20} className="text-gray-600" />
              AI 设置
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API 提供商</label>
              <div className="flex gap-2 bg-stone-100 p-1 rounded-lg">
                <button
                  onClick={() => setSettings({ ...settings, provider: 'gemini' })}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                    settings.provider === 'gemini' 
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Google Gemini
                </button>
                <button
                  onClick={() => setSettings({ ...settings, provider: 'openai' })}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                    settings.provider === 'openai' 
                    ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  OpenAI / Custom
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
                <span className="text-xs text-gray-400 font-normal ml-2">
                    {settings.provider === 'gemini' && !settings.apiKey ? '(使用默认环境变量)' : ''}
                </span>
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2.5 bg-stone-50 text-gray-900 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-gray-400"
              />
            </div>

            {settings.provider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
                <input
                  type="text"
                  value={settings.baseUrl}
                  onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2.5 bg-stone-50 text-gray-900 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all placeholder-gray-400"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型名称 (Model)</label>
              <input
                type="text"
                value={settings.modelName}
                onChange={(e) => setSettings({ ...settings, modelName: e.target.value })}
                placeholder={settings.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'}
                className="w-full px-3 py-2.5 bg-stone-50 text-gray-900 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-400 transition-all placeholder-gray-400"
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleSave}
              className={`w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                 saved ? 'bg-green-600' : 'bg-ink hover:bg-gray-800'
              }`}
            >
              {saved ? <Check size={18} /> : null}
              {saved ? '已保存' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
