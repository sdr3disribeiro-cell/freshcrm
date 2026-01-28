import React, { useState, useEffect, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import { useAuth } from './contexts/AuthContext';
import { fetchAllData, createCompany, updateCompany, createNote, createDatabaseLog, updateCadence, createCadence, deleteCadence, updateDatabaseColor, deleteDatabase, bulkUpsertCompanies, createTask, deleteCompanies } from './services/api';
import { Company, Note, Task, Cadence, ViewMode, Database, TagColor, ToastMessage, ToastType, Purchase, Delinquency } from './types';
import { generateId, exportToCSV, exportToPDF, parseBrazilianCurrency, parseBrazilianDate, formatCurrency, formatDate } from './utils';
import { ToastContainer } from './components/UI';
import { saveData, loadData } from './services/storage';
import { Loader2 } from 'lucide-react';

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
const RoteiroView = lazy(() => import('./components/RoteiroView'));
const Login = lazy(() => import('./components/Login'));

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // --- Local State Initialization ---
  const [view, setView] = useState<ViewMode>('list');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cadences, setCadences] = useState<Cadence[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Load from IDB on mount
  useEffect(() => {
    loadData().then(data => {
      setCompanies(data.companies);
      setNotes(data.notes);
      setTasks(data.tasks);
      setCadences(data.cadences);
      setDatabases(data.databases);
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

  // Cadence State
  const [companiesToCadence, setCompaniesToCadence] = useState<Company[]>([]);

  // --- Data Fetching (Google Sheets) ---
  const handleFetchData = async () => {
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

      // Extract detailed error message
      let errorMsg = 'Usando dados locais.';
      if (err?.result?.error?.message) {
        errorMsg = `Google Erro: ${err.result.error.message}`;
      } else if (err?.message) {
        errorMsg = `Erro: ${err.message}`;
      }

      addToast('error', 'Falha na Sincronização', errorMsg);
    }
  };

  useEffect(() => {
    if (user) {
      handleFetchData();
    }
  }, [user]);

  // --- Manual Sync Handler ---
  const handleManualSync = async () => {
    addToast('info', 'Sincronizando...', 'Buscando atualizações na planilha.');
    await handleFetchData();
    addToast('success', 'Atualizado', 'Dados sincronizados com sucesso.');
  };

  // --- Persistence Effect (Sync to LocalStorage) ---
  useEffect(() => {
    if (user && !isDataLoading) {
      saveData({ companies, notes, tasks, cadences, databases });
    }
  }, [companies, notes, tasks, cadences, databases, user, isDataLoading]);

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

  // --- Toast Handler ---
  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Theme Handler ---
  const toggleTheme = () => {
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
  };

  // --- Handlers ---

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedCompany(null);
    setView('list');
  };

  const handleAddNote = (note: Note) => {
    setNotes(prev => [note, ...prev]);
    createNote(note); // Sync to Sheets
    addToast('success', 'Nota adicionada');
  };

  const handleAddTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
    addToast('success', 'Tarefa agendada');
    createTask(task); // Sync
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    ));
    // Task update sync logic usually handled by queue in complex apps
  };

  // --- LOGICA CENTRAL DE IMPORTAÇÃO E FUSÃO (CNPJ MATCH) ---
  const handleEnrichDatabase = (tagName: string, rawData: any[], fileName: string, manualType: Database['type'] = 'general') => {
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
      // Try multiple fields for CNPJ using robust finder
      const rawCnpj = getValue(row, ['cnpj', 'cpf_cpnj', 'tax_id', 'cpf', 'cpf/cnpj']);
      const rowCnpj = normalize(rawCnpj || '');

      // Identify Name early
      const name = row['cliente'] || row['nome'] || row['razao_social'] || row['nome_fantasia'] || row['fantasia'];

      // RELAXED CHECK: Skip only if BOTH CNPJ and Name are missing/invalid
      // This allows importing lists with just Name+Phone
      if ((!rowCnpj || rowCnpj.length < 11) && !name) return;

      // Identify if exists (Only if we have a valid CNPJ)
      const existing = (rowCnpj && rowCnpj.length >= 11) ? companyMapByCNPJ.get(rowCnpj) : undefined;

      // --- PARSE AUXILIARY DATA ---

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

          // Create Alert Note
          debtNote = {
            id: generateId(),
            companyId: '', // Will fill later
            content: `⚠️ **REGISTRO DE INADIMPLÊNCIA**\nValor: ${debtFormatted}\nData da Dívida: ${dateFormatted}\nOrigem: ${fileName}`,
            type: 'note',
            createdAt: new Date().toISOString()
          };
        }
      }

      // C. Base Tag Logic
      const rawBase = getValue(row, ['base', 'origem', 'campanha', 'fonte', 'lista']);
      const baseTag = rawBase ? rawBase.toUpperCase().trim() : null;

      // LOGIC: Always add the UI Tag Name (e.g., "IMPORT_JAN")
      // AND add the specific Base Tag if found in the row (e.g., "COOPESP")
      // AND add "PROSPECÇÃO" for everyone to ensure visibility


      // D. Observations Note Logic
      const obsContent = row['observacoes'] || row['observações'] || row['obs'];
      let obsNote: Note | null = null;
      if (obsContent) {
        obsNote = {
          id: generateId(),
          companyId: '', // Will fill later
          content: `📝 **OBSERVAÇÃO IMPORTADA**\n${obsContent}`,
          type: 'note',
          createdAt: new Date().toISOString()
        };
      }

      // --- MERGE LOGIC ---

      if (existing) {
        // == UPDATE EXISTING ==
        matchedCount++;

        // We might have already touched this company in this batch loop
        // Use the version in updatedCompaniesMap if available, else use existing
        const baseComp = updatedCompaniesMap.get(existing.id) || existing;

        // 1. Merge Tags
        const newTags = new Set(baseComp.tags);
        if (tagName) newTags.add(tagName.toUpperCase());
        if (baseTag) newTags.add(baseTag);
        if (importType === 'inadimplencia') newTags.add("INADIMPLENTE");

        // Always ensure PROSPECÇÃO is present if it's a general import, 
        // effectively "reactivating" the lead for the sales team
        if (importType === 'general') newTags.add("PROSPECÇÃO");

        // 2. Merge Purchases
        let updatedPurchases = [...(baseComp.purchases || [])];
        let newLastDate = baseComp.lastPurchaseDate;
        let newLastValue = baseComp.lastPurchaseValue;

        if (newPurchase) {
          const currentPurchase = newPurchase; // Capture for safe usage
          const isDuplicate = updatedPurchases.some(p => p.orderId === currentPurchase.orderId);
          if (!isDuplicate) {
            updatedPurchases.unshift(currentPurchase);
            // Update header totals if this purchase is newer
            if (!newLastDate || (purchaseDate && new Date(purchaseDate) > new Date(newLastDate))) {
              newLastDate = purchaseDate;
              newLastValue = purchaseValue;
            }
          }
        }

        // 3. Merge Delinquency
        let updatedDelinquencies = [...(baseComp.delinquencyHistory || [])];
        if (newDelinquency) {
          const currentDelinquency = newDelinquency; // Capture for safe usage
          const isDuplicate = updatedDelinquencies.some(d => Math.abs(d.value - currentDelinquency.value) < 0.01 && d.date === currentDelinquency.date);
          if (!isDuplicate) {
            updatedDelinquencies.unshift(currentDelinquency);
            if (debtNote) {
              debtNote.companyId = baseComp.id;
              newNotes.push(debtNote);
              createNote(debtNote); // Sync note immediately
            }
          }
        }

        // 3.1 Merge Observation Note
        if (obsNote) {
          // Check if similar note already exists to avoid duplication on re-import
          const exists = notes.some(n => n.companyId === baseComp.id && n.content.includes(obsContent));
          if (!exists) {
            obsNote.companyId = baseComp.id;
            newNotes.push(obsNote);
            createNote(obsNote);
          }
        }

        // 4. Update basic info if missing in DB but present in CSV
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
        // Trigger Sync for this individual update (Queue)
        updateCompany(mergedComp);

      } else {
        // == CREATE NEW ==
        // Only create if we have a name (minimum requirement)
        if (name) {
          const newId = generateId();
          const newTags = new Set<string>();
          if (tagName) newTags.add(tagName.toUpperCase());
          if (baseTag) newTags.add(baseTag);
          if (importType === 'inadimplencia') newTags.add("INADIMPLENTE");

          // New Company Rule: Always add PROSPECÇÃO
          newTags.add("PROSPECÇÃO");

          // Handle new debt note
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
            isActive: true, // Default active
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
          // We add to map just in case duplicates exist in the CSV itself
          if (rowCnpj && rowCnpj.length >= 11) {
            companyMapByCNPJ.set(rowCnpj, newComp);
          }
        }
      }
    });

    // 4. Update State
    const updatedList = companies.map(c => updatedCompaniesMap.get(c.id) || c);
    const finalList = [...updatedList, ...newCompanies];

    setCompanies(finalList);
    setNotes(prev => [...newNotes, ...prev]);

    // 5. Bulk Sync for Creates
    if (newCompanies.length > 0) {
      bulkUpsertCompanies(newCompanies);
    }

    // 6. Log Database
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
  };

  // Wrapper for the simple importer to use the same logic
  const handleImport = (rawCompanies: Company[]) => {
    // Convert Company objects back to "Raw Row" format to reuse the robust logic above
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
      // map other fields if needed
    }));

    handleEnrichDatabase("IMPORTACAO_MANUAL", rawRows, "import_manual.csv", "general");
  };

  const handleCreateCompany = (newCompany: Company) => {
    setCompanies(prev => [newCompany, ...prev]);
    createCompany(newCompany); // Sync
    addToast('success', 'Empresa criada e sincronizada');
  };

  const handleUpdateCompany = (updatedCompany: Company) => {
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
    if (selectedCompany?.id === updatedCompany.id) {
      setSelectedCompany(updatedCompany);
    }
    updateCompany(updatedCompany); // Sync
    addToast('success', 'Dados atualizados');
  };

  const handleBulkUpdateCompanies = (updatedCompanies: Company[]) => {
    const updateMap = new Map(updatedCompanies.map(c => [c.id, c]));
    setCompanies(prev => prev.map(c => updateMap.get(c.id) || c));

    // Sync all updates
    updatedCompanies.forEach(c => updateCompany(c));
  };

  const handleDeleteCompanies = (ids: string[]) => {
    setCompanies(prev => prev.filter(c => !ids.includes(c.id)));
    deleteCompanies(ids);
    addToast('success', 'Empresas excluídas');
  };

  const handleOpenCadence = (companies: Company[]) => {
    setCompaniesToCadence(companies);
    setIsCadenceModalOpen(true);
  };

  const handleConfirmCadence = (cadenceId: string | null, newCadenceName?: string) => {
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
  };

  const handleUpdateCadence = (updatedCadence: Cadence) => {
    setCadences(prev => prev.map(c => c.id === updatedCadence.id ? updatedCadence : c));
    updateCadence(updatedCadence); // Sync
  };

  const handleToggleCadenceStatus = (cadenceId: string) => {
    const cadence = cadences.find(c => c.id === cadenceId);
    if (cadence) {
      const newStatus: Cadence['status'] = cadence.status === 'completed' ? 'active' : 'completed';
      const updated = { ...cadence, status: newStatus };
      setCadences(prev => prev.map(c => c.id === cadenceId ? updated : c));
      updateCadence(updated); // Sync
    }
  };

  const handleDeleteCadence = (id: string) => {
    setCadences(prev => prev.filter(c => c.id !== id));
    deleteCadence(id); // Sync
    addToast('info', 'Cadência removida');
  };

  const handleLogCadenceActivity = (companyId: string, content: string) => {
    const newNote: Note = {
      id: generateId(),
      companyId,
      content,
      createdAt: new Date().toISOString(),
      type: 'note'
    };
    handleAddNote(newNote); // This handles local state + sync
  };

  const handleUpdateDatabaseColor = (id: string, color: TagColor) => {
    setDatabases(prev => prev.map(db => db.id === id ? { ...db, color } : db));
    updateDatabaseColor(id, color); // Sync
  };

  const handleDeleteDatabase = (id: string) => {
    if (confirm('Tem certeza? Isso apaga apenas o registro do histórico.')) {
      setDatabases(prev => prev.filter(db => db.id !== id));
      deleteDatabase(id); // Sync
    }
  }

  const handleExportCompanies = (ids: string[], format: 'csv' | 'pdf' = 'csv', fileName?: string) => {
    const selected = companies.filter(c => ids.includes(c.id));
    if (selected.length === 0) return;
    if (format === 'pdf') exportToPDF(selected, fileName);
    else exportToCSV(selected, fileName);
    addToast('success', 'Exportação iniciada');
  };

  // --- Auth Guards ---
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
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
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      <main className="flex-1 h-screen overflow-hidden flex flex-col relative">
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
            <DashboardView companies={companies} />
          )}

          {view === 'deals' && (
            <DealsView
              companies={companies}
              onCreateCadence={handleOpenCadence}
              onSelectCompany={handleSelectCompany}
            />
          )}

          {view === 'list' && (
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
          )}

          {view === 'detail' && selectedCompany && (
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
          )}

          {view === 'cadences' && (
            <CadenceView
              cadences={cadences}
              companies={companies}
              onUpdateCadence={handleUpdateCadence}
              onDeleteCadence={handleDeleteCadence}
              onLogActivity={handleLogCadenceActivity}
              onToggleStatus={handleToggleCadenceStatus}
              onSelectCompany={handleSelectCompany}
            />
          )}

          {view === 'databases' && (
            <DatabaseView
              databases={databases}
              onEnrichDatabase={handleEnrichDatabase}
              onUpdateColor={handleUpdateDatabaseColor}
              onDeleteDatabase={handleDeleteDatabase}
            />
          )}

          {view === 'roteiro' && (
            <RoteiroView
              companies={companies}
              databases={databases}
              onCreateCadence={handleOpenCadence}
            />
          )}

          {view === 'calendar' && (
            <CalendarView
              tasks={tasks}
              companies={companies}
              onToggleTask={handleToggleTask}
            />
          )}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Importer
          isOpen={isImporterOpen}
          onClose={() => setIsImporterOpen(false)}
          onImport={handleImport}
        />

        <CompanyForm
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          onSave={handleCreateCompany}
        />

        <CadenceModal
          isOpen={isCadenceModalOpen}
          onClose={() => setIsCadenceModalOpen(false)}
          selectedCompanies={companiesToCadence}
          existingCadences={cadences}
          onConfirm={handleConfirmCadence}
        />
      </Suspense>
    </div>
  );
};

export default App;