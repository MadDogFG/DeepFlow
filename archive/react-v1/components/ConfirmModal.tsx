import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "确定",
  cancelText = "取消",
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-stone-100 transform transition-all scale-100 opacity-100">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-gray-800">
             {isDestructive ? (
                 <div className="p-2 bg-red-100 text-red-500 rounded-full">
                     <AlertTriangle size={24} />
                 </div>
             ) : (
                 <div className="p-2 bg-indigo-100 text-indigo-500 rounded-full">
                     <AlertTriangle size={24} />
                 </div>
             )}
            <h3 className="text-lg font-bold font-serif">{title}</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm shadow-sm ${
                isDestructive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};