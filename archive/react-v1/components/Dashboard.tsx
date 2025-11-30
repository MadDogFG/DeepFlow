
import React, { useState, useEffect, useRef } from 'react';
    import { Plus, BookOpen, Sparkles, Feather, ArrowRight, Upload, Settings, Search } from 'lucide-react';
    import { Essay, PromptIdea, AIStatus } from '../types';
    import { getEssays, saveEssay } from '../services/storage';
    import { generateInspiration } from '../services/geminiService';
    import { v4 as uuidv4 } from 'uuid';
    import { SettingsModal } from './SettingsModal';
    
    interface DashboardProps {
      onNewEssay: (topic?: string, topicDescription?: string) => void;
      onOpenEssay: (id: string) => void;
      onViewHistory: () => void;
    }
    
    export const Dashboard: React.FC<DashboardProps> = ({ onNewEssay, onOpenEssay, onViewHistory }) => {
      const [recentEssays, setRecentEssays] = useState<Essay[]>([]);
      const [dailyPrompt, setDailyPrompt] = useState<PromptIdea | null>(null);
      const [promptStatus, setPromptStatus] = useState<AIStatus>(AIStatus.IDLE);
      const [isSettingsOpen, setIsSettingsOpen] = useState(false);
      const [inspirationHint, setInspirationHint] = useState('');
      const fileInputRef = useRef<HTMLInputElement>(null);
    
      useEffect(() => {
        const all = getEssays();
        setRecentEssays(all.slice(0, 3)); // Show top 3 recent
      }, []);
    
      const fetchInspiration = async () => {
        setPromptStatus(AIStatus.LOADING);
        const idea = await generateInspiration(inspirationHint);
        setDailyPrompt(idea);
        setPromptStatus(AIStatus.SUCCESS);
      };

      const handleImportClick = () => {
        fileInputRef.current?.click();
      };

      const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                // Infer title from filename or first line
                let title = file.name.replace('.md', '');
                // Simple logic: if first line starts with #, use it as title
                const lines = content.split('\n');
                if (lines.length > 0 && lines[0].startsWith('# ')) {
                    title = lines[0].replace('# ', '').trim();
                }

                const newEssay: Essay = {
                    id: uuidv4(),
                    title: title,
                    content: content,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    versions: []
                };
                saveEssay(newEssay);
                onOpenEssay(newEssay.id);
            }
        };
        reader.readAsText(file);
      };
    
      return (
        <div className="max-w-4xl mx-auto px-6 py-12 font-sans text-ink relative">
          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="absolute top-8 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-stone-100 rounded-full transition-colors"
            title="设置"
          >
            <Settings size={20} />
          </button>

          <header className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 tracking-tight">DeepFlow</h1>
            <p className="text-gray-500 text-lg">记录思考，认识真我</p>
          </header>
    
          {/* Inspiration Section */}
          <section className="mb-12 bg-white rounded-2xl p-8 shadow-sm border border-stone-100 relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -z-10 opacity-60"></div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Sparkles size={20} />
              </div>
              <h2 className="text-xl font-bold font-serif">灵感火花</h2>
            </div>
    
            {dailyPrompt ? (
              <div className="animate-fade-in">
                <h3 className="text-2xl font-serif font-medium mb-3 text-gray-800 leading-snug">
                  {dailyPrompt.topic}
                </h3>
                <p className="text-gray-600 mb-8 leading-relaxed max-w-2xl">
                  {dailyPrompt.description}
                </p>
                <div className="flex gap-4">
                    <button
                      onClick={() => onNewEssay(dailyPrompt.topic, dailyPrompt.description)}
                      className="flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
                    >
                      <Feather size={18} />
                      <span>以此题开始写作</span>
                    </button>
                    <button
                      onClick={() => setDailyPrompt(null)}
                      className="px-6 py-3 rounded-full border border-stone-200 hover:bg-stone-50 text-gray-600 transition-colors"
                    >
                      重置
                    </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                 <div className="max-w-md mx-auto mb-6 relative">
                     <input 
                        type="text"
                        value={inspirationHint}
                        onChange={(e) => setInspirationHint(e.target.value)}
                        placeholder="给 AI 一个关键词 (可选)..."
                        className="w-full px-5 py-3 bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-accent/50 text-center placeholder-gray-400"
                        onKeyDown={(e) => e.key === 'Enter' && fetchInspiration()}
                     />
                 </div>

                <p className="text-gray-500 mb-6 text-sm">点击生成获取今日深度话题，或输入关键词定向探索。</p>
                
                <button
                  onClick={fetchInspiration}
                  disabled={promptStatus === AIStatus.LOADING}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-gray-700 font-medium bg-white shadow-sm"
                >
                  {promptStatus === AIStatus.LOADING ? (
                    <span className="animate-pulse">思维激荡中...</span>
                  ) : (
                    <>
                      <Sparkles size={18} className="text-accent" />
                      <span>{inspirationHint ? '生成定制命题' : '随机获取命题'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
    
          {/* Recent & Actions */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-400 uppercase tracking-wider text-xs mb-4">开始</h3>
              <button
                onClick={() => onNewEssay()}
                className="w-full text-left p-6 bg-white rounded-xl border border-stone-100 shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-stone-100 p-3 rounded-full group-hover:bg-stone-200 transition-colors">
                    <Plus size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <span className="block font-bold text-lg text-gray-800">自由写作</span>
                    <span className="text-sm text-gray-500">无题，随心而动</span>
                  </div>
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
              </button>
    
              <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={onViewHistory}
                    className="w-full text-left p-6 bg-white rounded-xl border border-stone-100 shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group"
                  >
                     <div className="bg-stone-100 p-3 rounded-full group-hover:bg-stone-200 transition-colors">
                        <BookOpen size={24} className="text-gray-700" />
                      </div>
                      <span className="font-bold text-gray-800">历史文章</span>
                  </button>

                  <button
                    onClick={handleImportClick}
                    className="w-full text-left p-6 bg-white rounded-xl border border-stone-100 shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group"
                  >
                     <div className="bg-stone-100 p-3 rounded-full group-hover:bg-stone-200 transition-colors">
                        <Upload size={24} className="text-gray-700" />
                      </div>
                      <span className="font-bold text-gray-800">导入 MD</span>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".md,.txt" 
                        className="hidden" 
                      />
                  </button>
              </div>
            </div>
    
            {/* Recent List */}
            <div>
              <h3 className="text-lg font-bold text-gray-400 uppercase tracking-wider text-xs mb-4">最近编辑</h3>
              {recentEssays.length > 0 ? (
                <div className="space-y-3">
                  {recentEssays.map((essay) => (
                    <div
                      key={essay.id}
                      onClick={() => onOpenEssay(essay.id)}
                      className="p-4 bg-white rounded-lg border border-transparent hover:border-stone-200 cursor-pointer transition-all hover:bg-stone-50 group"
                    >
                      <h4 className="font-serif font-bold text-gray-800 truncate mb-1 group-hover:text-accent transition-colors">
                        {essay.title || "无标题"}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {new Date(essay.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-stone-50 rounded-xl border border-dashed border-stone-200 p-6">
                  <p>暂无记录</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };
