import React, { useState, useMemo, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Map as MapIcon, Filter, Printer, Search, MapPin, AlertTriangle, CheckCircle, Tag, X, Navigation, Edit3, ArrowUp, ArrowDown, ArrowUpDown, Copy, Save, User, ListTodo, Calendar, Globe } from 'lucide-react';
import { Company, TagColor, Database, Itinerary } from '../types';
import { generateItineraryPDF, formatCurrency, formatDate, generateId } from '../utils';
import { saveData, loadData } from '../services/storage';
import MapComponent from './MapComponent';
import { holidayService } from '../services/holidayService';
import { cnpjService, CnpjData } from '../services/cnpjService';
import { Briefcase, Building2, AlertCircle, Info, Check } from 'lucide-react';


interface RoteiroViewProps {
    companies: Company[];
    databases: Database[];
    onCreateCadence: (companies: Company[], name?: string) => void;
    onBulkUpdateCompanies: (companies: Company[]) => void;
}

type SortField = 'city' | 'name' | 'address' | 'status' | 'tags' | 'notes';
type SortOrder = 'asc' | 'desc';

const RoteiroView: React.FC<RoteiroViewProps> = ({ companies, databases, onCreateCadence, onBulkUpdateCompanies }) => {
    // State for Filters
    const [selectedStates, setSelectedStates] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showOnlyDelinquent, setShowOnlyDelinquent] = useState(false);
    const [itineraryTitle, setItineraryTitle] = useState('Roteiro da Semana');
    const [citySearch, setCitySearch] = useState('');
    const [excludeDelinquents, setExcludeDelinquents] = useState(false);
    const [excludeCPFs, setExcludeCPFs] = useState(false);

    // New State for Map & Itinerary
    const [showMap, setShowMap] = useState(false);
    const [selectedRepresentative, setSelectedRepresentative] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // New: Date & Holiday Logic
    const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
    const [holidayWarning, setHolidayWarning] = useState<string | null>(null);

    useEffect(() => {
        const checkHoliday = async () => {
            if (!scheduledDate) return;
            const dateObj = new Date(scheduledDate);
            // Heuristic: Check if any selected state matches the holiday level
            // Ideally we'd check against the specific city if selected
            const state = selectedStates.length > 0 ? selectedStates[0] : undefined;
            const holidays = await holidayService.getHolidays(dateObj.getFullYear());

            const match = holidays.find(h => h.date === scheduledDate);

            if (match) {
                setHolidayWarning(`⚠️ Atenção: ${match.date.split('-').reverse().join('/')} é ${match.name} (${match.type === 'national' ? 'Nacional' : 'Regional'})`);
            } else {
                setHolidayWarning(null);
            }
        };
        checkHoliday();
    }, [scheduledDate, selectedStates]);

    const handleCreateCadenceClick = () => {
        let companiesToUse = sortedCompanies;
        if (excludeDelinquents) {
            companiesToUse = companiesToUse.filter(c => !c.delinquencyHistory?.some(d => d.status === 'pending'));
        }
        onCreateCadence(companiesToUse, itineraryTitle);
    };

    // Geocoding Logic (Nominatim Rate Limited)
    const handleGeocodeVisible = async () => {
        if (!confirm("Isso irá buscar as coordenadas reais para as empresas listadas abaixo usando o OpenStreetMap.\n\nDemora cerca de 1 segundo por empresa para respeitar os limites da API.\n\nDeseja continuar?")) return;

        setIsGeocoding(true);
        const companiesToUpdate: Company[] = [];
        const companiesToScan = sortedCompanies.filter(c => !c.lat || !c.lng); // Only those without coords

        for (let i = 0; i < companiesToScan.length; i++) {
            const company = companiesToScan[i];
            const address = company.address || '';
            const city = company.city || '';
            const state = company.state || '';

            // Skip invalid
            if (!city || !state) continue;

            const query = `${address}, ${city}, ${state}, Brazil`;

            try {
                // Rate limit delay (1.1s)
                await new Promise(r => setTimeout(r, 1100));

                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                    headers: {
                        'User-Agent': 'FreshCRM/1.0'
                    }
                });

                const data = await response.json();

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);

                    companiesToUpdate.push({
                        ...company,
                        lat: lat,
                        lng: lon
                    });
                } else {
                    // Try fallback with just City/State
                    await new Promise(r => setTimeout(r, 1100));
                    const fallbackQuery = `${city}, ${state}, Brazil`;
                    const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1`, {
                        headers: { 'User-Agent': 'FreshCRM/1.0' }
                    });
                    const fallbackData = await fallbackRes.json();
                    if (fallbackData && fallbackData.length > 0) {
                        const lat = parseFloat(fallbackData[0].lat);
                        const lon = parseFloat(fallbackData[0].lon);
                        companiesToUpdate.push({
                            ...company,
                            lat: lat,
                            lng: lon
                        });
                    }
                }
            } catch (err) {
                console.error(`Geocoding failed for ${company.name}`, err);
            }
        }

        if (companiesToUpdate.length > 0) {
            onBulkUpdateCompanies(companiesToUpdate);
            alert(`${companiesToUpdate.length} localizações atualizadas com sucesso!`);
        } else {
            alert("Nenhuma localização nova encontrada ou todas já possuem coordenadas.");
        }
        setIsGeocoding(false);
    };

    // State for Sorting
    const [sortField, setSortField] = useState<SortField>('city');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // ... existing ... 

    // Render logic (skipping down to return)

    // ...


    // State for Itinerary Notes
    const [rowNotes, setRowNotes] = useState<Record<string, string>>({});

    // CNPJ Validation State
    const [cnpjData, setCnpjData] = useState<Record<string, CnpjData>>({});
    const [cnpjStatus, setCnpjStatus] = useState<Record<string, 'loading' | 'valid' | 'invalid' | 'error'>>({});
    const [isCheckingCnpj, setIsCheckingCnpj] = useState(false);
    const [selectedCnpjModal, setSelectedCnpjModal] = useState<string | null>(null);

    const handleCheckCnpj = async (companyId: string, cnpj: string) => {
        if (!cnpj) {
            alert("CNPJ vazio!");
            return;
        }

        const clean = cnpj.replace(/\D/g, '');
        if (clean.length !== 14) {
            alert(`CNPJ inválido para consulta (deve ter 14 dígitos): '${cnpj}' -> Clean: '${clean}'`);
            return;
        }

        setCnpjStatus(prev => ({ ...prev, [companyId]: 'loading' }));
        try {
            console.log(`Consultando CNPJ: ${clean}`);
            const data = await cnpjService.consultCnpj(cnpj);
            if (data) {
                setCnpjData(prev => ({ ...prev, [companyId]: data }));
                const isValid = data.situacao_cadastral === 'ATIVA';
                setCnpjStatus(prev => ({ ...prev, [companyId]: isValid ? 'valid' : 'invalid' }));
            }
        } catch (error: any) {
            console.error(error);
            setCnpjStatus(prev => ({ ...prev, [companyId]: 'error' }));
            alert(`Erro na API: ${error.message}`);
        }
    };

    const handleBulkCnpjCheck = async () => {
        const potential = sortedCompanies.filter(c => c.cnpj);
        const validLength = potential.filter(c => c.cnpj.replace(/\D/g, '').length === 14);

        if (!confirm(`Encontradas ${validLength.length} empresas com CNPJ válido (de ${potential.length} totais).\n\nDeseja iniciar a validação?`)) return;

        setIsCheckingCnpj(true);
        // Only existing and valid length CNPJs (14 digits)
        const companiesToScan = validLength;

        for (let i = 0; i < companiesToScan.length; i++) {
            const company = companiesToScan[i];

            if (cnpjStatus[company.id] === 'valid') continue;

            await handleCheckCnpj(company.id, company.cnpj);
            await new Promise(r => setTimeout(r, 1000));
        }
        setIsCheckingCnpj(false);
        alert("Validação em massa concluída!");
    };

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

    const uniqueRepresentatives = useMemo(() => {
        return [
            "BARBALHO", "CALÓ", "NIVALDO", "HENRIQUE", "FABINHO", "ALEXANDRE",
            "ITAMAR", "JORGE", "VALMI", "TANAKA", "ALDO", "CARLOS",
            "JULIO", "DIEGO", "DELSON", "HUDSON"
        ].sort();
    }, []);

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

    const mapRef = useRef<HTMLDivElement>(null);

    const handlePrint = async () => {
        if (sortedCompanies.length === 0) return;

        let mapImage = undefined;
        if (showMap && mapRef.current) {
            try {
                // Wait a bit for map to fully render tiles if just opened? 
                // Ideally we assume it's stable.
                const canvas = await html2canvas(mapRef.current, {
                    useCORS: true,
                    allowTaint: true,
                    logging: false
                });
                mapImage = canvas.toDataURL('image/png');
            } catch (e) {
                console.error("Error capturing map for PDF:", e);
            }
        }

        generateItineraryPDF(sortedCompanies, itineraryTitle, rowNotes, mapImage);
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

    const handleSaveItinerary = async () => {
        if (!itineraryTitle) {
            alert("Por favor, dê um nome ao roteiro.");
            return;
        }
        if (!selectedRepresentative) {
            alert("Por favor, selecione um representante responsável.");
            return;
        }

        setIsSaving(true);
        try {
            const currentData = await loadData();

            const newItinerary: Itinerary = {
                id: generateId(),
                title: itineraryTitle,
                representativeId: selectedRepresentative, // Using name as ID for simplicity if no auth system
                representativeName: selectedRepresentative,
                companyIds: sortedCompanies.map(c => c.id),
                createdAt: new Date().toISOString(),
                scheduledDate: scheduledDate || new Date().toISOString(), // Use selected date
                notes: rowNotes,
                routeOrder: sortedCompanies.map(c => c.id)
            };

            const updatedItineraries = [...(currentData.itineraries || []), newItinerary];

            await saveData({
                ...currentData,
                itineraries: updatedItineraries
            });

            alert("Roteiro salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar roteiro:", error);
            alert("Erro ao salvar roteiro.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyText = async () => {
        if (sortedCompanies.length === 0) return;
        // ... (existing implementation) ...
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

    // State for Saved Itineraries
    const [showSavedList, setShowSavedList] = useState(false);
    const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);

    // Load Itineraries on Mount or when Panel Opens
    useEffect(() => {
        if (showSavedList) {
            loadData().then(data => {
                if (data.itineraries) {
                    setSavedItineraries(data.itineraries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                }
            });
        }
    }, [showSavedList]);

    const handleLoadItinerary = (itinerary: Itinerary) => {
        setItineraryTitle(itinerary.title);
        setSelectedRepresentative(itinerary.representativeId);
        setRowNotes(itinerary.notes || {});

        const itineraryCompanies = companies.filter(c => itinerary.companyIds.includes(c.id));
        const cities = [...new Set(itineraryCompanies.map(c => c.city).filter(Boolean))];
        const states = [...new Set(itineraryCompanies.map(c => c.state).filter(Boolean))];

        setSelectedCities(cities);
        setSelectedStates(states);

        alert(`Roteiro carregado! Filtros de cidade e estado aplicados para ${itineraryCompanies.length} empresas.`);
        setShowSavedList(false);
    };

    const handleDeleteItinerary = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja excluir este roteiro?")) return;

        try {
            const currentData = await loadData();
            const newItineraries = (currentData.itineraries || []).filter(i => i.id !== id);
            await saveData({ ...currentData, itineraries: newItineraries });
            setSavedItineraries(newItineraries);
        } catch (error) {
            console.error("Erro ao excluir", error);
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden relative">
            {/* Saved Itineraries Overlay/Drawer */}
            {showSavedList && (
                <div className="absolute inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
                    <div className="w-96 bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <ListTodo size={18} className="text-blue-600" /> Meus Roteiros
                            </h3>
                            <button onClick={() => setShowSavedList(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {savedItineraries.length === 0 ? (
                                <div className="text-center text-slate-400 py-10">
                                    <p>Nenhum roteiro salvo.</p>
                                </div>
                            ) : (
                                savedItineraries.map(itinerary => (
                                    <div key={itinerary.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-300 shadow-sm transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-700 text-sm line-clamp-1">{itinerary.title}</h4>
                                            <button
                                                onClick={(e) => handleDeleteItinerary(itinerary.id, e)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                                title="Excluir"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="text-xs text-slate-500 space-y-1 mb-3">
                                            <div className="flex items-center gap-1"><User size={10} /> {itinerary.representativeName || 'Sem Rep.'}</div>
                                            <div className="flex items-center gap-1"><Calendar size={10} /> {new Date(itinerary.createdAt).toLocaleDateString()}</div>
                                            <div className="flex items-center gap-1"><MapPin size={10} /> {itinerary.companyIds.length} paradas</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleLoadItinerary(itinerary)}
                                                className="flex-1 bg-blue-50 text-blue-700 text-xs font-bold py-1.5 rounded hover:bg-blue-100 transition-colors"
                                            >
                                                Carregar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const companiesToCadence = companies.filter(c => itinerary.companyIds.includes(c.id));
                                                    onCreateCadence(companiesToCadence, `Cadência - ${itinerary.title}`);
                                                }}
                                                className="px-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                                                title="Criar Cadência"
                                            >
                                                <ListTodo size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <MapIcon className="text-blue-600" />
                        Gerador de Roteiro
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Planeje visitas selecionando cidades e gerando PDFs personalizados.</p>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setShowSavedList(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                        title="Abrir Roteiros Salvos"
                    >
                        <ListTodo size={18} />
                        <span className="text-sm hidden sm:inline">Meus Roteiros</span>
                    </button>

                    <div className="h-6 w-px bg-slate-300 mx-1"></div>

                    <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className={`bg-white border rounded px-3 py-2 text-sm outline-none focus:border-blue-500 ${holidayWarning ? 'border-red-500 text-red-600 font-bold animate-pulse' : 'border-slate-300'}`}
                        title="Data do Roteiro"
                    />

                    <input
                        type="text"
                        value={itineraryTitle}
                        onChange={(e) => setItineraryTitle(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-3 py-2 text-sm w-40 outline-none focus:border-blue-500"
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

                    <select
                        value={selectedRepresentative}
                        onChange={(e) => setSelectedRepresentative(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 max-w-[150px]"
                    >
                        <option value="">Selecione Rep.</option>
                        {uniqueRepresentatives.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleGeocodeVisible}
                        disabled={isGeocoding || sortedCompanies.length === 0}
                        className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors border ${isGeocoding ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        title="Buscar Localização Real (Geocoding)"
                    >
                        <Globe size={18} className={isGeocoding ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => setShowMap(!showMap)}
                        className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors border ${showMap ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        title={showMap ? "Ocultar Mapa" : "Ver Mapa Interativo"}
                    >
                        <MapIcon size={18} />
                    </button>

                    <button
                        onClick={handleSaveItinerary}
                        disabled={sortedCompanies.length === 0 || isSaving}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Salvar Roteiro"
                    >
                        <Save size={18} />
                        {isSaving ? '...' : 'Salvar'}
                    </button>

                    <button
                        onClick={handleCreateCadenceClick}
                        disabled={sortedCompanies.length === 0}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Criar Cadência Agora"
                    >
                        <CheckCircle size={18} />
                    </button>

                    <button
                        onClick={handlePrint}
                        disabled={sortedCompanies.length === 0}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Exportar PDF"
                    >
                        <Printer size={18} />
                    </button>

                    <button
                        onClick={handleCopyText}
                        disabled={sortedCompanies.length === 0}
                        className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Copiar Roteiro como Texto"
                    >
                        <Copy size={18} />
                    </button>

                    <button
                        onClick={handleBulkCnpjCheck}
                        disabled={sortedCompanies.length === 0 || isCheckingCnpj}
                        className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Validar CNPJs em Massa"
                    >
                        {isCheckingCnpj ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Briefcase size={18} />}
                    </button>
                </div>
            </div>

            {holidayWarning && (
                <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-red-700 text-sm font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
                    <AlertTriangle size={16} />
                    {holidayWarning}
                </div>
            )}

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
                <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col relative">
                    {/* Map Overlay or Section */}
                    {showMap && (
                        <div ref={mapRef} className="h-1/2 min-h-[300px] border-b border-slate-200 z-0">
                            <MapComponent companies={sortedCompanies} />
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-6">
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

                                                // Derive Logic for CNPJ Icon
                                                const cData = cnpjData[company.id];
                                                let cStatus = cnpjStatus[company.id];

                                                if (cData) {
                                                    const st = String(cData.situacao_cadastral);
                                                    if (st === '2' || st === 'ATIVA') cStatus = 'valid';
                                                    else cStatus = 'invalid';
                                                }

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
                                                            <div className="flex items-center justify-center gap-2 mt-1">
                                                                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                    {company.state}
                                                                </span>
                                                                {company.cnpj && (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => handleCheckCnpj(company.id, company.cnpj)}
                                                                            disabled={cStatus === 'loading'}
                                                                            className={`p-1 rounded-full hover:bg-slate-100 transition-colors ${cStatus === 'valid' ? 'text-green-500' : cStatus === 'invalid' ? 'text-red-500' : cStatus === 'error' ? 'text-orange-500' : 'text-slate-400'}`}
                                                                            title={cStatus === 'valid' ? 'CNPJ Ativo' : cStatus === 'invalid' ? 'CNPJ Inapto/Baixado' : 'Consultar na Receita'}
                                                                        >
                                                                            {cStatus === 'loading' ? (
                                                                                <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                                                                            ) : cStatus === 'valid' ? (
                                                                                <Check size={12} strokeWidth={3} />
                                                                            ) : cStatus === 'invalid' ? (
                                                                                <AlertCircle size={12} />
                                                                            ) : (
                                                                                <Search size={12} />
                                                                            )}
                                                                        </button>
                                                                        {cnpjData[company.id] && (
                                                                            <button
                                                                                onClick={() => setSelectedCnpjModal(company.id)}
                                                                                className="text-blue-600 hover:text-blue-800"
                                                                                title="Ver Detalhes da Receita"
                                                                            >
                                                                                <Info size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 align-top">
                                                            <div className={`font-bold text-base ${isDelinquent ? 'text-red-700' : 'text-slate-800'}`}>
                                                                {company.fantasyName || company.name}
                                                            </div>
                                                            <div className="text-xs text-slate-500 font-mono mt-0.5 bg-slate-100 inline-block px-1 rounded">{company.cnpj}</div>
                                                            <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                                                                {company.phone && <div><span className="font-semibold">Tel:</span> {company.phone}</div>}
                                                                <div><span className="font-semibold">Rep:</span> {company.representative || 'Sem Rep.'}</div>
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
            {/* CNPJ Details Modal */}
            {selectedCnpjModal && cnpjData[selectedCnpjModal] && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full animate-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Building2 size={18} className="text-blue-600" />
                                Dados da Receita Federal
                            </h3>
                            <button onClick={() => setSelectedCnpjModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${String(cnpjData[selectedCnpjModal].situacao_cadastral) === '2' || cnpjData[selectedCnpjModal].situacao_cadastral === 'ATIVA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {String(cnpjData[selectedCnpjModal].situacao_cadastral) === '2' || cnpjData[selectedCnpjModal].situacao_cadastral === 'ATIVA' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Situação Cadastral</p>
                                    <p className={`text-lg font-bold ${String(cnpjData[selectedCnpjModal].situacao_cadastral) === '2' || cnpjData[selectedCnpjModal].situacao_cadastral === 'ATIVA' ? 'text-green-700' : 'text-red-700'}`}>
                                        {String(cnpjData[selectedCnpjModal].situacao_cadastral) === '2' ? 'ATIVA' : cnpjData[selectedCnpjModal].situacao_cadastral}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold">Razão Social</p>
                                    <p className="text-sm text-slate-800 leading-tight">{cnpjData[selectedCnpjModal].razao_social}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold">Nome Fantasia</p>
                                    <p className="text-sm text-slate-800 leading-tight">{cnpjData[selectedCnpjModal].nome_fantasia || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 font-bold">Atividade Principal (CNAE)</p>
                                    <p className="text-sm text-slate-800 leading-tight">{cnpjData[selectedCnpjModal].cnae_fiscal_descricao}</p>
                                </div>
                                <div className="col-span-2 bg-slate-50 p-3 rounded border border-slate-200">
                                    <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><MapPin size={12} /> Endereço Oficial</p>
                                    <p className="text-sm text-slate-700">
                                        {cnpjData[selectedCnpjModal].logradouro}, {cnpjData[selectedCnpjModal].numero} <br />
                                        {cnpjData[selectedCnpjModal].bairro} - {cnpjData[selectedCnpjModal].municipio}/{cnpjData[selectedCnpjModal].uf} <br />
                                        CEP: {cnpjData[selectedCnpjModal].cep}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
                            <button
                                onClick={() => setSelectedCnpjModal(null)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium text-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoteiroView;