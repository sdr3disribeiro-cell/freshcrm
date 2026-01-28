import React, { useState, useEffect } from 'react';
import { Company, Note, Task, Database, TagColor } from '../types';
import {
  ArrowLeft, Phone, MapPin, Building, Clock, CheckCircle, Plus, Send, X,
  Edit2, Save, AlertTriangle, Calendar as CalendarIcon, Map as MapIcon, ShoppingBag, Truck, Trophy, Mail, Hash
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, generateId, calculateLeadScore, calculateBestTimeToBuy } from '../utils';
import { differenceInDays } from 'date-fns';

interface CompanyDetailProps {
  company: Company;
  notes: Note[];
  tasks: Task[];
  databases: Database[];
  onBack: () => void;
  onUpdate: (company: Company) => void;
  onAddNote: (note: Note) => void;
  onAddTask: (task: Task) => void;
  onToggleTask: (taskId: string) => void;
}

const CompanyDetail: React.FC<CompanyDetailProps> = ({
  company, notes, tasks, databases, onBack, onUpdate, onAddNote, onAddTask, onToggleTask
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'history'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Company>(company);
  const [tagsInput, setTagsInput] = useState(company.tags.join(', '));

  // Update local state when prop changes (e.g. after save)
  useEffect(() => {
    setEditForm(company);
    setTagsInput(company.tags.join(', '));
  }, [company]);

  // Helper for tag colors
  const getTagClass = (tagName: string) => {
    const db = databases.find(d => d.tagName === tagName);
    const color: TagColor = db?.color || 'slate';

    const map: Record<TagColor, string> = {
      slate: 'bg-slate-100 text-slate-600 border-slate-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
      teal: 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return map[color];
  };

  const status = company.isActive ? 'ATIVO' : 'INATIVO';

  // Score Calculation
  const { score, label, color: scoreColor, details: scoreDetails } = calculateLeadScore(company);
  const scoreClass = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    red: 'bg-red-100 text-red-700 border-red-200'
  }[scoreColor];

  const buySuggestion = calculateBestTimeToBuy(company);

  // Sort notes: newest first
  const companyNotes = notes
    .filter(n => n.companyId === company.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Sort tasks: pending first, then by date
  const companyTasks = tasks
    .filter(t => t.companyId === company.id)
    .sort((a, b) => {
      if (a.isCompleted === b.isCompleted) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return a.isCompleted ? 1 : -1;
    });

  // Sort purchases: newest first
  const companyPurchases = (company.purchases || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onAddNote({
      id: generateId(),
      companyId: company.id,
      content: newNote,
      createdAt: new Date().toISOString(),
      type: 'note'
    });
    setNewNote('');
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !newTaskDate) return;
    onAddTask({
      id: generateId(),
      companyId: company.id,
      title: newTaskTitle,
      dueDate: newTaskDate,
      isCompleted: false
    });
    setNewTaskTitle('');
    setNewTaskDate('');
  };

  const handleSaveEdit = () => {
    const updatedCompany = {
      ...editForm,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    };
    onUpdate(updatedCompany);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm(company);
    setTagsInput(company.tags.join(', '));
    setIsEditing(false);
  };

  const handleChange = (field: keyof Company, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const mapQuery = `${company.address || ''} ${company.neighborhood || ''} ${company.city || ''} ${company.state || ''} ${company.zip || ''}`.trim();
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          {isEditing ? (
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="text-xl font-bold text-slate-800 border-b border-blue-300 outline-none placeholder:text-slate-300"
                placeholder="Razão Social"
              />
              <input
                type="text"
                value={editForm.fantasyName}
                onChange={(e) => handleChange('fantasyName', e.target.value)}
                className="text-sm text-slate-500 border-b border-slate-200 outline-none w-48 placeholder:text-slate-300"
                placeholder="Nome Fantasia"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{company.fantasyName || company.name}</h1>
                  {company.fantasyName && <p className="text-xs text-slate-500">{company.name}</p>}
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border ${company.isActive
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                  {status}
                </span>

                {/* Score Badge */}
                <div className={`relative group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide cursor-help ${scoreClass}`}>
                  <Trophy size={10} className="flex-shrink-0" />
                  <span>{score} - {label}</span>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 text-white text-xs rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                    <div className="font-bold mb-1 border-b border-slate-700 pb-1">Detalhamento do Score:</div>
                    {scoreDetails.length > 0 ? (
                      <ul className="list-disc pl-3 space-y-0.5">
                        {scoreDetails.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    ) : (
                      <span className="text-slate-400">Sem pontuação extra.</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{company.fantasyName}</span>
                <span>•</span>
                <span className="font-mono">{company.clientCode}</span>
                <span>•</span>
                <span>{company.region || company.representative}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button onClick={handleCancelEdit} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
              <button onClick={handleSaveEdit} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Save size={18} /> Salvar
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                {company.tags.map(t => (
                  <span key={t} className={`px-2 py-1 text-xs rounded font-medium border ${getTagClass(t)}`}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <button onClick={() => setIsEditing(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Info Card */}
        <div className="w-1/3 min-w-[340px] max-w-md p-6 overflow-y-auto border-r border-slate-200 bg-white">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            Ficha Cadastral
          </h2>

          <div className="space-y-6">

            {/* Financeiro */}
            <div className={`p-4 rounded-lg border ${!company.isActive ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-500 font-semibold uppercase">Dados Comerciais</div>
                {!company.isActive && <AlertTriangle size={14} className="text-red-500" />}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col">
                  <span className="text-sm text-slate-600 mb-1">Última Compra (Data):</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.lastPurchaseDate ? new Date(editForm.lastPurchaseDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleChange('lastPurchaseDate', e.target.value)}
                      className="p-1 border border-slate-300 rounded text-sm w-full"
                    />
                  ) : (
                    <span className="font-medium text-slate-900">{formatDate(company.lastPurchaseDate)}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-slate-600 mb-1">Valor da Compra:</span>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-slate-500 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.lastPurchaseValue || 0}
                        onChange={(e) => handleChange('lastPurchaseValue', parseFloat(e.target.value))}
                        className="p-1 pl-8 border border-slate-300 rounded text-sm w-full font-medium text-green-700"
                      />
                    </div>
                  ) : (
                    <span className="font-bold text-green-600">{formatCurrency(company.lastPurchaseValue)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Inteligência de Compra */}
            {buySuggestion && (
              <div className={`p-4 rounded-lg border ${buySuggestion.isLate ? 'bg-orange-50 border-orange-100' : 'bg-purple-50 border-purple-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase flex items-center gap-2">
                    <Clock size={12} /> Sugestão de Recompra
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-800">
                      {new Date(buySuggestion.nextPurchaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                    {buySuggestion.isLate && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">
                        Atrasado ({buySuggestion.daysLate}d)
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">
                    <p>Ciclo estimado: <strong>{buySuggestion.cycleInDays} dias</strong></p>
                    <p className="opacity-75 text-[10px] mt-0.5">{buySuggestion.reason}</p>
                  </div>

                  <button
                    onClick={() => {
                      setNewTaskTitle(`Contato de Recompra: ${company.fantasyName}`);
                      setNewTaskDate(new Date().toISOString().slice(0, 16));
                      setActiveTab('tasks');
                      setTimeout(() => (document.querySelector('input[type="text"]') as HTMLElement)?.focus(), 100);
                    }}
                    className="mt-1 text-xs bg-white border border-slate-200 shadow-sm py-1.5 rounded text-slate-600 hover:text-blue-600 font-medium transition-colors"
                  >
                    Agendar Contato
                  </button>
                </div>
              </div>
            )}

            {/* Contato */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Building size={16} /> Identificação
              </h3>
              <div className="space-y-3 text-sm text-slate-600 pl-6">
                {isEditing ? (
                  <>
                    <div><label className="text-xs text-slate-400 block">CNPJ</label><input className="w-full border-b border-slate-200 py-1 outline-none" value={editForm.cnpj} onChange={(e) => handleChange('cnpj', e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400 block">Inscrição Estadual</label><input className="w-full border-b border-slate-200 py-1 outline-none" value={editForm.ie} onChange={(e) => handleChange('ie', e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400 block">Telefone</label><input className="w-full border-b border-slate-200 py-1 outline-none" value={editForm.phone} onChange={(e) => handleChange('phone', e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400 block">Celular</label><input className="w-full border-b border-slate-200 py-1 outline-none" value={editForm.mobile} onChange={(e) => handleChange('mobile', e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400 block">Email</label><input className="w-full border-b border-slate-200 py-1 outline-none" value={editForm.email} onChange={(e) => handleChange('email', e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400 block">Região</label><input className="w-full border-b border-slate-200 py-1 outline-none" value={editForm.region} onChange={(e) => handleChange('region', e.target.value)} /></div>
                  </>
                ) : (
                  <>
                    <p className="flex justify-between"><span>CNPJ:</span> <span className="text-slate-900">{company.cnpj}</span></p>
                    <p className="flex justify-between"><span>IE:</span> <span className="text-slate-900">{company.ie || '-'}</span></p>
                    <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {company.phone}</p>
                    <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {company.mobile} (Cel)</p>
                    <p className="flex items-center gap-2 truncate" title={company.email}><Mail size={14} className="text-slate-400" /> {company.email || '-'}</p>
                  </>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <MapPin size={16} /> Endereço
              </h3>
              <div className="space-y-3 text-sm text-slate-600 pl-6">
                {isEditing ? (
                  <>
                    <input placeholder="Endereço" className="w-full border-b border-slate-200 py-1 outline-none" value={editForm.address} onChange={(e) => handleChange('address', e.target.value)} />
                    <div className="flex gap-2">
                      <input placeholder="Bairro" className="w-1/2 border-b border-slate-200 py-1 outline-none" value={editForm.neighborhood} onChange={(e) => handleChange('neighborhood', e.target.value)} />
                      <input placeholder="CEP" className="w-1/2 border-b border-slate-200 py-1 outline-none" value={editForm.zip} onChange={(e) => handleChange('zip', e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <input placeholder="Cidade" className="w-3/4 border-b border-slate-200 py-1 outline-none" value={editForm.city} onChange={(e) => handleChange('city', e.target.value)} />
                      <input placeholder="UF" className="w-1/4 border-b border-slate-200 py-1 outline-none" value={editForm.state} maxLength={2} onChange={(e) => handleChange('state', e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <input placeholder="Cod Cidade" className="w-1/2 border-b border-slate-200 py-1 outline-none" value={editForm.cityCode} onChange={(e) => handleChange('cityCode', e.target.value)} />
                      <input placeholder="IBGE" className="w-1/2 border-b border-slate-200 py-1 outline-none" value={editForm.ibge} onChange={(e) => handleChange('ibge', e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <p>{company.address}</p>
                    <p>{company.neighborhood}</p>
                    <p>{company.city} - {company.state}</p>
                    <p className="flex justify-between"><span className="text-slate-400">CEP:</span> {company.zip}</p>
                    <p className="flex justify-between text-xs text-slate-400"><span>IBGE: {company.ibge}</span> <span>Cod: {company.cityCode}</span></p>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Map */}
            {mapQuery && (
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <MapIcon size={16} /> Localização
                </h3>
                <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
                  <iframe
                    title="Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={mapUrl}
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}

            {/* Tags Edit */}
            {isEditing && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Tags</h3>
                <textarea
                  className="w-full p-2 border border-slate-200 rounded text-sm text-slate-700 h-20 outline-none focus:border-blue-400"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="VIP, Varejo, Novo..."
                />
                <p className="text-[10px] text-slate-400 mt-1">Separe as tags por vírgula.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Tasks */}
        <div className="flex-1 flex flex-col bg-slate-50/50">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-white px-6">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              Timeline de Notas
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              Tarefas
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              Histórico de Compras {companyPurchases.length > 0 && `(${companyPurchases.length})`}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 relative">

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="max-w-2xl mx-auto pb-20">
                {/* Input Area */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 sticky top-0 z-10">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escreva uma nota..."
                    className="w-full text-sm border-0 focus:ring-0 resize-none outline-none text-slate-700 placeholder:text-slate-400 h-20"
                  />
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send size={14} /> Salvar Nota
                    </button>
                  </div>
                </div>

                {/* Stream */}
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                  {companyNotes.map(note => {
                    // Check for styled notes (Cadence Activities)
                    const isSuccess = note.content.includes('✅') || note.content.includes('Sucesso');
                    const isCall = note.content.includes('📞') || note.content.includes('Sem Resposta');
                    const isSchedule = note.content.includes('📅') || note.content.includes('Agendado');
                    const isSkip = note.content.includes('⏭️') || note.content.includes('Pulou');
                    const isAlert = note.content.includes('⚠️');

                    let stampColor = 'border-slate-200 bg-white';
                    let stampIcon = <Clock size={12} />;
                    let stampLabel = 'NOTA';

                    if (isSuccess) {
                      stampColor = 'border-green-200 bg-green-50';
                      stampIcon = <CheckCircle size={14} className="text-green-600" />;
                      stampLabel = 'CONCLUÍDO';
                    } else if (isCall) {
                      stampColor = 'border-orange-200 bg-orange-50';
                      stampIcon = <Phone size={14} className="text-orange-600" />;
                      stampLabel = 'TENTATIVA';
                    } else if (isSchedule) {
                      stampColor = 'border-blue-200 bg-blue-50';
                      stampIcon = <CalendarIcon size={14} className="text-blue-600" />;
                      stampLabel = 'AGENDADO';
                    } else if (isSkip) {
                      stampColor = 'border-slate-300 bg-slate-100';
                      stampIcon = <ArrowLeft size={14} className="text-slate-500 rotate-180" />;
                      stampLabel = 'PULADO';
                    } else if (isAlert) {
                      stampColor = 'border-red-200 bg-red-50';
                      stampIcon = <AlertTriangle size={14} className="text-red-600" />;
                      stampLabel = 'ALERTA';
                    }

                    return (
                      <div key={note.id} className="relative pl-8">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${isSuccess ? 'bg-green-500' : isCall ? 'bg-orange-500' : isSchedule ? 'bg-blue-500' : isAlert ? 'bg-red-500' : 'bg-slate-200'}`}></div>
                        <div className={`p-4 rounded-lg shadow-sm border ${stampColor} transition-all hover:shadow-md`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {stampIcon}
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isSuccess ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                                {stampLabel}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              {formatDateTime(note.createdAt)}
                            </span>
                          </div>
                          <p className={`text-sm whitespace-pre-wrap ${isSuccess ? 'text-green-900 font-medium' : 'text-slate-800'}`}>
                            {note.content.replace(/^[✅📞📅⏭️⚠️].*?\): /, '')}
                            {/* Remove prefix logic for cleaner display, or keep full if preferred. Keeping full for now by just rendering content directly below if Regex fails */}
                          </p>
                          {/* Fallback to full content if regex didn't strip neatly, or just show full content always to be safe? 
                              Let's show full content but maybe styled. 
                          */}
                          {(isSuccess || isCall || isSchedule || isSkip) && (
                            <div className="text-xs opacity-50 mt-1 uppercase tracking-widest font-mono">
                              Via Cadência
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {companyNotes.length === 0 && (
                    <div className="pl-8 text-slate-400 text-sm italic">Nenhuma anotação registrada ainda.</div>
                  )}
                </div>
              </div>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="max-w-2xl mx-auto">
                {/* Add Task */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">O que precisa ser feito?</label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full text-sm border-b border-slate-200 focus:border-blue-500 outline-none py-1"
                      placeholder="Ex: Ligar para confirmar recebimento..."
                    />
                  </div>
                  <div className="w-40">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Para quando?</label>
                    <input
                      type="datetime-local"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full text-sm border-b border-slate-200 focus:border-blue-500 outline-none py-1 text-slate-600"
                    />
                  </div>
                  <button
                    onClick={handleAddTask}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {companyTasks.map(task => (
                    <div
                      key={task.id}
                      className={`group flex items-center p-3 rounded-lg border transition-all ${task.isCompleted
                        ? 'bg-slate-50 border-slate-100 opacity-60'
                        : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                        }`}
                    >
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className={`mr-4 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-300 text-transparent hover:border-blue-400'
                          }`}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {task.title}
                        </h4>
                        <div className={`text-xs mt-0.5 flex items-center gap-1 ${!task.isCompleted && new Date(task.dueDate) < new Date() ? 'text-red-500 font-semibold' : 'text-slate-400'
                          }`}>
                          <CalendarIcon size={12} />
                          {formatDateTime(task.dueDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {companyTasks.length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-8">Nenhuma tarefa pendente.</div>
                  )}
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="max-w-4xl mx-auto">
                {companyPurchases.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl">
                    <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 font-medium">Nenhum histórico de compras encontrado.</p>
                    <p className="text-slate-400 text-sm mt-1">Importe uma base de dados de "Vendas" para popular esta lista.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-xs">
                        <tr>
                          <th className="px-6 py-3">Data</th>
                          <th className="px-6 py-3">Pedido / NF</th>
                          <th className="px-6 py-3 text-right">Valor</th>
                          <th className="px-6 py-3">Vendedor</th>
                          <th className="px-6 py-3">Transportadora</th>
                          <th className="px-6 py-3">Pagamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {companyPurchases.map(purchase => (
                          <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-slate-700">{formatDate(purchase.date)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-slate-800 font-medium">{purchase.orderId}</div>
                              <div className="text-xs text-slate-500">NF: {purchase.invoice || '-'}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-green-600 font-bold">{formatCurrency(purchase.value)}</div>
                              {purchase.discount > 0 && <div className="text-xs text-red-400">desc. {formatCurrency(purchase.discount)}</div>}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {purchase.sellerName}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <div className="flex items-center gap-2">
                                <Truck size={14} className="text-slate-400" />
                                <span className="truncate max-w-[120px]" title={purchase.carrier}>{purchase.carrier}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-xs">
                              {purchase.paymentTerm}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;
