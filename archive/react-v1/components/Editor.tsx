import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Brain, X, Check, RefreshCw, Download, History, RotateCcw, Zap, Wand2 } from 'lucide-react';
import { Essay, StructureSuggestion, AIStatus, EssayVersion, CompletionOption } from '../types';
import { analyzeStructure, generateGhostCompletion, generatePolishingOptions } from '../services/geminiService';
import { ConfirmModal } from './ConfirmModal';

// ==========================================
// 子组件：简易 Toast 提示
// ==========================================

const Toast = ({ message, show }: { message: string; show: boolean }) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-2 rounded-full shadow-lg text-sm font-medium z-50 animate-fade-in-up flex items-center gap-2">
      <Check size={16} className="text-green-400" />
      {message}
    </div>
  );
};

// ==========================================
// 主组件：Editor
// ==========================================

interface EditorProps {
  initialEssay: Essay;
  onSave: (essay: Essay) => void;
  onBack: () => void;
}

export const Editor: React.FC<EditorProps> = ({ initialEssay, onSave, onBack }) => {
  
  // ==========================================
  // MARK: - State Management (状态管理)
  // ==========================================

  // 1. 核心文章数据
  const [title, setTitle] = useState(initialEssay.title);
  const [content, setContent] = useState(initialEssay.content);
  const [topic] = useState(initialEssay.topic || '');
  const [versions, setVersions] = useState<EssayVersion[]>(initialEssay.versions || []);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  // 2. AI: 幽灵文本 (Ghost Text) - 智能续写
  const [ghostSuggestions, setGhostSuggestions] = useState<string[]>([]);
  const [ghostIndex, setGhostIndex] = useState(0); // 当前展示第几个候选项
  const [isGhostLoading, setIsGhostLoading] = useState(false);

  // 3. AI: 划词润色 (Polishing) - 选中优化
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);
  const [popupPosition, setPopupPosition] = useState<{top: number} | null>(null);
  const [polishingOptions, setPolishingOptions] = useState<CompletionOption[]>([]);
  const [polishingLoading, setPolishingLoading] = useState(false);

  // 4. AI: 全文结构分析 (Structural Analysis)
  const [analysisStatus, setAnalysisStatus] = useState<AIStatus>(AIStatus.IDLE);
  const [structuralTips, setStructuralTips] = useState<StructureSuggestion[]>([]);
  const [showTips, setShowTips] = useState(false); // 右侧边栏开关

  // 5. UI 交互状态
  const [showTopicDetail, setShowTopicDetail] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // 6. 通用模态框状态
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  });

  // Refs 引用
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null); // 用于实现幽灵文字的覆盖层
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 防抖定时器
  
  // 计算属性
  const ghostText = ghostSuggestions.length > 0 ? ghostSuggestions[ghostIndex] : '';

  // ==========================================
  // MARK: - Effects (副作用)
  // ==========================================

  // 自动保存逻辑：内容变动 2 秒后自动触发
  useEffect(() => {
    const timer = setTimeout(() => {
      // 只有真正变化了才保存，避免初始化时误触
      if (title !== initialEssay.title || content !== initialEssay.content) {
          handleSave(false); 
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, content]);

  // ==========================================
  // MARK: - Core Logic (核心逻辑)
  // ==========================================

  /**
   * 同步滚动逻辑。
   * 确保底层的 Overlay (显示幽灵文字) 与顶层的 Textarea (用户输入) 滚动位置完全一致。
   */
  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  /**
   * 保存文章。
   * 更新 updated_at 并通知父组件持久化。
   */
  const handleSave = (notify = true) => {
    const updatedEssay: Essay = {
      ...initialEssay,
      title,
      content,
      topic,
      versions,
      updatedAt: Date.now(),
    };

    onSave(updatedEssay);
    setLastSaved(Date.now());
    if (notify) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  /**
   * 导出为 Markdown 文件。
   * 使用 Blob 在浏览器端生成文件下载。
   */
  const handleExportMarkdown = () => {
    const markdownContent = `# ${title || 'Untitled'}\n\n${content}`;
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'essay'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // MARK: - Ghost Text Logic (幽灵文字逻辑)
  // ==========================================

  // 触发 AI 续写 (防抖后调用)
  const triggerGhostText = useCallback(async (textToPredict: string) => {
      // 仅当光标位于文末且有一定内容时才触发，避免干扰中间编辑
      if (textareaRef.current && textareaRef.current.selectionStart === textToPredict.length && textToPredict.length > 2) {
             setIsGhostLoading(true);
             const suggestions = await generateGhostCompletion(textToPredict);
             setIsGhostLoading(false);
             
             // 再次检查：请求返回后，确保光标还在文末，否则不显示（防止错位）
             if (textareaRef.current.selectionStart === textToPredict.length) {
                 if (suggestions.length > 0) {
                    setGhostSuggestions(suggestions);
                    setGhostIndex(0);
                 }
             }
        }
  }, []);

  // 处理输入变化
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setGhostSuggestions([]); // 用户打字时立即清除旧建议
    
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }

    // 防抖 1 秒后触发 AI
    typingTimeoutRef.current = setTimeout(() => {
        triggerGhostText(newContent);
    }, 1000);
  };

  // 采纳建议 (Tab 键)
  const acceptGhostText = (e: React.KeyboardEvent) => {
      if (ghostText) {
          e.preventDefault();
          const newContent = content + ghostText;
          setContent(newContent);
          setGhostSuggestions([]);
          
          // 重置光标并尝试连续预测 (Chain Reaction)
          setTimeout(() => {
             if (textareaRef.current) {
                 textareaRef.current.selectionStart = newContent.length;
                 textareaRef.current.selectionEnd = newContent.length;
                 
                 if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                 typingTimeoutRef.current = setTimeout(() => {
                     triggerGhostText(newContent);
                 }, 1500); 
             }
          }, 0);
      }
  };

  // ==========================================
  // MARK: - Selection & Polishing Logic (划词润色)
  // ==========================================

  /**
   * 获取光标坐标。
   * 创建一个隐藏的 div 模拟 textarea 的排版，计算出光标的像素位置，用于定位弹出菜单。
   */
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const styles = getComputedStyle(element);
    const div = document.createElement('div');

    // 复制所有字体样式
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = styles.width;
    div.style.fontFamily = styles.fontFamily;
    div.style.fontSize = styles.fontSize;
    div.style.lineHeight = styles.lineHeight;
    div.style.padding = styles.padding;
    div.style.border = styles.border;
    div.style.boxSizing = styles.boxSizing;

    div.textContent = element.value.substring(0, position);
    
    const span = document.createElement('span');
    span.textContent = '|'; // 模拟光标字符
    div.appendChild(span);

    document.body.appendChild(div);
    const top = span.offsetTop - element.scrollTop; 
    const lineHeight = parseFloat(styles.lineHeight) || 24;
    document.body.removeChild(div);
    
    return { top: top + lineHeight }; // 定位到行底
  };

  // 处理文本选择事件
  const handleSelect = async () => {
      if (!textareaRef.current) return;
      
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const currentSelectionText = content.substring(start, end);

      if ((end - start) > 1) { 
          // 仅当选中内容变化时才触发新的请求
          if (currentSelectionText !== selectedText) {
             setSelectedText(currentSelectionText);
             setSelectionRange({ start, end });
             
             const coords = getCaretCoordinates(textareaRef.current, end);
             setPopupPosition({ top: coords.top + 10 });

             setPolishingLoading(true);
             setPolishingOptions([]); 

             try {
                const options = await generatePolishingOptions(currentSelectionText, content.substring(0, start));
                setPolishingOptions(options);
             } finally {
                setPolishingLoading(false);
             }
          }
      } else {
          // 如果取消选择，清空状态
          if (selectedText) {
             setPolishingOptions([]);
             setSelectedText('');
             setSelectionRange(null);
             setPopupPosition(null);
             setPolishingLoading(false);
          }
      }
  };

  // 应用润色建议
  const applyPolishing = (optionText: string) => {
      if (selectionRange) {
          const before = content.substring(0, selectionRange.start);
          const after = content.substring(selectionRange.end);
          const newContent = before + optionText + after;
          
          setContent(newContent);
          setPolishingOptions([]);
          setSelectedText('');
          setSelectionRange(null);
          setPopupPosition(null);
          
          // 恢复焦点
          setTimeout(() => {
              if (textareaRef.current) {
                  const newPos = selectionRange.start + optionText.length;
                  textareaRef.current.focus();
                  textareaRef.current.setSelectionRange(newPos, newPos);
              }
          }, 0);
      }
  };

  // ==========================================
  // MARK: - Version Control (版本控制)
  // ==========================================

  const requestApplyRewrite = (newContent: string, styleName: string) => {
    setModalConfig({
      isOpen: true,
      title: '应用 AI 建议',
      message: `确定要应用“${styleName}”版本吗？\n当前文章内容将自动备份到“历史版本”中，您可以随时恢复。`,
      onConfirm: () => executeApplyRewrite(newContent, styleName),
      isDestructive: false
    });
  };

  const executeApplyRewrite = (newContent: string, styleName: string) => {
      // 1. 创建备份
      const backupVersion: EssayVersion = {
          timestamp: Date.now(),
          content: content,
          title: title,
          note: `AI重构前 (${styleName})`
      };

      const newVersions = [backupVersion, ...versions];
      
      // 2. 更新状态
      setVersions(newVersions);
      setContent(newContent);
      setShowTips(false);
      setModalConfig(prev => ({ ...prev, isOpen: false }));
      
      // 3. 持久化
      onSave({
          ...initialEssay,
          title,
          content: newContent,
          topic,
          versions: newVersions,
          updatedAt: Date.now(),
      });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
  };

  const requestRestoreVersion = (v: EssayVersion) => {
    setModalConfig({
      isOpen: true,
      title: '恢复历史版本',
      message: `确定要恢复到 ${new Date(v.timestamp).toLocaleTimeString()} 的版本吗？\n当前未保存的修改将被备份。`,
      onConfirm: () => executeRestoreVersion(v),
      isDestructive: false
    });
  };

  const executeRestoreVersion = (v: EssayVersion) => {
     // 自动备份当前未保存的内容，防止意外丢失
     const backupVersion: EssayVersion = {
          timestamp: Date.now(),
          content: content,
          title: title,
          note: `恢复历史前自动备份`
      };
      
      const newVersions = [backupVersion, ...versions];
      setVersions(newVersions);
      setContent(v.content);
      setTitle(v.title);
      setShowVersions(false);
      setModalConfig(prev => ({ ...prev, isOpen: false }));
      
      onSave({
          ...initialEssay,
          title: v.title,
          content: v.content,
          topic,
          versions: newVersions,
          updatedAt: Date.now(),
      });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
  }

  const handleAnalyzeStructure = async () => {
    if (!content.trim()) return;
    setAnalysisStatus(AIStatus.LOADING);
    setShowTips(true);
    const tips = await analyzeStructure(content, topic);
    setStructuralTips(tips);
    setAnalysisStatus(AIStatus.SUCCESS);
  };

  // ==========================================
  // MARK: - Key Bindings (快捷键)
  // ==========================================

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 1. 幽灵文字切换 (Alt + Arrows)
    if (e.altKey && ghostSuggestions.length > 0) {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            setGhostIndex((prev) => (prev + 1) % ghostSuggestions.length);
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setGhostIndex((prev) => (prev - 1 + ghostSuggestions.length) % ghostSuggestions.length);
            return;
        }
    }

    // 2. Tab 键接受建议
    if (e.key === 'Tab') {
        if (ghostText) {
             acceptGhostText(e);
             return;
        }
    }
    
    // 3. Escape 键：清除所有临时 UI 状态
    if (e.key === 'Escape') {
      if (polishingOptions.length > 0 || polishingLoading) {
          setPolishingOptions([]);
          setPolishingLoading(false);
          setSelectedText('');
          if(textareaRef.current) textareaRef.current.focus();
      } else {
        setShowTips(false);
        setShowTopicDetail(false);
        setShowVersions(false);
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
      return;
    }
    
    // 4. 保存快捷键 (Cmd/Ctrl + S)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave(true);
        return;
    }
  };

  // 辅助变量：AI 状态颜色指示器
  let aiStatusColor = 'text-gray-300';
  if (isGhostLoading) aiStatusColor = 'text-yellow-400 animate-pulse';
  else if (ghostSuggestions.length > 0) aiStatusColor = 'text-green-500';

  // ==========================================
  // MARK: - Render (渲染视图)
  // ==========================================

  return (
    <div className="flex flex-col h-screen bg-paper overflow-hidden font-sans">
      <Toast message="已保存" show={showToast} />
      
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        isDestructive={modalConfig.isDestructive}
      />

      {/* --- Top Toolbar (顶部工具栏) --- */}
      <div className="h-16 border-b border-stone-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-widest flex items-center gap-2">
                    <span>DeepFlow 编辑器</span>
                    {/* Ghost Text 状态指示灯 */}
                    <div className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-stone-50 rounded-full border border-stone-100" title={isGhostLoading ? "AI 思考中..." : ghostSuggestions.length > 0 ? "补全就绪" : "AI 待机"}>
                        <Zap size={12} className={aiStatusColor} fill="currentColor" />
                        <span className="text-[10px] text-gray-400">
                            {isGhostLoading ? "Thinking" : ghostSuggestions.length > 0 ? "Ready" : "Idle"}
                        </span>
                    </div>
                </div>
                {lastSaved && <span className="text-[10px] text-gray-300">上次保存: {new Date(lastSaved).toLocaleTimeString()}</span>}
            </div>
        </div>

        <div className="flex items-center gap-2">
           {/* 版本历史下拉菜单 */}
           <div className="relative">
             <button 
                onClick={() => setShowVersions(!showVersions)}
                className={`p-2 rounded-full transition-colors ${showVersions ? 'bg-stone-200 text-gray-800' : 'text-gray-400 hover:bg-stone-100 hover:text-gray-600'}`}
                title="历史版本"
             >
                <History size={18} />
             </button>
             
             {showVersions && (
                 <div className="absolute top-10 right-0 w-64 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50 animate-fade-in max-h-80 overflow-y-auto">
                     <h4 className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">版本历史</h4>
                     {versions.length > 0 ? (
                         versions.map((v, idx) => (
                             <div key={idx} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-lg group">
                                 <div className="flex flex-col overflow-hidden">
                                     <span className="text-sm font-medium text-gray-700">{new Date(v.timestamp).toLocaleTimeString()}</span>
                                     <span className="text-xs text-gray-400 truncate">{v.note || new Date(v.timestamp).toLocaleDateString()}</span>
                                 </div>
                                 <button 
                                    onClick={() => requestRestoreVersion(v)}
                                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                    title="恢复此版本"
                                 >
                                     <RotateCcw size={14} />
                                 </button>
                             </div>
                         ))
                     ) : (
                         <div className="text-center py-4 text-xs text-gray-400">暂无历史版本</div>
                     )}
                 </div>
             )}
           </div>

           <button 
             onClick={handleExportMarkdown}
             className="p-2 text-gray-400 hover:bg-stone-100 hover:text-gray-600 rounded-full transition-colors"
             title="导出为 Markdown"
           >
             <Download size={18} />
           </button>

          <div className="h-6 w-px bg-stone-200 mx-2"></div>

          <button 
            onClick={handleAnalyzeStructure}
            disabled={!content || content.length < 5}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              showTips 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'hover:bg-stone-100 text-gray-600'
            } ${(!content || content.length < 5) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="AI 智能优化"
          >
            <RefreshCw size={16} className={analysisStatus === AIStatus.LOADING ? 'animate-spin' : ''}/>
            <span className="hidden sm:inline">优化建议</span>
          </button>
          
          <button 
            onClick={() => handleSave(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm hover:shadow"
          >
            <Save size={18} />
            <span className="hidden sm:inline">保存</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* --- Main Writing Area (主写作区) --- */}
        <div className="flex-1 overflow-y-auto relative bg-paper" id="editor-container">
          <div className="max-w-3xl mx-auto px-8 py-12 min-h-full relative">
            
            {/* 灵感命题展示 */}
            {topic && (
              <div className="mb-8 relative group">
                 <div className="p-4 bg-stone-50 border-l-4 border-accent rounded-r-lg text-sm text-gray-600 flex items-start justify-between">
                    <div>
                        <span className="font-bold text-gray-800 block mb-1">思考命题:</span>
                        {topic}
                    </div>
                    {initialEssay.topicDescription && (
                        <button 
                            onClick={() => setShowTopicDetail(!showTopicDetail)}
                            className="p-1 hover:bg-stone-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                            title="查看命题详情"
                        >
                            <Brain size={16} />
                        </button>
                    )}
                 </div>
                 
                 {showTopicDetail && initialEssay.topicDescription && (
                     <div className="mt-2 p-4 bg-white border border-stone-200 shadow-lg rounded-lg text-gray-700 text-sm leading-relaxed animate-fade-in relative z-20">
                         <h4 className="font-bold mb-2 text-gray-900">命题背景</h4>
                         {initialEssay.topicDescription}
                         <button 
                            onClick={() => setShowTopicDetail(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                         >
                             <X size={14} />
                         </button>
                     </div>
                 )}
              </div>
            )}

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="无标题"
              className="w-full text-4xl font-serif font-bold text-ink bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-300 mb-6"
            />
            
            <div className="relative w-full">
              {/* Ghost Text Overlay Layer (幽灵文字叠加层) */}
              <div 
                ref={overlayRef}
                className="absolute top-0 left-0 w-full h-[calc(100vh-300px)] text-lg leading-relaxed font-serif p-0 pointer-events-none whitespace-pre-wrap overflow-hidden"
                style={{ color: 'transparent', zIndex: 0 }}
                aria-hidden="true"
              >
                  {content}
                  <span className={`text-gray-400 opacity-60 bg-indigo-50/50 rounded-sm transition-opacity ${isGhostLoading ? 'animate-pulse' : ''}`}>
                    {ghostText}
                  </span>
              </div>

              {/* 用户输入 Textarea */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onSelect={handleSelect}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                placeholder="在此处开始你的深度思考..."
                className="w-full h-[calc(100vh-300px)] resize-none bg-transparent text-lg leading-relaxed font-serif text-gray-800 focus:outline-none focus:ring-0 p-0 placeholder-gray-300 relative z-10"
                spellCheck={false}
              />

              {/* Inline Polishing Popup (划词润色菜单) */}
              {(polishingOptions.length > 0 || polishingLoading) && popupPosition && (
                  <div 
                    className="absolute z-20 animate-fade-in w-full left-0"
                    style={{ top: popupPosition.top }}
                  >
                     <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-100 p-2 overflow-hidden">
                        <div className="px-3 py-1 flex items-center justify-between border-b border-stone-100 mb-1">
                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                                <Wand2 size={12}/>
                                AI 润色建议
                            </span>
                             <button 
                                onClick={() => { setPolishingOptions([]); setSelectedText(''); setPolishingLoading(false); setPopupPosition(null); }}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        
                        {polishingLoading ? (
                             <div className="px-4 py-4 flex items-center justify-center gap-3 text-sm text-gray-500">
                                <RefreshCw className="animate-spin text-indigo-500" size={16} /> 
                                正在思考优化方案...
                             </div>
                        ) : (
                            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                                {Array.isArray(polishingOptions) && polishingOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => applyPolishing(opt.text)}
                                        className="text-left w-full px-4 py-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-900 text-gray-700 transition-all border border-transparent hover:border-indigo-100 group flex flex-col"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded opacity-80 group-hover:bg-white">{opt.label}</span>
                                            {opt.description && <span className="text-xs text-gray-400 group-hover:text-indigo-400">{opt.description}</span>}
                                        </div>
                                        <div className="text-base font-medium leading-relaxed font-serif">{opt.text}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                     </div>
                  </div>
              )}
            </div>
            
            {/* 空状态提示 */}
            {!content && !ghostText && (
                <div className="mt-12 text-center text-gray-300 pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-50 text-sm">
                        停顿自动补全 • Tab 确认 • Alt+←/→ 切换建议 • 划词优化
                    </div>
                </div>
            )}
            
            {/* 幽灵文字导航提示 */}
            {ghostSuggestions.length > 1 && (
                <div className="fixed bottom-6 right-8 bg-black/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur animate-fade-in z-40 flex items-center gap-2">
                    <span>{ghostIndex + 1}/{ghostSuggestions.length}</span>
                    <div className="h-3 w-px bg-white/20"></div>
                    <span>Alt + ← / → 切换</span>
                </div>
            )}
          </div>
        </div>

        {/* --- Structure Sidebar (右侧结构优化面板) --- */}
        {showTips && (
          <div className="w-[450px] bg-stone-50 border-l border-stone-200 overflow-y-auto shadow-2xl relative transition-transform duration-300 ease-in-out z-20">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-stone-50 pb-4 border-b border-stone-200 z-10">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                        <Brain size={20} className="text-indigo-600" />
                        AI 智能优化
                    </h3>
                    <button onClick={() => setShowTips(false)} className="text-gray-400 hover:text-gray-600 bg-stone-100 p-1 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {analysisStatus === AIStatus.LOADING ? (
                    <div className="space-y-6 animate-pulse mt-10">
                         <div className="flex items-center gap-2 justify-center text-indigo-500 mb-6">
                            <RefreshCw className="animate-spin" /> 正在深度分析文风...
                         </div>
                        <div className="h-4 bg-stone-200 rounded w-3/4 mx-auto"></div>
                        <div className="h-40 bg-white rounded-xl shadow-sm border border-stone-200"></div>
                        <div className="h-40 bg-white rounded-xl shadow-sm border border-stone-200"></div>
                    </div>
                ) : (
                    <div className="space-y-8 pb-10">
                        <p className="text-sm text-gray-500 mb-4 bg-yellow-50 text-yellow-800 p-3 rounded-lg border border-yellow-100">
                           AI 提供了 5 个不同维度的优化版本。应用后，<strong>原文将自动保存到历史版本中</strong>。
                        </p>
                        {Array.isArray(structuralTips) ? structuralTips.map((tip, idx) => (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="bg-stone-100 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                                     <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        {tip.styleName}
                                    </h4>
                                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-stone-200 truncate max-w-[200px]" title={tip.explanation}>
                                        {tip.explanation}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-700 leading-relaxed font-serif whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar mb-4 bg-stone-50 p-3 rounded border border-stone-100">
                                        {tip.rewrittenContent}
                                    </p>
                                    <button 
                                        onClick={() => requestApplyRewrite(tip.rewrittenContent, tip.styleName)}
                                        className="w-full py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={14} /> 
                                        应用此版本 (并备份原文)
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                暂时无法生成结构建议，请稍后再试。
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};