import React, { useState } from 'react';
import { X, CalendarClock, Plus, Check } from 'lucide-react';
import { Company, Cadence } from '../types';

interface CadenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCompanies: Company[];
  existingCadences: Cadence[];
  onConfirm: (cadenceId: string | null, newCadenceName?: string) => void;
}

const CadenceModal: React.FC<CadenceModalProps> = ({ isOpen, onClose, selectedCompanies, existingCadences, onConfirm }) => {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedCadenceId, setSelectedCadenceId] = useState<string>('');
  const [newCadenceName, setNewCadenceName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (mode === 'select' && selectedCadenceId) {
      onConfirm(selectedCadenceId);
      onClose();
    } else if (mode === 'create' && newCadenceName.trim()) {
      onConfirm(null, newCadenceName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarClock size={22} className="text-blue-600" /> 
              Adicionar à Cadência
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Selecionado: <span className="font-semibold text-slate-800">{selectedCompanies.length} clientes</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button 
              onClick={() => setMode('select')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'select' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Selecionar Existente
            </button>
            <button 
              onClick={() => setMode('create')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Criar Nova
            </button>
          </div>

          {mode === 'select' ? (
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Escolha uma Cadência</label>
               {existingCadences.length > 0 ? (
                 <div className="space-y-2 max-h-60 overflow-y-auto">
                   {existingCadences.map(cadence => (
                     <div 
                        key={cadence.id}
                        onClick={() => setSelectedCadenceId(cadence.id)}
                        className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${
                          selectedCadenceId === cadence.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                     >
                       <div>
                         <p className="font-medium text-slate-800">{cadence.name}</p>
                         <p className="text-xs text-slate-500">{cadence.items.length} leads</p>
                       </div>
                       {selectedCadenceId === cadence.id && <Check size={18} className="text-blue-600" />}
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500 text-sm">
                   Nenhuma cadência encontrada. Crie uma nova.
                 </div>
               )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Nova Cadência</label>
              <input 
                type="text" 
                value={newCadenceName}
                onChange={(e) => setNewCadenceName(e.target.value)}
                placeholder="Ex: Prospecção Julho, Recuperação..."
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-2">
                Essa cadência funcionará como um checklist para trabalhar os leads selecionados.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={mode === 'select' ? !selectedCadenceId : !newCadenceName.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {mode === 'create' ? <Plus size={18} /> : <Check size={18} />}
             Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CadenceModal;