import React, { useState, useMemo } from 'react';
import { Company, TagColor, Database } from '../types';
import { generateItineraryPDF, formatCurrency, formatDate } from '../utils';
import { Map, Filter, Printer, Search, MapPin, AlertTriangle, CheckCircle, Tag, X, Navigation, Edit3, ArrowUp, ArrowDown, ArrowUpDown, Copy } from 'lucide-react';


interface RoteiroViewProps {
    companies: Company[];
    databases: Database[];
    onCreateCadence: (companies: Company[], name?: string) => void;
}

type SortField = 'city' | 'name' | 'address' | 'status' | 'tags' | 'notes';
type SortOrder = 'asc' | 'desc';

const RoteiroView: React.FC<RoteiroViewProps> = ({ companies, databases, onCreateCadence }) => {
    // State for Filters
    const [selectedStates, setSelectedStates] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showOnlyDelinquent, setShowOnlyDelinquent] = useState(false);
    const [itineraryTitle, setItineraryTitle] = useState('Roteiro da Semana');
    const [citySearch, setCitySearch] = useState('');
    const [excludeDelinquents, setExcludeDelinquents] = useState(false);
    const [excludeCPFs, setExcludeCPFs] = useState(false);

    const handleCreateCadenceClick = () => {
        let companiesToUse = sortedCompanies;
        if (excludeDelinquents) {
            companiesToUse = companiesToUse.filter(c => !c.delinquencyHistory?.some(d => d.status === 'pending'));
        }
        onCreateCadence(companiesToUse, itineraryTitle);
    };

    // State for Sorting
    const [sortField, setSortField] = useState<SortField>('city');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // State for Itinerary Notes
    const [rowNotes, setRowNotes] = useState<Record<string, string>>({});

    // Extract Unique Data for Filter Lists
    const uniqueStates = useMemo(() => {
        return [...new Set(companies.map(c => c.state).filter(Boolean))].sort();
    }, [companies]);

    const uniqueCities = useMemo(() => {
        let filtered = companies;
        if (selectedStates.length > 0) {
            filtered = filtered.filter(c => selectedStates.includes(c.state));
        }
        return [...new Set(filtered.map(c => c.city).filter(Boolean))].sort();
    }, [companies, selectedStates]);

    const uniqueTags = useMemo(() => {
        const tags = new Set<string>();
        companies.forEach(c => c.tags.forEach(t => tags.add(t)));
        return [...tags].sort();
    }, [companies]);

    // Filtering Logic
    const filteredCompanies = useMemo(() => {
        return companies.filter(c => {
            // State Filter
            if (selectedStates.length > 0 && !selectedStates.includes(c.state)) return false;

            // City Filter
            if (selectedCities.length > 0 && !selectedCities.includes(c.city)) return false;

            // Tag Filter
            if (selectedTags.length > 0) {
                const hasTag = c.tags.some(t => selectedTags.includes(t));
                if (!hasTag) return false;
            }

            // Delinquency Filter
            const isDelinquent = c.delinquencyHistory?.some(d => d.status === 'pending');
            if (showOnlyDelinquent && !isDelinquent) return false;

            // Exclude Delinquents (Checkbox)
            if (excludeDelinquents && isDelinquent) return false;

            // Exclude CPF Filter
            if (excludeCPFs) {
                const cleanDoc = c.cnpj ? c.cnpj.replace(/\D/g, '') : '';
                // Rule: If exists and length <= 11 (CPF), exclude.
                if (cleanDoc.length > 0 && cleanDoc.length <= 11) return false;
            }

            return true;
        });
    }, [companies, selectedStates, selectedCities, selectedTags, showOnlyDelinquent, excludeDelinquents, excludeCPFs]);

    // Sorting Logic
    const sortedCompanies = useMemo(() => {
        return [...filteredCompanies].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'city':
                    // Sort by City then State
                    comparison = (a.city || '').localeCompare(b.city || '') || (a.state || '').localeCompare(b.state || '');
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'address':
                    comparison = (a.address || '').localeCompare(b.address || '') || (a.neighborhood || '').localeCompare(b.neighborhood || '');
                    break;
                case 'status':
                    // Custom Logic: Delinquent First, then by Value
                    const isDelinquentA = a.delinquencyHistory?.some(d => d.status === 'pending') ? 1 : 0;
                    const isDelinquentB = b.delinquencyHistory?.some(d => d.status === 'pending') ? 1 : 0;

                    if (isDelinquentA !== isDelinquentB) {
                        comparison = isDelinquentB - isDelinquentA; // 1 (Yes) comes before 0 (No)
                    } else {
                        comparison = (b.lastPurchaseValue || 0) - (a.lastPurchaseValue || 0); // High value first
                    }
                    break;
                case 'tags':
                    comparison = a.tags.join('').localeCompare(b.tags.join(''));
                    break;
                case 'notes':
                    const noteA = rowNotes[a.id] || '';
                    const noteB = rowNotes[b.id] || '';
                    comparison = noteA.localeCompare(noteB);
                    break;
                default:
                    comparison = 0;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [filteredCompanies, sortField, sortOrder, rowNotes]);

    // Handlers
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const toggleState = (state: string) => {
        setSelectedStates(prev =>
            prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
        );
        // Reset cities when state changes to avoid invalid selections
        setSelectedCities([]);
    };

    const toggleCity = (city: string) => {
        setSelectedCities(prev =>
            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
        );
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleNoteChange = (id: string, text: string) => {
        setRowNotes(prev => ({ ...prev, [id]: text }));
    };

    const handlePrint = () => {
        if (sortedCompanies.length === 0) return;
        generateItineraryPDF(sortedCompanies, itineraryTitle, rowNotes);
    };

    const clearFilters = () => {
        setSelectedStates([]);
        setSelectedCities([]);
        setSelectedTags([]);
        setShowOnlyDelinquent(false);
        setRowNotes({});
        setSortField('city');
    };

    // Helper for tag colors (High Contrast)
    const getTagClass = (tagName: string) => {
        const db = databases.find(d => d.tagName === tagName);
        const color: TagColor = db?.color || 'slate';
        const map: Record<TagColor, string> = {
            slate: 'bg-slate-100 text-slate-700 border-slate-300',
            blue: 'bg-blue-100 text-blue-800 border-blue-300',
            green: 'bg-green-100 text-green-800 border-green-300',
            red: 'bg-red-100 text-red-800 border-red-300',
            orange: 'bg-orange-100 text-orange-800 border-orange-300',
            purple: 'bg-purple-100 text-purple-800 border-purple-300',
            pink: 'bg-pink-100 text-pink-800 border-pink-300',
            teal: 'bg-teal-100 text-teal-800 border-teal-300',
        };
        return map[color];
    };

    const filteredCityList = uniqueCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

    // Render Sort Icon
    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
        return sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />;
    };

    // Text Export Logic
    const handleCopyText = async () => {
        if (sortedCompanies.length === 0) return;

        const groupedByCity: Record<string, Company[]> = {};

        sortedCompanies.forEach(c => {
            const city = c.city || 'SEM CIDADE';
            if (!groupedByCity[city]) groupedByCity[city] = [];
            groupedByCity[city].push(c);
        });

        let textOutput = '';

        Object.keys(groupedByCity).sort().forEach(city => {
            textOutput += `${city.toUpperCase()}\n\n`;

            groupedByCity[city].forEach(c => {
                const date = formatDate(c.lastPurchaseDate);
                const value = formatCurrency(c.lastPurchaseValue);

                let line = `${c.fantasyName || c.name} - ${date} - ${value}`;

                // Append specific tags inline or status
                const pendencyTags = c.tags.filter(t =>
                    t.toUpperCase().includes('PENDENCIA') ||
                    t.toUpperCase().includes('PENDÊNCIA') ||
                    t.toUpperCase().includes('DEBITO') ||
                    t.toUpperCase().includes('DÉBITO')
                );

                if (pendencyTags.length > 0) {
                    const tagText = pendencyTags.join(', ');
                    line += ` - *${tagText.toUpperCase()}*`;
                } else {
                    // Check for delinquency history even without tags
                    const isDelinquent = c.delinquencyHistory?.some(d => d.status === 'pending');
                    if (isDelinquent) {
                        line += ` - *INADIMPLENTE*`;
                    }
                }

                textOutput += `${line}\n\n`;
            });
        });

        try {
            await navigator.clipboard.writeText(textOutput);
            alert("Roteiro copiado para a área de transferência!");
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback...', err);

            // Fallback for insecure contexts (HTTP)
            try {
                const textArea = document.createElement("textarea");
                textArea.value = textOutput;

                // Ensure it's not visible but part of the DOM
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    alert("Roteiro copiado para a área de transferência! (Fallback)");
                } else {
                    throw new Error("Fallback failed");
                }
            } catch (fallbackErr) {
                console.error('Fallback copy failed: ', fallbackErr);
                alert("Não foi possível copiar automaticamente. Por favor, tente selecionar e copiar manualmente.");
            }
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Map className="text-blue-600" />
                        Gerador de Roteiro
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Planeje visitas selecionando cidades e gerando PDFs personalizados.</p>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input
                        type="text"
                        value={itineraryTitle}
                        onChange={(e) => setItineraryTitle(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-3 py-2 text-sm w-48 outline-none focus:border-blue-500"
                        placeholder="Nome do Roteiro"
                    />

                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={excludeDelinquents}
                            onChange={(e) => setExcludeDelinquents(e.target.checked)}
                            className="rounded border-slate-300 text-red-600 focus:ring-0 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-600">Excluir Inadimplentes</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={excludeCPFs}
                            onChange={(e) => setExcludeCPFs(e.target.checked)}
                            className="rounded border-slate-300 text-slate-600 focus:ring-0 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-600">Ocultar CPF</span>
                    </label>

                    <button
                        onClick={handleCreateCadenceClick}
                        disabled={sortedCompanies.length === 0}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <CheckCircle size={18} />
                        Criar Cadência
                    </button>

                    <button
                        onClick={handlePrint}
                        disabled={sortedCompanies.length === 0}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <Printer size={18} />
                        PDF
                    </button>

                    <button
                        onClick={handleCopyText}
                        disabled={sortedCompanies.length === 0}
                        className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Copiar Roteiro como Texto"
                    >
                        <Copy size={18} />
                        Texto
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Filters */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-y-auto z-10">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Filter size={18} /> Filtros de Rota
                        </h3>
                        <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">Limpar</button>
                    </div>

                    {/* Status Filter */}
                    <div className="p-4 border-b border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer group bg-white border border-slate-200 p-2 rounded-lg hover:border-slate-300 transition-all shadow-sm">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showOnlyDelinquent ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                                {showOnlyDelinquent && <CheckCircle size={14} />}
                            </div>
                            <input type="checkbox" className="hidden" checked={showOnlyDelinquent} onChange={() => setShowOnlyDelinquent(!showOnlyDelinquent)} />
                            <span className={`text-sm font-bold ${showOnlyDelinquent ? 'text-red-600' : 'text-slate-600'}`}>Apenas Inadimplentes</span>
                        </label>
                    </div>

                    {/* States Filter */}
                    <div className="p-4 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1"><MapPin size={12} /> Estados (UF)</h4>
                        <div className="flex flex-wrap gap-2">
                            {uniqueStates.map(uf => (
                                <button
                                    key={uf}
                                    onClick={() => toggleState(uf)}
                                    className={`px-3 py-1.5 text-xs rounded border font-bold transition-all shadow-sm ${selectedStates.includes(uf)
                                        ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-100'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                                        }`}
                                >
                                    {uf}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cities Filter */}
                    <div className="p-4 border-b border-slate-100 flex-1 min-h-[250px]">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex justify-between items-center">
                            <span className="flex items-center gap-1"><Navigation size={12} /> Cidades</span>
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">{selectedCities.length}</span>
                        </h4>

                        <div className="relative mb-3">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar cidade..."
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-400"
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {filteredCityList.map(city => (
                                <label key={city} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${selectedCities.includes(city) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedCities.includes(city)}
                                        onChange={() => toggleCity(city)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4"
                                    />
                                    <span className={`text-sm truncate ${selectedCities.includes(city) ? 'text-blue-700 font-semibold' : 'text-slate-600'}`}>{city}</span>
                                </label>
                            ))}
                            {filteredCityList.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Nenhuma cidade encontrada.</div>}
                        </div>
                    </div>

                    {/* Tags Filter */}
                    <div className="p-4 pb-20">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Filtrar por Tags</h4>
                        <div className="space-y-1">
                            {uniqueTags.map(tag => (
                                <label key={tag} className="flex items-center gap-2 cursor-pointer group hover:bg-slate-50 p-1.5 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedTags.includes(tag)}
                                        onChange={() => toggleTag(tag)}
                                        className="rounded border-slate-300 text-blue-600 w-3.5 h-3.5"
                                    />
                                    <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${getTagClass(tag)}`}>{tag}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content (Preview) */}
                <div className="flex-1 bg-slate-50 overflow-y-auto p-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-slate-800">
                                Pré-visualização do Roteiro
                                <span className="ml-2 font-normal text-slate-500 text-sm">({sortedCompanies.length} clientes listados)</span>
                            </h2>

                            {/* Selected Filters Chips */}
                            <div className="flex gap-2 flex-wrap justify-end max-w-xl">
                                {selectedStates.map(s => (
                                    <span key={s} className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center gap-1 shadow-sm font-medium">
                                        {s} <button onClick={() => toggleState(s)} className="hover:text-red-500"><X size={12} /></button>
                                    </span>
                                ))}
                                {selectedCities.map(c => (
                                    <span key={c} className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center gap-1 shadow-sm font-medium">
                                        {c} <button onClick={() => toggleCity(c)} className="hover:text-red-500"><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-xs">
                                    <tr>
                                        <th
                                            className="px-4 py-3 w-[120px] text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
                                            onClick={() => handleSort('city')}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Cidade
                                                {renderSortIcon('city')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 w-1/5 cursor-pointer hover:bg-slate-200 transition-colors select-none"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Empresa / Contato
                                                {renderSortIcon('name')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 w-1/5 cursor-pointer hover:bg-slate-200 transition-colors select-none"
                                            onClick={() => handleSort('address')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Endereço
                                                {renderSortIcon('address')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 w-[140px] cursor-pointer hover:bg-slate-200 transition-colors select-none"
                                            onClick={() => handleSort('status')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Financeiro & Status
                                                {renderSortIcon('status')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 w-[120px] cursor-pointer hover:bg-slate-200 transition-colors select-none"
                                            onClick={() => handleSort('tags')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Tags
                                                {renderSortIcon('tags')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:bg-slate-200 transition-colors select-none"
                                            onClick={() => handleSort('notes')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Anotações (Sairá no PDF)
                                                {renderSortIcon('notes')}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedCompanies.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20 text-slate-400">
                                                <div className="flex flex-col items-center justify-center">
                                                    <MapPin size={48} className="mb-4 opacity-20 text-blue-500" />
                                                    <p className="font-medium text-lg">Nenhum cliente selecionado.</p>
                                                    <p className="text-sm mt-1 max-w-xs mx-auto">Utilize os filtros laterais (Estados e Cidades) para montar sua lista de visitas.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedCompanies.map(company => {
                                            const isDelinquent = company.delinquencyHistory?.some(d => d.status === 'pending');

                                            return (
                                                <tr
                                                    key={company.id}
                                                    className={`transition-colors ${isDelinquent
                                                        ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500'
                                                        : 'hover:bg-blue-50 border-l-4 border-l-transparent'
                                                        }`}
                                                >
                                                    <td className="px-4 py-4 align-middle text-center border-r border-slate-200/60 bg-slate-50/50">
                                                        <div className="font-bold text-slate-800 text-sm">{company.city}</div>
                                                        <div className="text-xs text-slate-500 font-bold uppercase">{company.state}</div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className={`font-bold text-base ${isDelinquent ? 'text-red-700' : 'text-slate-800'}`}>
                                                            {company.fantasyName || company.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5 bg-slate-100 inline-block px-1 rounded">{company.cnpj}</div>
                                                        <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                                                            {company.phone && <div><span className="font-semibold">Tel:</span> {company.phone}</div>}
                                                            {company.representative && <div><span className="font-semibold">Rep:</span> {company.representative}</div>}
                                                            <div className="text-slate-400">Cód: {company.clientCode}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="text-slate-800 font-medium">{company.address}, {company.neighborhood}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">CEP: {company.zip}</div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top text-center">
                                                        {isDelinquent ? (
                                                            <div className="bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200 inline-flex flex-col gap-1 w-full text-center mb-2">
                                                                <div className="flex items-center justify-center gap-1 font-bold text-xs uppercase">
                                                                    <AlertTriangle size={14} /> Inadimplente
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className={`text-xs font-bold px-2 py-0.5 rounded border inline-block mb-2 ${company.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                                {company.isActive ? 'ATIVO' : 'INATIVO'}
                                                            </div>
                                                        )}

                                                        <div className="flex flex-col items-center">
                                                            {company.lastPurchaseValue ? (
                                                                <div className="text-green-700 font-extrabold text-sm">
                                                                    {formatCurrency(company.lastPurchaseValue)}
                                                                </div>
                                                            ) : <span className="text-xs text-slate-400">-</span>}
                                                            <span className="text-[10px] text-slate-500 font-medium">{formatDate(company.lastPurchaseDate)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {company.tags.map(t => (
                                                                <span key={t} className={`px-2 py-1 rounded text-[11px] border font-bold uppercase tracking-wide shadow-sm ${getTagClass(t)}`}>
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top">
                                                        <div className="relative group">
                                                            <textarea
                                                                placeholder="Escreva orientações..."
                                                                value={rowNotes[company.id] || ''}
                                                                onChange={(e) => handleNoteChange(company.id, e.target.value)}
                                                                className="w-full h-20 p-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none transition-shadow"
                                                            />
                                                            <div className="absolute bottom-2 right-2 text-slate-300 pointer-events-none group-focus-within:text-blue-300">
                                                                <Edit3 size={14} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoteiroView;