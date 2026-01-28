import React, { useState, useRef } from 'react';
import { Upload, Database, FileText, CheckCircle, AlertCircle, Play, RefreshCw, Trash2, Clock, Palette, ShoppingBag, AlertTriangle } from 'lucide-react';
import { parseCSV, formatDateTime } from '../utils';
import { Database as DatabaseType, TagColor } from '../types';

interface DatabaseViewProps {
  databases: DatabaseType[];
  onEnrichDatabase: (tagName: string, rawData: any[], fileName: string, type: DatabaseType['type']) => { matched: number, total: number };
  onUpdateColor: (id: string, color: TagColor) => void;
  onDeleteDatabase: (id: string) => void;
}

const COLORS: { value: TagColor, class: string, label: string }[] = [
    { value: 'slate', class: 'bg-slate-500', label: 'Cinza' },
    { value: 'blue', class: 'bg-blue-500', label: 'Azul' },
    { value: 'green', class: 'bg-green-500', label: 'Verde' },
    { value: 'red', class: 'bg-red-500', label: 'Vermelho' },
    { value: 'orange', class: 'bg-orange-500', label: 'Laranja' },
    { value: 'purple', class: 'bg-purple-500', label: 'Roxo' },
    { value: 'pink', class: 'bg-pink-500', label: 'Rosa' },
    { value: 'teal', class: 'bg-teal-500', label: 'Turquesa' },
];

const DatabaseView: React.FC<DatabaseViewProps> = ({ databases, onEnrichDatabase, onUpdateColor, onDeleteDatabase }) => {
  const [file, setFile] = useState<File | null>(null);
  const [tagName, setTagName] = useState('');
  const [importType, setImportType] = useState<DatabaseType['type']>('general');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ matched: number, total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Default tag name to filename without extension
      setTagName(selectedFile.name.replace(/\.[^/.]+$/, "").toUpperCase());
      setStatus('idle');
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file || !tagName.trim()) return;
    setStatus('processing');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = parseCSV(text);

        if (data.length === 0) {
            throw new Error("Arquivo vazio ou formato inválido.");
        }

        // Send full raw data to App logic for parsing
        const stats = onEnrichDatabase(tagName.trim(), data, file.name, importType);
        
        setResult(stats);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || "Erro ao processar arquivo.");
      }
    };
    reader.readAsText(file);
  };

  const reset = () => {
    setFile(null);
    setTagName('');
    setImportType('general');
    setStatus('idle');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getColorClass = (color: TagColor) => {
      const map: Record<TagColor, string> = {
          slate: 'bg-slate-100 text-slate-700 border-slate-200',
          blue: 'bg-blue-100 text-blue-700 border-blue-200',
          green: 'bg-green-100 text-green-700 border-green-200',
          red: 'bg-red-100 text-red-700 border-red-200',
          orange: 'bg-orange-100 text-orange-700 border-orange-200',
          purple: 'bg-purple-100 text-purple-700 border-purple-200',
          pink: 'bg-pink-100 text-pink-700 border-pink-200',
          teal: 'bg-teal-100 text-teal-700 border-teal-200',
      };
      return map[color] || map.slate;
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-blue-600" />
            Base de Dados Externas
        </h1>
        <p className="text-slate-500 mt-1">
            Importe listas para enriquecimento de tags, históricos de vendas ou inadimplência.
        </p>
      </div>

      <div className="flex-1 px-8 pb-8 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: UPLOAD */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800">Nova Importação</h2>
                        {file && <button onClick={reset} className="text-xs text-blue-600 hover:underline">Limpar</button>}
                    </div>

                    {!file ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                            <Upload size={32} className="text-slate-400 mb-3" />
                            <p className="font-medium text-slate-600 text-center text-sm">Clique para selecionar CSV</p>
                            <p className="text-xs text-slate-400 mt-1">Suporta: CNPJ (para Tags), Pedidos ou Inadimplência</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded flex items-center justify-center">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 text-sm truncate">{file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            
                            {status !== 'success' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Nome da Tag / Identificador
                                        </label>
                                        <input 
                                            type="text" 
                                            value={tagName}
                                            onChange={(e) => setTagName(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                            placeholder="Ex: VENDAS_2023"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-2">
                                            Tipo de Importação
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                                <input 
                                                    type="radio" 
                                                    name="importType" 
                                                    value="general"
                                                    checked={importType === 'general'} 
                                                    onChange={() => setImportType('general')}
                                                    className="text-blue-600"
                                                />
                                                <div className="text-sm">
                                                    <span className="font-medium text-slate-800 block">Geral / Tags</span>
                                                    <span className="text-xs text-slate-400">Adiciona tags baseado no CNPJ</span>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                                <input 
                                                    type="radio" 
                                                    name="importType" 
                                                    value="sales"
                                                    checked={importType === 'sales'} 
                                                    onChange={() => setImportType('sales')}
                                                    className="text-blue-600"
                                                />
                                                <div className="text-sm">
                                                    <span className="font-medium text-slate-800 block">Histórico de Vendas</span>
                                                    <span className="text-xs text-slate-400">Requer colunas de Pedido e Valor</span>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-red-50 hover:border-red-200">
                                                <input 
                                                    type="radio" 
                                                    name="importType" 
                                                    value="inadimplencia"
                                                    checked={importType === 'inadimplencia'} 
                                                    onChange={() => {
                                                        setImportType('inadimplencia');
                                                        if (tagName && !tagName.includes("INADIMPLENTE")) {
                                                            setTagName("INADIMPLENTES");
                                                        }
                                                    }}
                                                    className="text-red-600"
                                                />
                                                <div className="text-sm">
                                                    <span className="font-medium text-red-800 block">Inadimplência</span>
                                                    <span className="text-xs text-red-600/70">Registra dívidas e marca como inadimplente</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleProcess}
                                        disabled={status === 'processing' || !tagName.trim()}
                                        className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        {status === 'processing' ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                                        Processar
                                    </button>
                                </div>
                            )}

                             {status === 'error' && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2">
                                    <AlertCircle size={14} /> {errorMsg}
                                </div>
                             )}

                            {status === 'success' && result && (
                                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100 animate-in zoom-in-95">
                                    <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
                                    <h3 className="font-bold text-green-800">Concluído!</h3>
                                    <p className="text-xs text-green-700 mt-1">
                                        {result.matched} registros processados de {result.total}.
                                    </p>
                                    <button onClick={reset} className="mt-3 text-xs text-green-700 font-semibold hover:underline">
                                        Nova Importação
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: HISTORY LIST */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[calc(100vh-200px)]">
                     <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800">Bases Registradas</h2>
                        <p className="text-sm text-slate-500">Histórico de importações.</p>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6">
                        {databases.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Database size={48} className="mx-auto mb-3 opacity-20" />
                                <p>Nenhuma base de dados importada ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {databases.sort((a,b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()).map(db => (
                                    <div key={db.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getColorClass(db.color)}`}>
                                                    {db.tagName}
                                                </span>
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Clock size={12} /> {formatDateTime(db.importedAt)}
                                                </span>
                                                {db.type === 'sales' && (
                                                    <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                                        <ShoppingBag size={10} /> Vendas
                                                    </span>
                                                )}
                                                {db.type === 'inadimplencia' && (
                                                    <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                                        <AlertTriangle size={10} /> Inadimplência
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2 text-sm text-slate-600 flex gap-4">
                                                <span><span className="font-semibold text-slate-900">{db.matchedCount}</span> cruzamentos</span>
                                                <span className="text-slate-300">|</span>
                                                <span>Arquivo: {db.fileName}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                                            <div className="flex items-center gap-1">
                                                {COLORS.map(c => (
                                                    <button
                                                        key={c.value}
                                                        onClick={() => onUpdateColor(db.id, c.value)}
                                                        className={`w-6 h-6 rounded-full ${c.class} hover:opacity-80 transition-all ${
                                                            db.color === c.value ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''
                                                        }`}
                                                        title={c.label}
                                                    />
                                                ))}
                                            </div>
                                            <button 
                                                onClick={() => onDeleteDatabase(db.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                     </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default DatabaseView;