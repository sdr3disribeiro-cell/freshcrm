import React, { useState, useRef, useEffect } from 'react';
import { Company, Database, TagColor, ToastType } from '../types';
import {
  Search, SlidersHorizontal, ArrowUpDown, ChevronDown, Check,
  MessageSquare, Trash2, Download, MoreVertical, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, EyeOff, Globe, Loader2, FileText, FileSpreadsheet,
  GripVertical, Filter, X, Trophy, Map as MapIcon
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, calculateLeadScore, generateItineraryPDF } from '../utils';
import { differenceInDays } from 'date-fns';
import { TableSkeleton, DeleteConfirmationModal } from './UI';
import { useDebounce } from '../hooks/useDebounce';

interface CompanyListProps {
  companies: Company[];
  databases: Database[];
  onSelectCompany: (company: Company) => void;
  onAddToCadence: (companies: Company[]) => void;
  onDeleteCompanies: (ids: string[]) => void;
  onExportCompanies: (ids: string[], format: 'csv' | 'pdf', fileName?: string) => void;
  onBulkUpdateCompanies: (companies: Company[]) => void;
  addToast: (type: ToastType, title: string, message?: string) => void;
}

// Updated SortFields to match new schema
type SortField = 'clientCode' | 'isActive' | 'type' | 'cnpj' | 'ie' | 'name' | 'fantasyName' | 'address' | 'neighborhood' | 'zip' | 'ibge' | 'cityCode' | 'city' | 'state' | 'phone' | 'mobile' | 'fax' | 'email' | 'birthDate' | 'lastPurchaseDate' | 'lastPurchaseValue' | 'region' | 'score' | 'receitaStatus';

type SortOrder = 'asc' | 'desc';

// Updated Column Keys to match user request
type ColumnKey = 'codigo' | 'ativo' | 'tipo' | 'cnpj' | 'ie' | 'nome' | 'nomeFantasia' | 'endereco' | 'bairro' | 'cep' | 'ibge' | 'codCidade' | 'cidade' | 'estado' | 'telefone' | 'celular' | 'fax' | 'email' | 'nascimento' | 'ultimaCompra' | 'vlrUltimaCompra' | 'regiao' | 'score' | 'receitaStatus' | 'tags';

