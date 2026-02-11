import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import { useAuth } from './contexts/AuthContext';
import { fetchAllData, createCompany, updateCompany, createNote, createDatabaseLog, updateCadence, createCadence, deleteCadence, updateDatabaseColor, deleteDatabase, bulkUpsertCompanies, createTask, deleteCompanies } from './services/api';
import { Company, Note, Task, Cadence, ViewMode, Database, TagColor, ToastMessage, ToastType, Purchase, Delinquency, Itinerary } from './types';
import { generateId, exportToCSV, exportToPDF, parseBrazilianCurrency, parseBrazilianDate, formatCurrency, formatDate } from './utils';
import { ToastContainer } from './components/UI';
import { saveData, loadData } from './services/storage';
import { Loader2, Menu } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';
import { soundService } from './services/soundService';
import confetti from 'canvas-confetti';

// --- Lazy Load Components for Code Splitting ---
const CompanyList = lazy(() => import('./components/CompanyList'));
const CompanyDetail = lazy(() => import('./components/CompanyDetail'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const Importer = lazy(() => import('./components/Importer'));
const CompanyForm = lazy(() => import('./components/CompanyForm'));
const CadenceModal = lazy(() => import('./components/CadenceModal'));
const CadenceView = lazy(() => import('./components/CadenceView'));
const DatabaseView = lazy(() => import('./components/DatabaseView'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const DealsView = lazy(() => import('./components/DealsView'));
const SoundSettings = lazy(() => import('./components/SoundSettings')); // Lazy load settings
const LeadsView = lazy(() => import('./components/LeadsView'));
const RoteiroView = lazy(() => import('./components/RoteiroView'));
const Login = lazy(() => import('./components/Login'));
const ProfileSelector = lazy(() => import('./components/ProfileSelector'));

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // --- Local State Initialization ---
  const [view, setView] = useState<ViewMode>('list');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cadences, setCadences] = useState<Cadence[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Load from IDB on mount
  useEffect(() => {
    document.title = "VistaCRM";
    loadData().then(data => {
      setCompanies(data.companies);
      setNotes(data.notes);
      setTasks(data.tasks);
      setCadences(data.cadences);
      setDatabases(data.databases);
      if (data.itineraries) setItineraries(data.itineraries);
    });
  }, []);

  // Data Loading State
  const [isDataLoading, setIsDataLoading] = useState(false);

  // UI State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals State
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isCadenceModalOpen, setIsCadenceModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false); // Added

  // Cadence State
  const [companiesToCadence, setCompaniesToCadence] = useState<Company[]>([]);

  // Mobile Menu State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Toast Handler ---
  // Must be defined before other handlers that use it
  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, title, message }]);

    // Play Sound
    // Play Sound
    if (type === 'success') soundService.playComplete();
    else if (type === 'error') soundService.playError();
    else soundService.playPop();



    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Data Fetching (Google Sheets) ---
  const handleFetchData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const data = await fetchAllData();
      setCompanies(data.companies);
      setNotes(data.notes);
      setTasks(data.tasks);
      setCadences(data.cadences);
      setDatabases(data.databases);
      setIsDataLoading(false);
    } catch (err: any) {
      console.error("Error fetching data", err);
      setIsDataLoading(false);

      let errorMsg = 'Usando dados locais.';
      if (err?.result?.error?.message) {
        errorMsg = `Google Erro: ${err.result.error.message}`;
      } else if (err?.message) {
        errorMsg = `Erro: ${err.message}`;
      }

      addToast('error', 'Falha na Sincronização', errorMsg);
    }
  }, [addToast]);

  useEffect(() => {
    if (user) {
      handleFetchData();
    }
  }, [user, handleFetchData]);

  // --- Manual Sync Handler ---
  const handleManualSync = useCallback(async () => {
    addToast('info', 'Sincronizando...', 'Buscando atualizações na planilha.');
    await handleFetchData();
    addToast('success', 'Atualizado', 'Dados sincronizados com sucesso.');
  }, [addToast, handleFetchData]);
  // ... (existing imports)

  // --- Sales Radar (Real-time Polling) ---
  const [lastSalesCount, setLastSalesCount] = useState(0);

  useEffect(() => {
    // Check for new sales every 30 seconds
    const interval = setInterval(() => {
      if (!user) return;

      // Lightweight check: We use the existing fetchAllData which caches logic
      // But for "Radar", we might want to force a partial check or just rely on manual sync intervals if we had them.
      // For now, we will piggyback on a periodic background sync if we implement one, 
      // OR we can make a lightweight request.

      // Let's interpret "Sales Radar" as: Compare current sales count vs previous after a fetch.
      // For the sake of "Real-time" feel without heavy quota:
      // We will rely on the user manually syncing or a background timer that calls handleFetchData.

      handleFetchData().then(() => {
        // Logic handled inside useEffect below
      });

    }, 60000); // 1 minute polling

    return () => clearInterval(interval);
  }, [user, handleFetchData]);

  // React to Changes (Confetti Trigger)
  useEffect(() => {
    // Calculate total sales count across companies
    const currentTotalSales = companies.reduce((acc, c) => acc + (c.purchases?.length || 0), 0);

    if (lastSalesCount > 0 && currentTotalSales > lastSalesCount) {
      // NEW SALE DETECTED!
      const diff = currentTotalSales - lastSalesCount;
      addToast('success', 'Nova Venda Detectada!', `${diff} novo(s) pedido(s) entraram no sistema.`);

      // Victory Fanfare
      soundService.playVictory();

      // Confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b']
      });
    }

    setLastSalesCount(currentTotalSales);
  }, [companies, lastSalesCount, addToast]);

  // --- Persistence Effect (Sync to LocalStorage) ---
  useEffect(() => {
    if (user && !isDataLoading) {
      saveData({ companies, notes, tasks, cadences, databases, itineraries });
    }
  }, [companies, notes, tasks, cadences, databases, itineraries, user, isDataLoading]);

  // Theme Init
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // --- Theme Handler ---
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      if (newVal) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newVal;
    });
  }, []);

  // --- Handlers ---

  const handleSelectCompany = useCallback((company: Company) => {
    setSelectedCompany(company);
    setView('detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedCompany(null);
    setView('list');
  }, []);

  const handleAddNote = useCallback((note: Note) => {
    setNotes(prev => [note, ...prev]);
    createNote(note); // Sync to Sheets
    addToast('success', 'Nota adicionada');
  }, [addToast]);

  const handleAddTask = useCallback((task: Task) => {
    setTasks(prev => [task, ...prev]);
    addToast('success', 'Tarefa agendada');
    createTask(task); // Sync
  }, [addToast]);

  const handleToggleTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newStatus = !t.isCompleted;
        if (newStatus) soundService.playComplete();
        return { ...t, isCompleted: newStatus };
      }
      return t;
    }));
    // Task update sync logic usually handled by queue in complex apps
  }, []);

  const handleCreateCompany = useCallback((newCompany: Company) => {
    setCompanies(prev => [newCompany, ...prev]);
    createCompany(newCompany); // Sync
    addToast('success', 'Empresa criada e sincronizada');
  }, [addToast]);

  const handleUpdateCompany = useCallback((updatedCompany: Company) => {
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
    if (selectedCompany?.id === updatedCompany.id) {
      setSelectedCompany(updatedCompany);
    }
    updateCompany(updatedCompany); // Sync
    addToast('success', 'Dados atualizados');
  }, [addToast, selectedCompany?.id]);

  const handleBulkUpdateCompanies = useCallback((updatedCompanies: Company[]) => {
    const updateMap = new Map(updatedCompanies.map(c => [c.id, c]));
    setCompanies(prev => prev.map(c => updateMap.get(c.id) || c));
    updatedCompanies.forEach(c => updateCompany(c));
  }, []);

  const handleDeleteCompanies = useCallback((ids: string[]) => {
    setCompanies(prev => prev.filter(c => !ids.includes(c.id)));
    deleteCompanies(ids);
    soundService.playDelete();
    addToast('success', 'Empresas excluídas');
  }, [addToast]);

  const handleOpenCadence = useCallback((companies: Company[]) => {
    setCompaniesToCadence(companies);
    setIsCadenceModalOpen(true);
  }, []);

  const handleConfirmCadence = useCallback((cadenceId: string | null, newCadenceName?: string) => {
    const newItems = companiesToCadence.map(c => ({
      companyId: c.id,
      status: 'pending' as const,
      addedAt: new Date().toISOString()
    }));

    if (cadenceId) {
      const targetCadence = cadences.find(c => c.id === cadenceId);
      if (targetCadence) {
        const updatedCadence = { ...targetCadence, items: [...targetCadence.items, ...newItems] };
        setCadences(prev => prev.map(c => c.id === cadenceId ? updatedCadence : c));
        updateCadence(updatedCadence); // Sync
        addToast('success', 'Leads adicionados à cadência');
      }
    } else if (newCadenceName) {
      const newCadence: Cadence = {
        id: generateId(),
        name: newCadenceName,
        description: 'Cadência gerada via seleção',
        createdAt: new Date().toISOString(),
        items: newItems,
        status: 'active'
      };
      setCadences(prev => [...prev, newCadence]);
      createCadence(newCadence); // Sync
      addToast('success', 'Nova cadência criada');
    }
  }, [cadences, companiesToCadence, addToast]);

  const handleUpdateCadence = useCallback((updatedCadence: Cadence) => {
    setCadences(prev => prev.map(c => c.id === updatedCadence.id ? updatedCadence : c));
    updateCadence(updatedCadence); // Sync
  }, []);

  const handleToggleCadenceStatus = useCallback((cadenceId: string) => {
    const cadence = cadences.find(c => c.id === cadenceId);
    if (cadence) {
      const newStatus: Cadence['status'] = cadence.status === 'completed' ? 'active' : 'completed';
      const updated = { ...cadence, status: newStatus };
      setCadences(prev => prev.map(c => c.id === cadenceId ? updated : c));
      updateCadence(updated); // Sync
    }
  }, [cadences]);

  const handleDeleteCadence = useCallback((id: string) => {
    setCadences(prev => prev.filter(c => c.id !== id));
    deleteCadence(id); // Sync
    soundService.playDelete();
    addToast('info', 'Cadência removida');
  }, [addToast]);

  const handleLogCadenceActivity = useCallback((companyId: string, content: string) => {
    const newNote: Note = {
      id: generateId(),
      companyId,
      content,
      createdAt: new Date().toISOString(),
      type: 'note'
    };
    handleAddNote(newNote); // This handles local state + sync
  }, [handleAddNote]);

  const handleUpdateDatabaseColor = useCallback((id: string, color: TagColor) => {
    setDatabases(prev => prev.map(db => db.id === id ? { ...db, color } : db));
    updateDatabaseColor(id, color); // Sync
  }, []);

  const handleDeleteDatabase = useCallback((id: string) => {
    if (confirm('Tem certeza? Isso apaga apenas o registro do histórico.')) {
      setDatabases(prev => prev.filter(db => db.id !== id));
      deleteDatabase(id); // Sync
      soundService.playDelete();
    }
  }, []);

  const handleExportCompanies = useCallback((ids: string[], format: 'csv' | 'pdf' = 'csv', fileName?: string) => {
    const selected = companies.filter(c => ids.includes(c.id));
    if (selected.length === 0) return;
    if (format === 'pdf') exportToPDF(selected, fileName);
    else exportToCSV(selected, fileName);
    addToast('success', 'Exportação iniciada');
  }, [companies, addToast]);


  // --- LOGICA CENTRAL DE IMPORTAÇÃO E FUSÃO (CNPJ MATCH) ---
  const handleEnrichDatabase = useCallback((tagName: string, rawData: any[], fileName: string, manualType: Database['type'] = 'general') => {
    // 1. Setup Normalization
    const normalize = (val: string) => val ? val.replace(/[^\d]/g, '') : '';

    // 2. Auto Detect Type (heuristic)
    let importType: 'general' | 'sales' | 'inadimplencia' = manualType || 'general';
    const firstRow = rawData[0] || {};
    const keys = Object.keys(firstRow).join(' ').toLowerCase();

    if (importType === 'general') {
      if (keys.includes('pedido') && keys.includes('valor')) {
        importType = 'sales';
      } else if (keys.includes('vencimento') || (keys.includes('valor') && keys.includes('data') && !keys.includes('pedido'))) {
        importType = 'inadimplencia';
      }
    }

    let matchedCount = 0;
    const newCompanies: Company[] = [];
    const updatedCompaniesMap = new Map<string, Company>(); // ID -> UpdatedCompany
    const newNotes: Note[] = [];

    // Clone current companies to map by CNPJ for fast lookup
    const companyMapByCNPJ = new Map<string, Company>();
    companies.forEach(c => {
      if (c.cnpj) companyMapByCNPJ.set(normalize(c.cnpj), c);
    });

    // Helper: Fuzzy find value in row
    const getValue = (r: any, searchKeys: string[]): string | undefined => {
      const rowKeys = Object.keys(r);
      // 1. Exact match
      for (const k of searchKeys) {
        if (r[k]) return r[k];
      }
      // 2. Fuzzy match (includes)
      for (const rk of rowKeys) {
        for (const sk of searchKeys) {
          if (rk.includes(sk)) return r[rk];
        }
      }
      return undefined;
    };

    // 3. Process Rows
    rawData.forEach(row => {
      const rawCnpj = getValue(row, ['cnpj', 'cpf_cpnj', 'tax_id', 'cpf', 'cpf/cnpj']);
      const rowCnpj = normalize(rawCnpj || '');
      const name = row['cliente'] || row['nome'] || row['razao_social'] || row['nome_fantasia'] || row['fantasia'];

      if ((!rowCnpj || rowCnpj.length < 11) && !name) return;
      const existing = (rowCnpj && rowCnpj.length >= 11) ? companyMapByCNPJ.get(rowCnpj) : undefined;

      // A. Sales Data
      let newPurchase: Purchase | null = null;
      let purchaseDate: string | undefined = undefined;
      let purchaseValue: number = 0;

      if (importType === 'sales') {
        const orderId = row['pedido'] || row['order_id'] || row['id_venda'];
        if (orderId) {
          purchaseDate = parseBrazilianDate(row['data'] || row['emissao']);
          purchaseValue = parseBrazilianCurrency(row['valor'] || row['total']);
          newPurchase = {
            id: generateId(),
            orderId: orderId,
            status: row['status'] || 'Concluído',
            date: purchaseDate || new Date().toISOString(),
            sellerCode: row['codvendedor'] || row['id_rep'] || '',
            sellerName: row['vendedor'] || row['representante'] || '',
            operation: row['operacao'] || 'Venda',
            invoice: row['nf'] || row['nota_fiscal'] || '',
            paymentTerm: row['condicaopagto'] || row['pagamento'] || '',
            itemsCount: parseBrazilianCurrency(row['pecas'] || row['qtd']),
            value: purchaseValue,
            discount: parseBrazilianCurrency(row['desconto']),
            ipi: parseBrazilianCurrency(row['ipi']),
            freight: parseBrazilianCurrency(row['frete']),
            freightType: row['tipo frete'] || '',
            carrier: row['transportadora'] || ''
          };
        }
      }

      // B. Delinquency Data
      let newDelinquency: Delinquency | null = null;
      let debtNote: Note | null = null;

      if (importType === 'inadimplencia') {
        const debtDate = parseBrazilianDate(row['data'] || row['vencimento']);
        const debtValue = parseBrazilianCurrency(row['valor'] || row['saldo']);

        if (debtValue > 0) {
          newDelinquency = {
            id: generateId(),
            date: debtDate || new Date().toISOString(),
            value: debtValue,
            status: 'pending',
            origin: fileName
          };
          const debtFormatted = formatCurrency(debtValue);
          const dateFormatted = formatDate(debtDate);
          debtNote = {
            id: generateId(),
            companyId: '',
            content: `⚠️ **REGISTRO DE INADIMPLÊNCIA**\nValor: ${debtFormatted}\nData da Dívida: ${dateFormatted}\nOrigem: ${fileName}`,
            type: 'note',
            createdAt: new Date().toISOString()
          };
        }
      }

      const rawBase = getValue(row, ['base', 'origem', 'campanha', 'fonte', 'lista']);
      const baseTag = rawBase ? rawBase.toUpperCase().trim() : null;
      const obsContent = row['observacoes'] || row['observações'] || row['obs'];
      let obsNote: Note | null = null;
      if (obsContent) {
        obsNote = {
          id: generateId(),
          companyId: '',
          content: `📝 **OBSERVAÇÃO IMPORTADA**\n${obsContent}`,
          type: 'note',
          createdAt: new Date().toISOString()
        };
      }

      if (existing) {
        matchedCount++;
        const baseComp = updatedCompaniesMap.get(existing.id) || existing;
        const newTags = new Set(baseComp.tags);
        if (tagName) newTags.add(tagName.toUpperCase());
        if (baseTag) newTags.add(baseTag);
        if (importType === 'inadimplencia') newTags.add("INADIMPLENTE");
        if (importType === 'general') newTags.add("PROSPECÇÃO");

        let updatedPurchases = [...(baseComp.purchases || [])];
        let newLastDate = baseComp.lastPurchaseDate;
        let newLastValue = baseComp.lastPurchaseValue;
        if (newPurchase) {
          const currentPurchase = newPurchase;
          const isDuplicate = updatedPurchases.some(p => p.orderId === currentPurchase.orderId);
          if (!isDuplicate) {
            updatedPurchases.unshift(currentPurchase);
            if (!newLastDate || (purchaseDate && new Date(purchaseDate) > new Date(newLastDate))) {
              newLastDate = purchaseDate;
              newLastValue = purchaseValue;
            }
          }
        }
        let updatedDelinquencies = [...(baseComp.delinquencyHistory || [])];
        if (newDelinquency) {
          const currentDelinquency = newDelinquency;
          const isDuplicate = updatedDelinquencies.some(d => Math.abs(d.value - currentDelinquency.value) < 0.01 && d.date === currentDelinquency.date);
          if (!isDuplicate) {
            updatedDelinquencies.unshift(currentDelinquency);
            if (debtNote) {
              debtNote.companyId = baseComp.id;
              newNotes.push(debtNote);
              createNote(debtNote);
            }
          }
        }
        if (obsNote) {
          const exists = notes.some(n => n.companyId === baseComp.id && n.content.includes(obsContent));
          if (!exists) {
            obsNote.companyId = baseComp.id;
            newNotes.push(obsNote);
            createNote(obsNote);
          }
        }

        const mergedComp: Company = {
          ...baseComp,
          name: baseComp.name || row['cliente'] || row['nome'] || row['razao_social'],
          fantasyName: baseComp.fantasyName || row['fantasia'] || row['nome_fantasia'],
          email: baseComp.email || row['email'],
          phone: baseComp.phone || row['telefone'] || row['fone'],
          mobile: baseComp.mobile || row['celular'] || row['whatsapp'],
          address: baseComp.address || row['endereco'] || row['endereço'],
          neighborhood: baseComp.neighborhood || row['bairro'],
          city: baseComp.city || row['cidade'],
          state: baseComp.state || row['uf'] || row['estado'],
          zip: baseComp.zip || row['cep'],
          representative: baseComp.representative || row['vendedor'] || row['representante'] || row['responsavel'],
          tags: Array.from(newTags),
          purchases: updatedPurchases,
          delinquencyHistory: updatedDelinquencies,
          lastPurchaseDate: newLastDate,
          lastPurchaseValue: newLastValue
        };
        updatedCompaniesMap.set(mergedComp.id, mergedComp);
        updateCompany(mergedComp);
      } else {
        if (name) {
          const newId = generateId();
          const newTags = new Set<string>();
          if (tagName) newTags.add(tagName.toUpperCase());
          if (baseTag) newTags.add(baseTag);
          if (importType === 'inadimplencia') newTags.add("INADIMPLENTE");
          newTags.add("PROSPECÇÃO");
          if (debtNote) {
            debtNote.companyId = newId;
            newNotes.push(debtNote);
            createNote(debtNote);
          }
          if (obsNote) {
            obsNote.companyId = newId;
            newNotes.push(obsNote);
            createNote(obsNote);
          }
          const newComp: Company = {
            id: newId,
            clientCode: row['codcliente'] || row['codigo'] || generateId(),
            isActive: true,
            type: row['tipo'] || 'J',
            cnpj: row['cnpj'] || row['cpf_cpnj'] || '',
            ie: row['ie'] || '',
            name: name,
            fantasyName: row['nome_fantasia'] || row['fantasia'] || name,
            address: row['endereco'] || row['endereço'] || row['logradouro'] || '',
            neighborhood: row['bairro'] || '',
            zip: row['cep'] || '',
            ibge: row['ibge'] || '',
            cityCode: row['codcidade'] || '',
            city: row['cidade'] || '',
            state: row['uf'] || row['estado'] || '',
            phone: row['telefone'] || row['fone'] || '',
            mobile: row['celular'] || '',
            fax: row['fax'] || '',
            email: row['email'] || '',
            birthDate: parseBrazilianDate(row['nascimento']),
            region: row['regiao'] || '',
            representative: row['vendedor'] || row['representante'] || row['responsavel'] || '',
            tags: Array.from(newTags),
            purchases: newPurchase ? [newPurchase] : [],
            delinquencyHistory: newDelinquency ? [newDelinquency] : [],
            lastPurchaseDate: purchaseDate,
            lastPurchaseValue: purchaseValue
          };
          newCompanies.push(newComp);
          if (rowCnpj && rowCnpj.length >= 11) {
            companyMapByCNPJ.set(rowCnpj, newComp);
          }
        }
      }
    });

    const updatedList = companies.map(c => updatedCompaniesMap.get(c.id) || c);
    const finalList = [...updatedList, ...newCompanies];
    setCompanies(finalList);
    setNotes(prev => [...newNotes, ...prev]);
    if (newCompanies.length > 0) {
      bulkUpsertCompanies(newCompanies);
    }
    const newDb: Database = {
      id: generateId(),
      tagName,
      fileName,
      importedAt: new Date().toISOString(),
      matchedCount,
      totalRows: rawData.length,
      color: importType === 'inadimplencia' ? 'red' : 'blue',
      type: importType
    };
    setDatabases(prev => [newDb, ...prev]);
    createDatabaseLog(newDb);
    addToast('success', 'Importação Inteligente', `${newCompanies.length} novos, ${matchedCount} atualizados.`);
    return { matched: matchedCount, total: rawData.length };
  }, [companies, notes, addToast]); // Added dependencies

  const handleImport = useCallback((rawCompanies: Company[]) => {
    const rawRows = rawCompanies.map(c => ({
      cliente: c.name,
      nome_fantasia: c.fantasyName,
      cnpj: c.cnpj,
      ie: c.ie,
      endereco: c.address,
      cidade: c.city,
      uf: c.state,
      email: c.email,
      telefone: c.phone,
      celular: c.mobile,
      vendedor: c.representative,
    }));
    handleEnrichDatabase("IMPORTACAO_MANUAL", rawRows, "import_manual.csv", "general");
  }, [handleEnrichDatabase]);


  // --- Auth Guards ---
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
    // If we have profiles but no user selected, show Selector
    const { availableProfiles, selectProfile, signOut } = useAuth();

    if (availableProfiles && availableProfiles.length > 0) {
      return (
        <Suspense fallback={<div className="flex h-screen bg-slate-900" />}>
          <ProfileSelector
            profiles={availableProfiles}
            onSelectProfile={selectProfile}
            onLogout={signOut}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      }>
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <Sidebar
        currentView={view}
        onChangeView={(v) => {
          setView(v);
          if (v !== 'detail') setSelectedCompany(null);
        }}
        onImport={() => setIsImporterOpen(true)}
        onNewCompany={() => setIsCreatorOpen(true)}
        onSync={handleManualSync}
        onSettings={() => setSettingsModalOpen(true)} // Added prop
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 h-screen overflow-hidden flex flex-col relative">
        {/* Mobile Header */}
        <div className="lg:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between flex-shrink-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300">
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-800 dark:text-white">FreshCRM</span>
          <div className="w-6"></div> {/* Spacer for center alignment */}
        </div>
        {isDataLoading && (
          <div className="bg-blue-600 text-white text-xs py-1 px-4 text-center">
            Sincronizando com Google Sheets...
          </div>
        )}

        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        }>
          {view === 'dashboard' && (
            <PageTransition key="dashboard" className="h-full flex flex-col overflow-hidden">
              <DashboardView companies={companies} />
            </PageTransition>
          )}

          {view === 'deals' && (
            <PageTransition key="deals" className="h-full flex flex-col overflow-hidden">
              <DealsView
                companies={companies}
                onCreateCadence={handleOpenCadence}
                onSelectCompany={handleSelectCompany}
              />
            </PageTransition>
          )}

          {view === 'leads' && (
            <PageTransition key="leads" className="h-full flex flex-col overflow-hidden">
              <LeadsView
                companies={companies}
                onUpdateCompany={handleUpdateCompany}
                onAddTask={handleAddTask}
                onSelectCompany={handleSelectCompany}
              />
            </PageTransition>
          )}

          {view === 'list' && (
            <PageTransition key="list" className="h-full flex flex-col overflow-hidden">
              <CompanyList
                companies={companies}
                databases={databases}
                onSelectCompany={handleSelectCompany}
                onAddToCadence={handleOpenCadence}
                onDeleteCompanies={handleDeleteCompanies}
                onExportCompanies={handleExportCompanies}
                onBulkUpdateCompanies={handleBulkUpdateCompanies}
                addToast={addToast}
              />
            </PageTransition>
          )}

          {view === 'detail' && selectedCompany && (
            <PageTransition key="detail" className="h-full flex flex-col overflow-hidden">
              <CompanyDetail
                company={selectedCompany}
                notes={notes}
                tasks={tasks}
                databases={databases}
                onBack={handleBackToList}
                onUpdate={handleUpdateCompany}
                onAddNote={handleAddNote}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
              />
            </PageTransition>
          )}

          {view === 'cadences' && (
            <PageTransition key="cadences" className="h-full flex flex-col overflow-hidden">
              <CadenceView
                cadences={cadences}
                companies={companies}
                onUpdateCadence={handleUpdateCadence}
                onDeleteCadence={handleDeleteCadence}
                onLogActivity={handleLogCadenceActivity}
                onToggleStatus={handleToggleCadenceStatus}
                onSelectCompany={handleSelectCompany}
              />
            </PageTransition>
          )}



          {view === 'roteiro' && (
            <PageTransition key="roteiro" className="h-full flex flex-col overflow-hidden">
              <RoteiroView
                companies={companies}
                databases={databases}
                onCreateCadence={handleOpenCadence}
                onBulkUpdateCompanies={handleBulkUpdateCompanies}
              />
            </PageTransition>
          )}

          {view === 'calendar' && (
            <PageTransition key="calendar" className="h-full flex flex-col overflow-hidden">
              <CalendarView
                tasks={tasks}
                companies={companies}
                onToggleTask={handleToggleTask}
              />
            </PageTransition>
          )}

        </Suspense>
      </main>

      {/* Modals - Lazy Loaded */}
      <Suspense fallback={null}>
        {isImporterOpen && (
          <Importer
            isOpen={isImporterOpen}
            onClose={() => setIsImporterOpen(false)}
            onImport={handleImport}
          />
        )}

        {isCreatorOpen && (
          <CompanyForm
            isOpen={isCreatorOpen}
            onClose={() => setIsCreatorOpen(false)}
            onSave={handleCreateCompany}
          />
        )}

        {isCadenceModalOpen && (
          <CadenceModal
            isOpen={isCadenceModalOpen}
            onClose={() => setIsCadenceModalOpen(false)}
            selectedCompanies={companiesToCadence}
            existingCadences={cadences}
            onConfirm={handleConfirmCadence}
          />
        )}

        {isSettingsModalOpen && (
          <SoundSettings
            isOpen={isSettingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default App;