
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Search, Calendar } from 'lucide-react';
import { Essay } from '../types';
import { getEssays, deleteEssay } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface HistoryProps {
  onBack: () => void;
  onOpenEssay: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ onBack, onOpenEssay }) => {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
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

  useEffect(() => {
    setEssays(getEssays());
  }, []);

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setModalConfig({
        isOpen: true,
        title: '删除文章',
        message: '确定要删除这篇文章吗？此操作无法撤销。',
        onConfirm: () => executeDelete(id),
        isDestructive: true
    });
  };

  const executeDelete = (id: string) => {
    deleteEssay(id);
    setEssays(getEssays());
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const filteredEssays = essays.filter(e => 
    (e.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (e.content?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        isDestructive={modalConfig.isDestructive}
        confirmText="删除"
      />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-serif font-bold">文章历史</h1>
        </header>

        <div className="mb-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="搜索标题或内容..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
            />
        </div>

        <div className="space-y-4">
            {filteredEssays.length > 0 ? (
                filteredEssays.map(essay => (
                    <div 
                        key={essay.id}
                        onClick={() => onOpenEssay(essay.id)}
                        className="bg-white p-6 rounded-xl border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer group relative"
                    >
                        <div className="pr-10">
                            <h2 className="text-xl font-serif font-bold text-gray-800 mb-2 group-hover:text-accent transition-colors">
                                {essay.title || "无标题草稿"}
                            </h2>
                            <p className="text-gray-500 text-sm line-clamp-2 mb-4 font-serif">
                                {essay.content || "空白内容..."}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(essay.createdAt).toLocaleDateString()}
                                </span>
                                {essay.topic && (
                                    <span className="bg-stone-100 px-2 py-1 rounded text-stone-500">
                                        {essay.topic}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={(e) => requestDelete(e, essay.id)}
                            className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))
            ) : (
                <div className="text-center py-20 text-gray-400">
                    <p>没有找到相关文章。</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
