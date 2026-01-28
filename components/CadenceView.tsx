import React, { useState } from 'react';
import { Cadence, Company } from '../types';
import { ArrowLeft, CheckCircle, Circle, Trash2, Phone, MessageSquare, MoreHorizontal, Clock, X, Send, Archive, RefreshCw, CheckSquare, MapPin, Building, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CadenceViewProps {
    cadences: Cadence[];
    companies: Company[];
    onUpdateCadence: (cadence: Cadence) => void;
    onDeleteCadence: (id: string) => void;
    onLogActivity: (companyId: string, content: string) => void;
    onToggleStatus: (cadenceId: string) => void;
    onSelectCompany?: (company: Company) => void; // New prop for navigation
}

const CadenceView: React.FC<CadenceViewProps> = ({ cadences, companies, onUpdateCadence, onDeleteCadence, onLogActivity, onToggleStatus, onSelectCompany }) => {
    const [selectedCadenceId, setSelectedCadenceId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    // State for the modal (Completion OR Just Note)
    const [actionModal, setActionModal] = useState<{
        type: 'completion' | 'note',
        cadence: Cadence,
        companyId: string
    } | null>(null);

    const [noteText, setNoteText] = useState('');

    // Helper to get full company details
    const getCompany = (id: string) => companies.find(c => c.id === id);

    const handleToggleItem = (cadence: Cadence, companyId: string) => {
        // If cadence is completed, prevent changing items
        if (cadence.status === 'completed') return;

        const currentItem = cadence.items.find(i => i.companyId === companyId);
        if (!currentItem) return;

        // If it's currently NOT completed, open the modal to complete it with a note
        if (currentItem.status !== 'completed') {
            setActionModal({ type: 'completion', cadence, companyId });
            setNoteText('');
            return;
        }

        // If it IS completed, just undo it (toggle back to pending) without modal
        const updatedItems = cadence.items.map(item => {
            if (item.companyId === companyId) {
                return {
                    ...item,
                    status: 'pending' as const
                };
            }
            return item;
        });

        onUpdateCadence({ ...cadence, items: updatedItems });
    };

    const handleAddNoteClick = (cadence: Cadence, companyId: string) => {
        if (cadence.status === 'completed') return;
        setActionModal({ type: 'note', cadence, companyId });
        setNoteText('');
    };

    const confirmAction = () => {
        if (!actionModal) return;
        const { type, cadence, companyId } = actionModal;

        if (type === 'completion') {
            // 1. Update Cadence Item Status
            const updatedItems = cadence.items.map(item => {
                if (item.companyId === companyId) {
                    return {
                        ...item,
                        status: 'completed' as const
                    };
                }
                return item;
            });
            onUpdateCadence({ ...cadence, items: updatedItems });

            // 2. Log Activity
            const activityText = noteText.trim()
                ? `✅ Atividade de Cadência (${cadence.name}): ${noteText}`
                : `✅ Atividade concluída na cadência: "${cadence.name}"`;

            onLogActivity(companyId, activityText);

        } else if (type === 'note') {
            // Just log activity, no status change
            if (noteText.trim()) {
                const activityText = `📝 Nota Rápida (${cadence.name}): ${noteText}`;
                onLogActivity(companyId, activityText);
            }
        }

        // 3. Reset
        setActionModal(null);
        setNoteText('');
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir esta cadência?')) {
            onDeleteCadence(id);
            if (selectedCadenceId === id) setSelectedCadenceId(null);
        }
    };

    const handleToggleStatus = (cadence: Cadence) => {
        const isCompleting = cadence.status !== 'completed';
        const msg = isCompleting
            ? 'Deseja concluir esta cadência? Ela será movida para a aba de Concluídas.'
            : 'Deseja reabrir esta cadência?';

        if (confirm(msg)) {
            onToggleStatus(cadence.id);
            // Auto-navigate to the appropriate tab to show the result
            if (isCompleting) {
                setSelectedCadenceId(null);
                setActiveTab('completed');
            } else {
                setSelectedCadenceId(null);
                setActiveTab('active');
            }
        }
    };

    // --- DETAIL VIEW (EXECUTION FLOW) ---
    const [activeItemId, setActiveItemId] = useState<string | null>(null);

    // Auto-select first pending item when opening a cadence
    React.useEffect(() => {
        if (selectedCadenceId && !activeItemId) {
            const cadence = cadences.find(c => c.id === selectedCadenceId);
            if (cadence) {
                const firstPending = cadence.items.find(i => i.status === 'pending');
                if (firstPending) {
                    setActiveItemId(firstPending.companyId);
                } else if (cadence.items.length > 0) {
                    setActiveItemId(cadence.items[0].companyId); // Fallback to first if all done
                }
            }
        }
    }, [selectedCadenceId, cadences]);

    if (selectedCadenceId) {
        const cadence = cadences.find(c => c.id === selectedCadenceId);
        if (!cadence) return <div>Cadência não encontrada.</div>;

        const activeItem = activeItemId ? cadence.items.find(i => i.companyId === activeItemId) : null;
        const activeCompany = activeItem ? getCompany(activeItem.companyId) : null;

        const handleCompleteItem = (result: 'success' | 'no_answer' | 'schedule' | 'skip', note: string = '') => {
            if (!activeItem) return;

            const companyName = activeCompany?.name || 'Cliente';
            let actionLog = '';
            let markCompleted = false;

            switch (result) {
                case 'success':
                    actionLog = `✅ Sucesso (${cadence.name}): Tarefa concluída. ${note}`;
                    markCompleted = true;
                    break;
                case 'no_answer':
                    actionLog = `📞 Sem Resposta (${cadence.name}): Tentativa realizada. ${note}`;
                    // Optional: Don't complete, just log? Or complete step? Usually execute step = complete.
                    markCompleted = true;
                    break;
                case 'schedule':
                    actionLog = `📅 Agendado (${cadence.name}): ${note}`;
                    markCompleted = true;
                    break;
                case 'skip':
                    actionLog = `⏭️ Pulou (${cadence.name}): ${note}`;
                    markCompleted = false; // Just skip focus
                    break;
            }

            if (markCompleted) {
                const updatedItems = cadence.items.map(item =>
                    item.companyId === activeItem.companyId
                        ? { ...item, status: 'completed' as const }
                        : item
                );
                onUpdateCadence({ ...cadence, items: updatedItems });
            }

            if (actionLog) {
                onLogActivity(activeItem.companyId, actionLog);
            }

            // Auto-advance
            const currentIndex = cadence.items.findIndex(i => i.companyId === activeItem.companyId);
            const nextItem = cadence.items.find((i, idx) => idx > currentIndex && i.status === 'pending')
                || cadence.items.find(i => i.status === 'pending'); // Wrap around or find any pending

            if (nextItem) {
                setActiveItemId(nextItem.companyId);
            } else {
                // Check if ALL completed
                const remaining = cadence.items.some(i => i.status === 'pending' && i.companyId !== activeItem.companyId); // check others
                if (!remaining && markCompleted) {
                    alert("Parabéns! Você concluiu todos os leads desta cadência.");
                    // Optional: close or stay
                }
            }
        };

        return (
            <div className="flex-1 h-full flex flex-col bg-slate-100 overflow-hidden">
                {/* Header Navbar */}
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedCadenceId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">{cadence.name}</h1>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{cadence.items.filter(i => i.status === 'completed').length} / {cadence.items.length} concluídos</span>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(cadence.items.filter(i => i.status === 'completed').length / cadence.items.length) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => handleToggleStatus(cadence)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-4 ${cadence.status === 'completed'
                            ? 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                            }`}
                    >
                        {cadence.status === 'completed' ? (
                            <>
                                <RefreshCw size={16} /> Reabrir
                            </>
                        ) : (
                            <>
                                <CheckSquare size={16} /> Concluir Cadência
                            </>
                        )}
                    </button>
                </div>

                {/* Main Content: Split View */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT SIDEBAR: QUEUE */}
                    <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fila de Execução</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {cadence.items.map((item, idx) => {
                                const company = getCompany(item.companyId);
                                const isActive = activeItemId === item.companyId;
                                const isDone = item.status === 'completed';

                                return (
                                    <div
                                        key={item.companyId}
                                        onClick={() => setActiveItemId(item.companyId)}
                                        className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors flex items-center gap-3
                                            ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}
                                            ${isDone ? 'opacity-60 bg-slate-50' : ''}
                                        `}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 
                                            ${isDone ? 'bg-green-100 text-green-600' : (isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500')}
                                        `}>
                                            {isDone ? <CheckCircle size={14} /> : (idx + 1)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                {company?.fantasyName || company?.name || `ID: ${item.companyId}`}
                                            </p>
                                            {company?.city && <p className="text-xs text-slate-400 truncate">{company.city}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT MAIN STAGE: FOCUS MODE */}
                    <div className="flex-1 overflow-y-auto p-8 relative">
                        {activeCompany ? (
                            <div className="max-w-4xl mx-auto space-y-6">

                                {/* Company Header Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h2 className="text-3xl font-bold text-slate-800">{activeCompany.fantasyName || activeCompany.name}</h2>
                                                {activeCompany.isActive ? (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">ATIVO</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">INATIVO</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {activeCompany.city && (
                                                    <span className="flex items-center gap-1 text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                        <MapPin size={14} /> {activeCompany.city} - {activeCompany.state}
                                                    </span>
                                                )}
                                                {activeCompany.tags.map(tag => (
                                                    <span key={tag} className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onSelectCompany && onSelectCompany(activeCompany)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                        >
                                            Ver Perfil Completo <ArrowLeft size={14} className="rotate-180" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                    {/* Column 1: Contact Info */}
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Contatos</h3>
                                            <div className="space-y-4">
                                                {activeCompany.mobile && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                                            <MessageSquare size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-400">WhatsApp / Celular</p>
                                                            <a href={`https://wa.me/55${activeCompany.mobile.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-base font-medium text-slate-800 hover:text-green-600 hover:underline">
                                                                {activeCompany.mobile}
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                                {activeCompany.phone && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                            <Phone size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-400">Telefone Fixo</p>
                                                            <a href={`tel:${activeCompany.phone.replace(/\D/g, '')}`} className="text-base font-medium text-slate-800 hover:text-blue-600 hover:underline">
                                                                {activeCompany.phone}
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                                {activeCompany.email && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                            <Send size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-400">Email</p>
                                                            <a href={`mailto:${activeCompany.email}`} className="text-base font-medium text-slate-800 hover:text-indigo-600 hover:underline break-all">
                                                                {activeCompany.email}
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                                {!activeCompany.mobile && !activeCompany.phone && !activeCompany.email && (
                                                    <p className="text-slate-400 italic">Sem informações de contato.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Última Compra</h3>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-3xl font-bold text-slate-800">
                                                        {activeCompany.lastPurchaseValue ? activeCompany.lastPurchaseValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {activeCompany.lastPurchaseDate ? `Em ${format(new Date(activeCompany.lastPurchaseDate), "ddd, d 'de' MMM 'de' yyyy", { locale: ptBR })}` : 'Nunca comprou'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Action Script & Buttons */}
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
                                            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                                                <h3 className="text-blue-800 font-bold flex items-center gap-2">
                                                    <CheckCircle size={18} /> Tarefa Atual
                                                </h3>
                                            </div>
                                            <div className="p-6">
                                                <p className="text-slate-700 text-lg leading-relaxed mb-6">
                                                    {cadence.description || "Realizar contato de prospecção/acompanhamento com o cliente."}
                                                </p>

                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <button
                                                        onClick={() => handleCompleteItem('success')}
                                                        className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                                                    >
                                                        <CheckCircle className="w-6 h-6" /> Concluído
                                                    </button>
                                                    <button
                                                        onClick={() => handleCompleteItem('no_answer')}
                                                        className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-3 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Phone className="w-5 h-5" /> Sem Resposta
                                                    </button>
                                                    <button
                                                        onClick={() => handleCompleteItem('skip')}
                                                        className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-3 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <ArrowLeft className="w-5 h-5 rotate-180" /> Pular
                                                    </button>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Adicionar nota rápida (opcional)..."
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleCompleteItem('success', e.currentTarget.value);
                                                                e.currentTarget.value = '';
                                                            }
                                                        }}
                                                    />
                                                    <div className="absolute right-3 top-2.5 text-slate-400">
                                                        <StickyNote size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Building size={64} className="mb-4 opacity-20" />
                                {cadence.items.length === 0 ? (
                                    <p>Esta cadência não tem itens.</p>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-medium text-slate-600">Nada selecionado</h3>
                                        <p>Selecione um cliente na fila à esquerda.</p>
                                        <div className="mt-6 flex flex-col gap-2 w-full max-w-sm">
                                            {cadence.items.some(i => !getCompany(i.companyId)) && (
                                                <div className="bg-red-50 p-4 rounded-lg flex items-center gap-3 text-red-600 text-sm">
                                                    <X />
                                                    <span>Existem IDs não encontrados nesta cadência. Verifique a lista.</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }


    // --- LIST VIEW ---

    const displayedCadences = cadences.filter(c => {
        const status = c.status || 'active'; // Default to active for legacy data
        return status === activeTab;
    });

    return (
        <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden">
            <div className="px-8 py-6">
                <h1 className="text-2xl font-bold text-slate-800">Cadências</h1>
                <p className="text-slate-500 mt-1">Checklists de prospecção e acompanhamento</p>
            </div>

            <div className="px-8 mb-6">
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'active'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <RefreshCw size={16} />
                        Em Andamento
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1">
                            {cadences.filter(c => (c.status || 'active') === 'active').length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'completed'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Archive size={16} />
                        Concluídas
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1">
                            {cadences.filter(c => c.status === 'completed').length}
                        </span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedCadences.map(cadence => {
                        const completedCount = cadence.items.filter(i => i.status === 'completed').length;
                        const total = cadence.items.length;
                        const progress = total > 0 ? (completedCount / total) * 100 : 0;
                        const isCompleted = cadence.status === 'completed';

                        return (
                            <div
                                key={cadence.id}
                                onClick={() => setSelectedCadenceId(cadence.id)}
                                className={`rounded-xl border p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {isCompleted ? <Archive size={20} /> : <CheckCircle size={20} />}
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(cadence.id, e)}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <h3 className={`text-lg font-bold mb-1 ${isCompleted ? 'text-slate-600' : 'text-slate-800'}`}>
                                    {cadence.name}
                                </h3>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">
                                    {cadence.description || "Sem descrição."}
                                </p>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-slate-600">
                                        <span>Progresso</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`h-full ${isCompleted ? 'bg-slate-400' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2 text-right">
                                        {completedCount} de {total} leads
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {displayedCadences.length === 0 && (
                        <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <p className="text-slate-400 mb-2 font-medium">
                                {activeTab === 'active' ? 'Nenhuma cadência em andamento.' : 'Nenhuma cadência concluída.'}
                            </p>
                            {activeTab === 'active' && (
                                <p className="text-sm text-slate-500">Selecione empresas na lista principal para criar uma.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CadenceView;