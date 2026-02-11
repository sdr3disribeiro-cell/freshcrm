import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Company, BuySuggestion } from '../types';
import { calculateBestTimeToBuy, formatCurrency, formatDate } from '../utils';
import { Briefcase, Filter, Search, Calendar, MapPin, CheckSquare, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, RefreshCw, ChevronDown, X } from 'lucide-react';
import { format, addMonths, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';

interface DealsViewProps {
    companies: Company[];
    onCreateCadence: (companies: Company[]) => void;
    onSelectCompany: (company: Company) => void;
}

// --- MultiSelect Component ---
const MultiSelectFilter = ({
    label,
    options,
    selected,
    onChange
}: {
    label: string,
    options: string[],
    selected: string[],
    onChange: (val: string[]) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{label}</label>
            <button
                className={`w-full text-left p-2 bg-slate-50 border rounded-lg text-sm flex justify-between items-center transition-colors ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="truncate flex-1">
                    {selected.length === 0 ? (
                        <span className="text-slate-500">Todos</span>
                    ) : selected.length === 1 ? (
                        <span className="text-slate-800">{selected[0]}</span>
                    ) : (
                        <span className="text-slate-800 bg-blue-100 px-1.5 py-0.5 rounded text-xs font-semibold text-blue-800">
                            {selected.length} selecionados
                        </span>
                    )}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                    {selected.length > 0 && (
                        <div
                            className="p-2 hover:bg-slate-50 cursor-pointer text-xs font-bold text-blue-600 border-b border-slate-100 flex items-center gap-2"
                            onClick={() => onChange([])}
                        >
                            <X size={12} /> Limpar Seleção
                        </div>
                    )}
                    {options.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">Nenhuma opção disponível</div>
                    ) : (
                        options.map(opt => (
                            <div
                                key={opt}
                                className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer"
                                onClick={() => toggleOption(opt)}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                    {selected.includes(opt) && <CheckSquare size={10} className="text-white" />}
                                </div>
                                <span className={`text-sm ${selected.includes(opt) ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>{opt}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};


const DealsView: React.FC<DealsViewProps> = ({ companies, onCreateCadence, onSelectCompany }) => {
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStates, setSelectedStates] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
    const [cycleStatus, setCycleStatus] = useState<'all' | 'short' | 'medium' | 'long'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Selection
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());

    // --- Process Data ---
    const opportunities = useMemo(() => {
        return companies
            .map(c => {
                const suggestion = calculateBestTimeToBuy(c);
                // Calculate LTV
                const ltv = c.purchases?.reduce((acc, p) => acc + (p.value || 0), 0) || c.lastPurchaseValue || 0;
                const ticket = c.purchases?.length > 0 ? ltv / c.purchases.length : ltv;

                return {
                    company: c,
                    suggestion,
                    ltv,
                    ticket
                };
            })
            .filter(item => item.suggestion !== null) // Only show if we have enough data
            .sort((a, b) => {
                // Default sort: Most "Late" first, then by date
                const dateA = new Date(a.suggestion!.nextPurchaseDate).getTime();
                const dateB = new Date(b.suggestion!.nextPurchaseDate).getTime();
                return dateA - dateB;
            });
    }, [companies]);

    // --- Filter Logic ---
    const filteredOpportunities = useMemo(() => {
        return opportunities.filter(({ company, suggestion }) => {
            // 1. Search Term
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const match =
                    company.name.toLowerCase().includes(term) ||
                    company.fantasyName.toLowerCase().includes(term) ||
                    company.cnpj.includes(term);
                if (!match) return false;
            }

            // 2. State (Multi-Select)
            if (selectedStates.length > 0 && !selectedStates.includes(company.state)) return false;

            // 3. City (Multi-Select)
            if (selectedCities.length > 0 && !selectedCities.includes(company.city)) return false;

            // 4. Seller (Multi-Select)
            if (selectedSellers.length > 0 && !selectedSellers.includes(company.representative)) return false;

            // 5. Cycle Status
            if (cycleStatus !== 'all') {
                const days = suggestion!.cycleInDays;
                if (cycleStatus === 'short' && days >= 90) return false;
                if (cycleStatus === 'medium' && (days < 90 || days > 180)) return false;
                if (cycleStatus === 'long' && days <= 180) return false;
            }

            // 6. Date Range (Next Purchase Date)
            if (startDate) {
                const start = startOfDay(new Date(startDate));
                const nextDate = new Date(suggestion!.nextPurchaseDate);
                if (isBefore(nextDate, start)) return false;
            }

            if (endDate) {
                const end = endOfDay(new Date(endDate));
                const nextDate = new Date(suggestion!.nextPurchaseDate);
                if (isAfter(nextDate, end)) return false;
            }

            return true;
        });
    }, [opportunities, searchTerm, selectedStates, selectedCities, selectedSellers, cycleStatus, startDate, endDate]);

    // --- Extract Unique Filter Options ---
    const states = useMemo(() => Array.from(new Set(opportunities.map(o => o.company.state).filter(Boolean))).sort(), [opportunities]);
    const sellers = useMemo(() => Array.from(new Set(opportunities.map(o => o.company.representative).filter(Boolean))).sort(), [opportunities]);

    // Dependent Cities
    const cities = useMemo(() => {
        let relevantOpps = opportunities;
        if (selectedStates.length > 0) {
            relevantOpps = opportunities.filter(o => selectedStates.includes(o.company.state));
        }
        return Array.from(new Set(relevantOpps.map(o => o.company.city).filter(Boolean))).sort();
    }, [opportunities, selectedStates]);


    // --- Handlers ---
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedCompanyIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedCompanyIds(newSet);
    };

    const selectAll = () => {
        if (selectedCompanyIds.size === filteredOpportunities.length) {
            setSelectedCompanyIds(new Set());
        } else {
            setSelectedCompanyIds(new Set(filteredOpportunities.map(o => o.company.id)));
        }
    };

    const handleCreateCadence = () => {
        const selected = companies.filter(c => selectedCompanyIds.has(c.id));
        onCreateCadence(selected);
        setSelectedCompanyIds(new Set());
    };

    // --- Metrics ---
    const totalPotential = filteredOpportunities.reduce((acc, curr) => acc + (curr.company.lastPurchaseValue || 0), 0);
    const avgTicket = filteredOpportunities.length > 0
        ? filteredOpportunities.reduce((acc, curr) => acc + curr.ticket, 0) / filteredOpportunities.length
        : 0;
    const lateCount = filteredOpportunities.filter(o => o.suggestion!.isLate).length;

    return (
        <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="text-blue-600" />
                        Oportunidades de Negócio
                    </h1>
                    <p className="text-slate-500 mt-1">Clientes propensos a comprar novamente (Baseado no histórico)</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            import('canvas-confetti').then((module) => {
                                const confetti = module.default;
                                confetti({
                                    particleCount: 150,
                                    spread: 100,
                                    origin: { y: 0.6 }
                                });
                            });
                            // Play Victory Sound
                            import('../services/soundService').then(({ soundService }) => {
                                soundService.playVictory();
                            });
                        }}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm"
                        title="Celebrar Venda (Teste)"
                    >
                        🎉 Testar Celebração
                    </button>

                    {selectedCompanyIds.size > 0 && (
                        <button
                            onClick={handleCreateCadence}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm animate-in fade-in slide-in-from-right-4"
                        >
                            <Plus size={18} />
                            Criar Cadência ({selectedCompanyIds.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-6 px-8 py-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Filter size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Oportunidades Filtradas</p>
                        <p className="text-2xl font-bold text-slate-800">{filteredOpportunities.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Potencial (Última Compra)</p>
                        <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalPotential)}</p>
                        <p className="text-[10px] text-slate-400">Baseado no último pedido</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <ArrowUpRight size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Ticket Médio (Carteira)</p>
                        <p className="text-2xl font-bold text-slate-800">{formatCurrency(avgTicket)}</p>
                        <p className="text-[10px] text-slate-400">Média histórica dos clientes</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Atrasados</p>
                        <p className="text-2xl font-bold text-slate-800">{lateCount}</p>
                        <p className="text-xs text-red-500 font-medium">Prioridade Alta</p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex px-8 pb-8 gap-6">

                {/* Filters Sidebar */}
                <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 space-y-6 overflow-y-auto">
                    <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                        <Filter size={16} /> Filtros
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Busca</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nome, CNPJ..."
                                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Multi Seller Filter */}
                    <MultiSelectFilter
                        label="Vendedor"
                        options={sellers}
                        selected={selectedSellers}
                        onChange={setSelectedSellers}
                    />

                    {/* Multi State Filter */}
                    <MultiSelectFilter
                        label="Estados (UF)"
                        options={states}
                        selected={selectedStates}
                        onChange={(vals) => { setSelectedStates(vals); setSelectedCities([]); }}
                    />

                    {/* Multi City Filter */}
                    <MultiSelectFilter
                        label="Cidades"
                        options={cities}
                        selected={selectedCities}
                        onChange={setSelectedCities}
                    />

                    {/* Cycle Filter */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Ciclo de Recompra</label>
                        <select
                            value={cycleStatus}
                            onChange={(e) => setCycleStatus(e.target.value as any)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                        >
                            <option value="all">Todos</option>
                            <option value="short">Curto (&lt; 3 meses)</option>
                            <option value="medium">Médio (3 - 6 meses)</option>
                            <option value="long">Longo (&gt; 6 meses)</option>
                        </select>
                    </div>


                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Previsão de Compra</label>
                        <div className="space-y-2">
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">De</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                                />
                            </div>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Até</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => { setSearchTerm(''); setSelectedStates([]); setSelectedCities([]); setSelectedSellers([]); setCycleStatus('all'); setStartDate(''); setEndDate(''); }}
                        className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 underline decoration-dashed"
                    >
                        Limpar Filtros
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <div className="col-span-1 flex items-center justify-center">
                            <button onClick={selectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                <CheckSquare size={16} className={selectedCompanyIds.size === filteredOpportunities.length && filteredOpportunities.length > 0 ? "text-blue-600" : ""} />
                            </button>
                        </div>
                        <div className="col-span-4">Cliente / LTV</div>
                        <div className="col-span-2">Última Compra</div>
                        <div className="col-span-3">Previsão de Recompra</div>
                        <div className="col-span-2 text-right">Ciclo Médio</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {filteredOpportunities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Briefcase size={48} className="mb-4 opacity-20" />
                                <p>Nenhuma oportunidade encontrada com esses filtros.</p>
                            </div>
                        ) : (
                            filteredOpportunities.map(({ company, suggestion, ltv, ticket }) => {
                                const isLate = suggestion!.isLate;
                                const isSelected = selectedCompanyIds.has(company.id);

                                return (
                                    <div
                                        key={company.id}
                                        className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors border-l-4 ${isLate ? 'border-l-red-500' : 'border-l-transparent'} ${isSelected ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="col-span-1 flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelection(company.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>
                                        <div className="col-span-4 cursor-pointer" onClick={() => onSelectCompany(company)}>
                                            <div className="font-bold text-slate-800">{company.fantasyName || company.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <MapPin size={10} />
                                                    {company.city} - {company.state}
                                                </div>
                                                <span className="text-[10px] text-slate-300">|</span>
                                                <div className="text-xs font-bold text-blue-600">
                                                    LTV: {formatCurrency(ltv)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-sm text-slate-600">
                                            <div>{formatDate(company.lastPurchaseDate)}</div>
                                            <div className="text-xs text-slate-500">
                                                Últ: <span className="font-medium text-slate-800">{formatCurrency(company.lastPurchaseValue)}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`text-sm font-bold ${isLate ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {formatDate(suggestion!.nextPurchaseDate?.split('T')[0])}
                                                </div>
                                                {isLate && (
                                                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">
                                                        +{suggestion!.daysLate} dias
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={suggestion!.reason}>
                                                {suggestion!.reason}
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                                <RefreshCw size={10} /> {suggestion!.cycleInDays} dias
                                            </span>
                                            <div className="text-[10px] text-slate-400 mt-1">Ticket: {formatCurrency(ticket)}</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
};

export default DealsView;
