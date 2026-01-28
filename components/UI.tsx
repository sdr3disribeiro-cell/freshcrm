import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { ToastMessage } from '../types';

// --- TOAST COMPONENTS ---

const icons = {
  success: <CheckCircle size={20} className="text-green-500" />,
  error: <AlertCircle size={20} className="text-red-500" />,
  info: <Info size={20} className="text-blue-500" />,
  warning: <AlertTriangle size={20} className="text-amber-500" />
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className="pointer-events-auto bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-lg rounded-lg p-4 flex gap-3 min-w-[300px] max-w-sm animate-in slide-in-from-right-full duration-300"
        >
          <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{toast.title}</h4>
            {toast.message && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{toast.message}</p>}
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors self-start">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

// --- CONFIRMATION MODAL ---

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  count: number;
  itemName?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, count, itemName = 'itens', onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState('');
  
  // Reset when opening
  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatch = inputValue === count.toString();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col items-center text-center mb-6">
           <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
             <Trash2 size={32} className="text-red-600 dark:text-red-500" />
           </div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white">Confirmar Exclusão</h2>
           <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
             Você está prestes a remover permanentemente <strong className="text-slate-800 dark:text-slate-200">{count} {itemName}</strong>.
             Essa ação não pode ser desfeita.
           </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700 mb-6">
           <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
             Digite "{count}" para confirmar
           </label>
           <input 
             type="text" 
             value={inputValue}
             onChange={(e) => setInputValue(e.target.value)}
             className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none text-center font-mono font-bold"
             placeholder={count.toString()}
             autoFocus
           />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            disabled={!isMatch}
            className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Excluir {count} {itemName}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SKELETON LOADER ---

export const TableSkeleton: React.FC = () => {
  return (
    <div className="w-full animate-pulse space-y-4 p-4">
       {[...Array(5)].map((_, i) => (
         <div key={i} className="flex items-center gap-4">
            <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
         </div>
       ))}
    </div>
  );
}