const CompanyList: React.FC<CompanyListProps> = ({
  companies, databases, onSelectCompany, onAddToCadence, onDeleteCompanies, onExportCompanies, onBulkUpdateCompanies, addToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<SortField>('lastPurchaseDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [receitaFilter, setReceitaFilter] = useState<string>('all');
  const [isProcessingApi, setIsProcessingApi] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Safe Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, count: number }>({ isOpen: false, count: 0 });

  // Drag and Drop State
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);

  // UI States
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<ColumnKey | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsInitialLoad(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Column Configuration - Default visible columns (customizable)
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>([
    'score', 'codigo', 'ativo', 'nome', 'nomeFantasia', 'cnpj', 'cidade', 'estado', 'regiao', 'telefone', 'celular', 'ultimaCompra', 'vlrUltimaCompra', 'tags'
  ]);

  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    score: true,
    codigo: true,
    ativo: true,
    tipo: false,
    cnpj: true,
    ie: false,
    nome: true,
    nomeFantasia: true,
    endereco: false,
    bairro: false,
    cep: false,
    ibge: false,
    codCidade: false,
    cidade: true,
    estado: true,
    telefone: true,
    celular: true,
    fax: false,
    email: false,
    nascimento: false,
    ultimaCompra: true,
    vlrUltimaCompra: true,
    regiao: true,
    receitaStatus: false,
    tags: true
  });

  useEffect(() => {
    const handleClickOutside = () => setActiveHeaderMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const getTagClass = (tagName: string) => {
    const db = databases.find(d => d.tagName === tagName);
    const color: TagColor = db?.color || 'slate';

    const map: Record<TagColor, string> = {
      slate: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
      green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
      red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
      orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
      purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
      pink: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
      teal: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
    };
    return map[color];
  };

  // Helper to extract string value for filtering
  const getCellValueString = (company: Company, key: ColumnKey): string => {
    switch (key) {
      case 'codigo': return company.clientCode || '';
      case 'ativo': return company.isActive ? 'Sim' : 'Não';
      case 'tipo': return company.type || '';
      case 'cnpj': return company.cnpj || '';
      case 'ie': return company.ie || '';
      case 'nome': return company.name || '';
      case 'nomeFantasia': return company.fantasyName || '';
      case 'endereco': return company.address || '';
      case 'bairro': return company.neighborhood || '';
      case 'cep': return company.zip || '';
      case 'ibge': return company.ibge || '';
      case 'codCidade': return company.cityCode || '';
      case 'cidade': return company.city || '';
      case 'estado': return company.state || '';
      case 'telefone': return company.phone || '';
      case 'celular': return company.mobile || '';
      case 'fax': return company.fax || '';
      case 'email': return company.email || '';
      case 'nascimento': return formatDate(company.birthDate);
      case 'ultimaCompra': return formatDate(company.lastPurchaseDate);
      case 'vlrUltimaCompra': return company.lastPurchaseValue ? formatCurrency(company.lastPurchaseValue) : '';
      case 'regiao': return company.region || company.representative || '';
      case 'tags': return company.tags.join(' ');
      case 'receitaStatus': return company.receitaStatus || '';
      case 'score':
        const { score, label } = calculateLeadScore(company);
        return `${score} ${label}`;
      default: return '';
    }
  };

  // Filter Logic with Multi-term support
  const filteredCompanies = companies.filter(c => {
    // 1. Global Search (Multi-term AND logic)
    const terms = debouncedSearchTerm.toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length > 0) {
      // All terms must match at least one field in the company
      const allTermsMatch = terms.every(term => {
        return (
          c.name.toLowerCase().includes(term) ||
          c.fantasyName?.toLowerCase().includes(term) ||
          c.clientCode.toLowerCase().includes(term) ||
          c.cnpj.includes(term) ||
          c.city.toLowerCase().includes(term) ||
          c.state.toLowerCase().includes(term) ||
          (c.region || '').toLowerCase().includes(term) ||
          c.tags.some(t => t.toLowerCase().includes(term)) ||
          (c.isActive ? 'ativo' : 'inativo').includes(term)
        );
      });

      if (!allTermsMatch) return false;
    }

    // 2. Column Filters
    for (const key of Object.keys(columnFilters)) {
      const filterVal = columnFilters[key]?.toLowerCase();
      if (!filterVal) continue;

      const cellVal = getCellValueString(c, key as ColumnKey).toLowerCase();
      if (!cellVal.includes(filterVal)) return false;
    }

    // 3. Receita Filter
    if (receitaFilter !== 'all') {
      if (receitaFilter === 'unknown') {
        return !c.receitaStatus;
      }
      return c.receitaStatus === receitaFilter;
    }

    return true;
  });

  // Sort
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let valA: any = a[sortField as keyof Company];
    let valB: any = b[sortField as keyof Company];

    // Special mappings for fields that don't match 1:1 with sortField name
    if (sortField === 'region') {
      valA = a.region || a.representative;
      valB = b.region || b.representative;
    }

    // Custom sort for Score
    if (sortField === 'score') {
      valA = calculateLeadScore(a).score;
      valB = calculateLeadScore(b).score;
    }

    if (valA === undefined) valA = '';
    if (valB === undefined) valB = '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // --- API Integration ---
  const handleVerifyReceita = async () => {
    const companiesToCheck = companies.filter(c => selectedIds.has(c.id));
    if (companiesToCheck.length === 0) return;

    setIsProcessingApi(true);
    const updatedList: Company[] = [];

    for (const comp of companiesToCheck) {
      const cleanCnpj = comp.cnpj.replace(/[^\d]/g, '');
      if (cleanCnpj.length !== 14) {
        updatedList.push({ ...comp, lastReceitaCheck: new Date().toISOString() });
        continue;
      }

      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (response.ok) {
          const data = await response.json();
          updatedList.push({
            ...comp,
            receitaStatus: data.descricao_situacao_cadastral,
            name: data.razao_social || comp.name,
            fantasyName: data.nome_fantasia || comp.fantasyName,
            lastReceitaCheck: new Date().toISOString()
          });
        } else {
          updatedList.push({ ...comp, lastReceitaCheck: new Date().toISOString() });
        }
      } catch (e) {
        updatedList.push({ ...comp, lastReceitaCheck: new Date().toISOString() });
      }
      await new Promise(r => setTimeout(r, 200));
    }

    onBulkUpdateCompanies(updatedList);
    setIsProcessingApi(false);
    setSelectedIds(new Set());
    addToast('success', 'Verificação concluída', `Situação de ${updatedList.length} empresas atualizada.`);
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, col: ColumnKey) => {
    setDraggedColumn(col);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, col: ColumnKey) => {
    e.preventDefault();
    if (draggedColumn === col) return;
  };

  const handleDrop = (e: React.DragEvent, targetCol: ColumnKey) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== targetCol) {
      const newOrder = [...columnOrder];
      const draggedIdx = newOrder.indexOf(draggedColumn);
      const targetIdx = newOrder.indexOf(targetCol);

      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedColumn);

      setColumnOrder(newOrder);
    }
    setDraggedColumn(null);
  };

  // --- Actions ---

  const handleSort = (field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
    setActiveHeaderMenu(null);
  };

  const toggleColumn = (col: ColumnKey) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const moveColumn = (key: ColumnKey, direction: 'left' | 'right') => {
    const index = columnOrder.indexOf(key);
    if (index === -1) return;

    const newOrder = [...columnOrder];
    if (direction === 'left' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'right' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setColumnOrder(newOrder);
    setActiveHeaderMenu(null);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(sortedCompanies.map(c => c.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSendToCadence = () => {
    const selected = companies.filter(c => selectedIds.has(c.id));
    onAddToCadence(selected);
    setSelectedIds(new Set());
  };

  const handleRequestDelete = () => {
    setDeleteModal({ isOpen: true, count: selectedIds.size });
  };

  const confirmDelete = () => {
    onDeleteCompanies(Array.from(selectedIds));
    setSelectedIds(new Set());
    setDeleteModal({ isOpen: false, count: 0 });
  };

  const handleExportCSV = () => {
    const defaultName = `exportacao_crm_${new Date().toISOString().split('T')[0]}`;
    const name = window.prompt("Nome do arquivo (opcional):", defaultName);
    if (name === null) return;
    onExportCompanies(Array.from(selectedIds), 'csv', name || defaultName);
    setSelectedIds(new Set());
  }

  const handleExportPDF = () => {
    const defaultName = `relatorio_crm_${new Date().toISOString().split('T')[0]}`;
    const name = window.prompt("Nome do arquivo (opcional):", defaultName);
    if (name === null) return;
    onExportCompanies(Array.from(selectedIds), 'pdf', name || defaultName);
    setSelectedIds(new Set());
  }

  const handleGenerateRoteiro = () => {
    const selected = companies.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) return;

    const defaultName = `Roteiro Selecionado ${new Date().toISOString().split('T')[0]}`;
    const name = window.prompt("Nome do Roteiro (opcional):", defaultName);
    if (name === null) return;

    generateItineraryPDF(selected, name || defaultName);
    setSelectedIds(new Set());
    addToast('success', 'Roteiro Gerado', `${selected.length} empresas incluídas.`);
  };

  const isAllSelected = sortedCompanies.length > 0 && selectedIds.size === sortedCompanies.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < sortedCompanies.length;

  // --- Dynamic Column Definitions (Updated for new fields) ---
  const COLUMN_DEF: Record<ColumnKey, { label: string, sortKey: SortField }> = {
    codigo: { label: 'CÓDIGO', sortKey: 'clientCode' },
    ativo: { label: 'ATIVO', sortKey: 'isActive' },
    tipo: { label: 'TIPO', sortKey: 'type' },
    cnpj: { label: 'CPF/CNPJ', sortKey: 'cnpj' },
    ie: { label: 'IE', sortKey: 'ie' },
    nome: { label: 'NOME (RAZÃO)', sortKey: 'name' },
    nomeFantasia: { label: 'NOME FANTASIA', sortKey: 'fantasyName' },
    endereco: { label: 'ENDEREÇO', sortKey: 'address' },
    bairro: { label: 'BAIRRO', sortKey: 'neighborhood' },
    cep: { label: 'CEP', sortKey: 'zip' },
    ibge: { label: 'IBGE', sortKey: 'ibge' },
    codCidade: { label: 'COD. CIDADE', sortKey: 'cityCode' },
    cidade: { label: 'CIDADE', sortKey: 'city' },
    estado: { label: 'ESTADO', sortKey: 'state' },
    telefone: { label: 'TELEFONE', sortKey: 'phone' },
    celular: { label: 'CELULAR', sortKey: 'mobile' },
    fax: { label: 'FAX', sortKey: 'fax' },
    email: { label: 'EMAIL', sortKey: 'email' },
    nascimento: { label: 'NASCIMENTO', sortKey: 'birthDate' },
    ultimaCompra: { label: 'ULT. COMPRA', sortKey: 'lastPurchaseDate' },
    vlrUltimaCompra: { label: 'VLR. COMPRA', sortKey: 'lastPurchaseValue' },
    regiao: { label: 'REGIÃO', sortKey: 'region' },
    score: { label: 'SCORE', sortKey: 'score' },
    receitaStatus: { label: 'SIT. RECEITA', sortKey: 'receitaStatus' },
    tags: { label: 'TAGS', sortKey: 'name' }
  };

  const renderCell = (company: Company, key: ColumnKey) => {
    switch (key) {
      case 'codigo':
        return <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{company.clientCode}</span>;
      case 'ativo':
        return company.isActive
          ? <span className="text-green-600 dark:text-green-400 font-bold text-xs">SIM</span>
          : <span className="text-red-500 dark:text-red-400 font-bold text-xs">NÃO</span>;
      case 'tipo':
        return <span className="text-xs">{company.type}</span>;
      case 'cnpj':
        return <span className="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{company.cnpj}</span>;
      case 'ie':
        return <span className="text-slate-500 text-xs">{company.ie}</span>;
      case 'nome':
        return <span className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{company.fantasyName || company.name}</span>;
      case 'nomeFantasia':
        return <span className="text-slate-700 dark:text-slate-300">{company.fantasyName}</span>;
      case 'endereco': return <span className="text-xs text-slate-600">{company.address}</span>;
      case 'bairro': return <span className="text-xs text-slate-600">{company.neighborhood}</span>;
      case 'cep': return <span className="text-xs text-slate-600">{company.zip}</span>;
      case 'ibge': return <span className="text-xs text-slate-600">{company.ibge}</span>;
      case 'codCidade': return <span className="text-xs text-slate-600">{company.cityCode}</span>;
      case 'cidade':
        return <span className="truncate max-w-[150px] block text-slate-700 dark:text-slate-300">{company.city}</span>;
      case 'estado':
        return <span className="text-slate-700 dark:text-slate-300 font-bold">{company.state}</span>;
      case 'telefone': return <span className="text-xs whitespace-nowrap">{company.phone}</span>;
      case 'celular': return <span className="text-xs whitespace-nowrap">{company.mobile}</span>;
      case 'fax': return <span className="text-xs whitespace-nowrap">{company.fax}</span>;
      case 'email': return <span className="text-xs truncate max-w-[150px] block" title={company.email}>{company.email}</span>;
      case 'nascimento': return <span className="text-xs">{formatDate(company.birthDate)}</span>;
      case 'ultimaCompra':
        return <div className="text-right tabular-nums text-slate-700 dark:text-slate-300">{formatDate(company.lastPurchaseDate)}</div>;
      case 'vlrUltimaCompra':
        return <div className="text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(company.lastPurchaseValue)}</div>;
      case 'regiao':
        // Fallback to representative if region is empty
        return <span className="text-slate-700 dark:text-slate-300">{company.region || company.representative}</span>;
      case 'score':
        const { score, label, color } = calculateLeadScore(company);
        const scoreClass = {
          slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
          orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
          red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
        }[color];
        return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide w-fit ${scoreClass}`} title={`${score} Pontos - ${label}`}>
            <Trophy size={10} className="flex-shrink-0" />
            <span>{score}</span>
          </div>
        );
      case 'receitaStatus':
        if (!company.receitaStatus) return <span className="text-xs text-slate-300">-</span>;
        const rStatus = company.receitaStatus;
        let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
        if (rStatus === 'ATIVA') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (rStatus === 'BAIXADA' || rStatus === 'INAPTA') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
        return <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${badgeClass}`}>{rStatus}</span>;
      case 'tags':
        return (
          <div className="flex gap-1 flex-wrap">
            {company.tags.slice(0, 3).map(t => (
              <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getTagClass(t)}`}>
                {t}
              </span>
            ))}
            {company.tags.length > 3 && <span className="text-[10px] text-slate-400">+...</span>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        count={deleteModal.count}
        itemName={deleteModal.count > 1 ? "empresas" : "empresa"}
        onClose={() => setDeleteModal({ isOpen: false, count: 0 })}
        onConfirm={confirmDelete}
      />

      {/* Header & Controls */}
      <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestão de Carteira</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie seus clientes (Visualização ERP)</p>
          </div>
          <div className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-medium border border-blue-100 dark:border-blue-800">
            {filteredCompanies.length} registros
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar (ex: ATIVO PR CURITIBA)..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <button
                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors"
              >
                <SlidersHorizontal size={16} />
                Colunas
                <ChevronDown size={14} />
              </button>

              {isColumnMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 p-2 max-h-96 overflow-y-auto">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Visualizar</div>
                  {/* Render all available columns option */}
                  {Object.keys(COLUMN_DEF).map((k) => {
                    const key = k as ColumnKey;
                    return (
                      <div
                        key={key}
                        onClick={() => toggleColumn(key)}
                        className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer text-sm text-slate-700 dark:text-slate-300"
                      >
                        <span>{COLUMN_DEF[key].label}</span>
                        {visibleColumns[key] && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto pb-20">
        {isInitialLoad || isProcessingApi ? (
          <TableSkeleton />
        ) : (
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shadow-sm">
              <tr>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>

                {columnOrder.map((key) => {
                  if (!visibleColumns[key]) return null;
                  const def = COLUMN_DEF[key];
                  const isActive = activeHeaderMenu === key;
                  const isDragging = draggedColumn === key;

                  return (
                    <th
                      key={key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, key)}
                      onDragOver={(e) => handleDragOver(e, key)}
                      onDrop={(e) => handleDrop(e, key)}
                      className={`p-4 border-b border-slate-200 dark:border-slate-800 relative group transition-colors ${isDragging ? 'bg-blue-50 dark:bg-blue-900/20 opacity-50' : ''
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
                          <GripVertical size={12} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100" />
                          <span
                            onClick={() => handleSort(def.sortKey, sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                          >
                            {def.label}
                            {sortField === def.sortKey && (
                              <ArrowUpDown size={12} className="text-blue-500" />
                            )}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHeaderMenu(isActive ? null : key);
                          }}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : ''}`}
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {isActive && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 py-1 font-normal normal-case">
                          {/* Filter Input */}
                          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5">
                              <Filter size={14} className="text-slate-400" />
                              <input
                                type="text"
                                value={columnFilters[key] || ''}
                                onChange={(e) => setColumnFilters(prev => ({ ...prev, [key]: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-transparent text-xs outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                placeholder={`Filtrar ${def.label}...`}
                                autoFocus
                              />
                              {columnFilters[key] && (
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  setColumnFilters(prev => ({ ...prev, [key]: '' }));
                                }}>
                                  <X size={12} className="text-slate-400 hover:text-red-500" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/50">
                            Opções de Coluna
                          </div>

                          <button
                            onClick={() => handleSort(def.sortKey, 'asc')}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ArrowUp size={14} className="text-slate-400" /> Classificar A → Z
                          </button>
                          <button
                            onClick={() => handleSort(def.sortKey, 'desc')}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ArrowDown size={14} className="text-slate-400" /> Classificar Z → A
                          </button>

                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

                          <button
                            onClick={() => moveColumn(key, 'left')}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ArrowLeft size={14} className="text-slate-400" /> Mover p/ Esquerda
                          </button>
                          <button
                            onClick={() => moveColumn(key, 'right')}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ArrowRight size={14} className="text-slate-400" /> Mover p/ Direita
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}

                <th className="p-4 border-b border-slate-200 dark:border-slate-800 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300">
              {sortedCompanies.map(company => {
                const isSelected = selectedIds.has(company.id);
                const isPendent = company.tags.some(t => {
                  const tag = t.toUpperCase();
                  return tag === 'PENDENCIA COM A RIBEIRO' || tag === 'INADIMPLENTE';
                }) || (company.delinquencyHistory && company.delinquencyHistory.some(d => d.status === 'pending'));

                const isInactive = !company.isActive;

                return (
                  <tr
                    key={company.id}
                    onClick={() => onSelectCompany(company)}
                    className={`cursor-pointer transition-colors group ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      : isPendent
                        ? 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
                        : isInactive
                          ? 'bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                  >
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(company.id, e as any)}
                        className="w-full h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {columnOrder.map(key => {
                      if (!visibleColumns[key]) return null;
                      return (
                        <td key={key} className="p-4">
                          {renderCell(company, key)}
                        </td>
                      );
                    })}

                    <td className="p-4 text-center text-slate-300 dark:text-slate-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-400 dark:group-hover:bg-blue-500"></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-full shadow-xl pl-6 pr-2 py-2 flex items-center gap-3 border border-slate-700 dark:border-slate-600">
            <span className="font-medium text-sm border-r border-slate-700 dark:border-slate-600 pr-4">
              <span className="bg-white text-slate-900 px-2 py-0.5 rounded-md font-bold text-xs mr-2">
                {selectedIds.size}
              </span>
              selecionados
            </span>

            <button
              onClick={handleSendToCadence}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Criar Cadência"
            >
              <MessageSquare size={16} />
            </button>

            <button
              onClick={handleVerifyReceita}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Verificar Situação na Receita"
              disabled={isProcessingApi}
            >
              {isProcessingApi ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
              {isProcessingApi ? 'Verificando...' : 'Receita'}
            </button>

            <button
              onClick={handleGenerateRoteiro}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Gerar Roteiro PDF"
            >
              <MapIcon size={16} /> Roteiro
            </button>

            <div className="flex bg-slate-800 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-700 dark:border-slate-600">
              <button
                onClick={handleExportCSV}
                className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 border-r border-slate-700 dark:border-slate-600"
                title="Exportar CSV"
              >
                <FileSpreadsheet size={16} /> CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2"
                title="Exportar PDF"
              >
                <FileText size={16} /> PDF
              </button>
            </div>

            <button
              onClick={handleRequestDelete}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Excluir"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyList;