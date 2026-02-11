import { Company, Note, Task, Cadence, Database } from '../types';
import { fetchSheetData, fetchSheetValues, appendRow, appendRows, updateRow, objectToRow, sheetToObjects } from './googleSheetsClient';
import { loadData, saveData } from './storage';
import { generateId, generateDeterministicId, parseBrazilianCurrency, parseBrazilianDate } from '../utils';
import { differenceInDays } from 'date-fns';

// --- SYNC QUEUE LOGIC ---
interface SyncItem {
    id: string;
    type: 'company' | 'note' | 'task' | 'cadence' | 'database';
    action: 'create' | 'update' | 'delete' | 'bulk_create';
    payload: any;
    timestamp: number;
}

// Alterado para evitar conflito com filas antigas que possam conter dados de exemplo
const SYNC_QUEUE_KEY = 'fresh_crm_sync_queue_v3_final';

declare const gapi: any;

const addToQueue = (item: Omit<SyncItem, 'timestamp'>) => {
    try {
        const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
        const queue: SyncItem[] = queueStr ? JSON.parse(queueStr) : [];
        queue.push({ ...item, timestamp: Date.now() });
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
        // Don't await, let it run in background
        setTimeout(() => processSyncQueue(), 500);
    } catch (e) {
        console.error("Queue storage error (Quota exceeded?)", e);
    }
};

// Mappings for Headers (MUST match your Sheet Headers exactly)
// Added 'id' as first column always for system control
const HEADERS = {
    companies: [
        'id',
        'CODIGO', 'ATIVO', 'TIPO', 'CPF_CPNJ', 'IE', 'NOME', 'FANTASIA',
        'ENDERECO', 'BAIRRO', 'CEP', 'IBGE', 'CODCIDADE', 'CIDADE', 'ESTADO',
        'TELEFONE', 'CELULAR', 'FAX', 'EMAIL', 'NASCIMENTO', 'ULTIMACOMPRA',
        'VLRULTIMACOMPRA', 'REGIAO',
        // Internal/Auxiliary fields (JSON stores)
        'representative', 'tags', 'receitaStatus', 'lastReceitaCheck', 'purchases', 'delinquencyHistory'
    ],
    notes: ['id', 'companyId', 'content', 'type', 'createdAt'],
    tasks: ['id', 'companyId', 'title', 'dueDate', 'isCompleted'],
    cadences: ['id', 'name', 'description', 'status', 'items', 'createdAt'],
    databases: ['id', 'tagName', 'fileName', 'importedAt', 'matchedCount', 'totalRows', 'color', 'type'],
    // New Tab Mapping
    leads: ['id', 'name', 'cnpj', 'phone', 'leadStatus', 'sdr', 'createdAt', 'notes'],
    inad: ['UF', 'DATA', 'VALOR', 'COD', 'NOME', 'CNPJ', 'CIDADE']
};

// Helper: Translate Company Object (CamelCase) to Sheet Row Object (Upper/Specific Keys)
const mapCompanyToSheetRow = (company: Company) => {
    return {
        id: company.id,
        codigo: company.clientCode,
        ativo: company.isActive,
        tipo: company.type,
        cpf_cpnj: company.cnpj,
        ie: company.ie,
        nome: company.name,
        fantasia: company.fantasyName,
        endereco: company.address,
        bairro: company.neighborhood,
        cep: company.zip,
        ibge: company.ibge,
        codcidade: company.cityCode,
        cidade: company.city,
        estado: company.state,
        telefone: company.phone,
        celular: company.mobile,
        fax: company.fax,
        email: company.email,
        nascimento: company.birthDate,
        ultimacompra: company.lastPurchaseDate,
        vlrultimacompra: company.lastPurchaseValue,
        regiao: company.region,

        // Aux fields
        representative: company.representative,
        tags: company.tags,
        receitastatus: company.receitaStatus,
        lastreceitacheck: company.lastReceitaCheck,
        purchases: company.purchases,
        delinquencyhistory: company.delinquencyHistory
    };
};

const mapLeadToSheetRow = (company: Company) => {
    return {
        id: company.id,
        name: company.name,
        cnpj: company.cnpj,
        phone: company.mobile || company.phone,
        leadstatus: company.leadStatus,
        sdr: company.sdr,
        createdat: new Date().toISOString(),
        notes: '' // Placeholder if we want to sync a summary note
    };
};

// Helper to map the "Database" sheet (Raw Leads) to Company objects
// Based on columns: A=CNPJ, B=FANTASIA, C=CIDADE, D=ESTADO, E=ENDEREÇO, F=BAIRRO, G=RESPONSAVEL, H=FONE, I=BASE, J=OBSERVAÇÕES
const mapDatabaseRowToCompany = (row: any): Company => {
    const cnpj = row.cnpj || row.CNPJ || '';
    const name = row.fantasia || row.FANTASIA || 'Sem Nome';
    const city = row.cidade || row.CIDADE || '';
    const state = row.estado || row.ESTADO || '';
    const address = row.endereco || row.ENDERECO || '';
    const neighborhood = row.bairro || row.BAIRRO || '';
    const contact = row.responsavel || row.RESPONSAVEL || '';
    const phone = row.fone || row.FONE || '';
    const baseName = row.base || row.BASE || '';
    const obs = row.observacoes || row.OBSERVACOES || '';

    const id = generateDeterministicId(cnpj || name); // Stable ID based on data

    const tags = ["PROSPECÇÃO"];
    if (baseName) tags.push(baseName.toUpperCase().trim());
    if (obs) tags.push("OBS_IMPORT"); // Optional marker

    return {
        id: id,
        clientCode: `DB-${id.substr(0, 4)}`,
        isActive: true,
        type: 'J',
        cnpj: cnpj,
        ie: '',
        name: name,
        fantasyName: name,
        address: address,
        neighborhood: neighborhood,
        zip: '',
        ibge: '',
        cityCode: '',
        city: city,
        state: state,
        phone: phone,
        mobile: '',
        fax: '',
        email: '',
        birthDate: undefined,
        region: '',
        representative: contact,
        tags: tags,
        purchases: [],
        delinquencyHistory: [],
        lastPurchaseDate: undefined,
        lastPurchaseValue: 0,
        receitaStatus: 'unknown'
    };
};

const mapLeadRowToCompany = (row: any): Company => {
    // Robust ID Logic: Prefer ID from sheet, else derive from CNPJ/Name types
    let id = row.id;
    if (!id && (row.cnpj || row.name)) {
        id = generateDeterministicId(row.cnpj || row.name);
    }

    return {
        id: id || generateId(),

        clientCode: '',
        isActive: true, // Leads are active by default?
        type: 'L', // L for Lead
        cnpj: row.cnpj || row.CNPJ || '',
        ie: '',
        name: row.name || row.NAME || 'Lead Sem Nome',
        fantasyName: row.name || row.NAME || '',
        address: '',
        neighborhood: '',
        zip: '',
        ibge: '',
        cityCode: '',
        city: '',
        state: '',
        phone: row.phone || row.PHONE || '',
        mobile: row.phone || row.PHONE || '',
        fax: '',
        email: '',
        region: '',
        representative: '', // Don't map to representative, use SDR
        tags: ['INBOUND'],
        purchases: [],
        delinquencyHistory: [],
        lastPurchaseValue: 0,

        // Lead Fields
        isLead: true,
        leadStatus: row.leadstatus || row.LEADSTATUS || 'New',
        sdr: row.sdr || row.SDR
    };
};

export const fetchAllData = async () => {
    // 1. Load from IndexedDB (Cache) first for speed
    const localData = await loadData();

    // Trigger sync in background if online
    if (navigator.onLine) {
        setTimeout(() => processSyncQueue(), 2000);
    }

    // 2. Try to fetch from Google Sheets if Online
    if (navigator.onLine) {
        try {
            // Fetch Standard Data + Inadimplencia Data + NEW Vendas Data + RAW Database Leads
            const [companiesRaw, notesRaw, tasksRaw, cadencesRaw, databasesLeadsRaw, inadRaw, salesRaw, leadsRaw] = await Promise.all([
                fetchSheetData('companies!A:ZZ'), // Extended range for more columns
                fetchSheetData('notes!A:Z'),
                fetchSheetData('tasks!A:Z'),
                fetchSheetData('cadences!A:Z'),
                fetchSheetData('databases!A:Z'), // Now treating as Raw Leads
                fetchSheetData('inad!A:Z').catch(() => []), // Fail safely
                fetchSheetData('vendas!A:Z').catch(() => []), // Fail safely
                fetchSheetValues('leads!A:Z').catch(() => []), // RAW Values for robust parsing
            ]);

            // DEBUG ALERT
            console.log("DEBUG COUNTS:", {
                companies: companiesRaw?.length,
                databases: databasesLeadsRaw?.length,
                sales: salesRaw?.length,
                leads: leadsRaw?.length
            });
            // Show alert only if databases is suspiciously empty or just to notify user
            // alert(`DEBUG: Companies: ${companiesRaw?.length || 0}, DB Leads: ${databasesLeadsRaw?.length || 0}`);

            if (!databasesLeadsRaw || databasesLeadsRaw.length === 0) {
                // Try to catch why it's empty.
                console.warn("Database Sheet returned 0 rows.");
            }

            // Helper to safely parse JSON or return empty array
            const safeArray = (val: any, splitString = false) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (typeof val === 'string') {
                    if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
                        try { return JSON.parse(val); } catch { return []; }
                    }
                    if (splitString) {
                        return val.split(',').map(s => s.trim()).filter(Boolean);
                    }
                }
                return [];
            };

            // Helper to ensure string (never undefined)
            const safeStr = (val: any) => (val === undefined || val === null) ? '' : String(val).trim();
            const normalizeCnpj = (val: any) => safeStr(val).replace(/[^\d]/g, '');

            // Helper for Booleans (accepts SIM, TRUE, 1, S)
            const safeBool = (val: any) => {
                if (!val) return false;
                const s = String(val).toUpperCase().trim();
                return s === 'TRUE' || s === 'SIM' || s === 'S' || s === '1';
            };

            // --- PROCESS RAW LEADS (DATABASES TAB) ---
            const databaseLeads = databasesLeadsRaw.map(mapDatabaseRowToCompany);

            // --- PROCESS NEW LEADS (LEADS TAB - ROBUST PARSING) ---
            let leadsList: Company[] = [];
            if (leadsRaw && leadsRaw.length > 0) {
                // Check if first row is header
                const firstRow = leadsRaw[0];
                const isHeader = firstRow[0] && String(firstRow[0]).toLowerCase().trim() === 'id';

                let leadRows = leadsRaw;
                if (isHeader) {
                    // Standard parsing
                    const leadsObjects = sheetToObjects(leadsRaw);
                    leadsList = leadsObjects.map(mapLeadRowToCompany);
                } else {
                    // FALLBACK: NO HEADER DETECTED
                    // Assume fixed column order: id, name, cnpj, phone, leadStatus, sdr, createdAt, notes
                    leadsList = leadsRaw.map((row: any[]) => {
                        const obj = {
                            id: row[0],
                            name: row[1],
                            cnpj: row[2],
                            phone: row[3],
                            leadStatus: row[4],
                            sdr: row[5],
                            createdAt: row[6],
                            notes: row[7]
                        };
                        return mapLeadRowToCompany(obj);
                    });
                }
            }


            // --- 0. PRE-PROCESS SALES (VENDAS TAB) ---
            const salesByCnpj = new Map<string, any[]>();
            const salesByCode = new Map<string, any[]>();

            salesRaw.forEach(row => {
                const cnpj = normalizeCnpj(row.cnpj || row.CNPJ || row.cpf_cnpj);
                const code = safeStr(row.codcliente || row.CODCLIENTE || row.cod || row.COD);

                // Purchase Object
                const purchase = {
                    id: generateId(),
                    orderId: safeStr(row.pedido || row.PEDIDO || row.id || row.ID),
                    status: safeStr(row.status || row.STATUS) || 'Concluído',
                    date: parseBrazilianDate(row.data || row.DATA) || new Date().toISOString(),
                    value: parseBrazilianCurrency(row.valor || row.VALOR),
                    sellerName: safeStr(row.vendedor || row.VENDEDOR),
                    sellerCode: safeStr(row.codvendedor || row.CODVENDEDOR),
                    operation: safeStr(row.operacao || row.OPERACAO) || 'Venda',
                    paymentTerm: safeStr(row.condicaopagto || row.CONDICAOPAGTO),
                    itemsCount: parseBrazilianCurrency(row.pecas || row.PECAS),
                    discount: parseBrazilianCurrency(row.desconto || row.DESCONTO),
                    ipi: parseBrazilianCurrency(row.ipi || row.IPI),
                    freight: parseBrazilianCurrency(row.frete || row.FRETE),
                    freightType: safeStr(row['tipo frete'] || row['Tipo Frete'] || row.tipofrete),
                    carrier: safeStr(row.transportadora || row.TRANSPORTADORA),
                    invoice: safeStr(row.nf || row.NF || row.nota || row.NOTA)
                };

                if (cnpj) {
                    const existing = salesByCnpj.get(cnpj) || [];
                    existing.push(purchase);
                    salesByCnpj.set(cnpj, existing);
                }
                if (code) {
                    const existing = salesByCode.get(code) || [];
                    existing.push(purchase);
                    salesByCode.set(code, existing);
                }
            });

            // --- 1. PROCESS COMPANIES ---

            const processedCompanies = companiesRaw.map(c => {
                let lastPurchaseDate = parseBrazilianDate(safeStr(c.ultimacompra || c.lastpurchasedate)) || safeStr(c.ultimacompra || c.lastpurchasedate);
                let lastPurchaseValue = parseBrazilianCurrency(c.vlrultimacompra || c.lastpurchasevalue);

                // ID LOGIC: Prefer saved ID.
                let id = safeStr(c.id);
                if (!id) {
                    const seed = safeStr(c.cpf_cpnj || c.cnpj) || safeStr(c.codigo || c.clientcode) || safeStr(c.nome || c.name);
                    id = seed ? generateDeterministicId(seed) : generateId();
                }

                const cnpj = normalizeCnpj(c.cpf_cpnj || c.cnpj);
                const code = safeStr(c.codigo || c.clientcode);

                // MERGE SALES HISTORY
                let purchases = safeArray(c.purchases);

                // Find sales from 'vendas' tab
                const salesFromTab = salesByCnpj.get(cnpj) || salesByCode.get(code) || [];

                if (salesFromTab.length > 0) {
                    // Merge strategies: Avoid duplicates by ID or (Date + Value)
                    salesFromTab.forEach(newP => {
                        const exists = purchases.some((p: any) =>
                            (p.orderId && newP.orderId && p.orderId === newP.orderId) ||
                            (p.date.substring(0, 10) === newP.date.substring(0, 10) && Math.abs(p.value - newP.value) < 0.01)
                        );
                        if (!exists) {
                            purchases.push(newP);
                        }
                    });

                    // Update Last Purchase based on history
                    // Sort descending
                    purchases.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (purchases.length > 0) {
                        const newest = purchases[0];
                        // Only update if newest is actually newer than what we had
                        if (!lastPurchaseDate || new Date(newest.date) > new Date(lastPurchaseDate)) {
                            lastPurchaseDate = newest.date;
                            lastPurchaseValue = newest.value;
                        }
                    }
                }

                // REGRA DE NEGÓCIO: Definir Representante baseado na Venda mais recente
                // Se houver histórico de compras, pega o vendedor da última compra.
                // Caso contrário, tenta pegar do cadastro da empresa.
                let representative = safeStr(c.representative || c.vendedor);
                if (purchases.length > 0) {
                    // purchases array is already sorted desc by date above
                    const lastSale = purchases[0];
                    if (lastSale.sellerName) {
                        representative = lastSale.sellerName;
                    }
                }

                // REGRA DE NEGÓCIO: ATIVO/INATIVO (6 MESES)
                let isActive = true; // Default
                if (lastPurchaseDate) {
                    const daysSince = differenceInDays(new Date(), new Date(lastPurchaseDate));
                    isActive = daysSince <= 180; // Menos de 6 meses (aprox 180 dias) é Ativo
                } else {
                    isActive = c.ativo !== undefined ? safeBool(c.ativo) : false;
                }

                const company: Company = {
                    id: id,
                    clientCode: code,
                    isActive: isActive,
                    type: safeStr(c.tipo),
                    cnpj: safeStr(c.cpf_cpnj || c.cnpj),
                    ie: safeStr(c.ie),
                    name: safeStr(c.nome || c.name),
                    fantasyName: safeStr(c.fantasia || c.fantasyname),
                    address: safeStr(c.endereco || c.address),
                    neighborhood: safeStr(c.bairro || c.neighborhood),
                    zip: safeStr(c.cep || c.zip),
                    ibge: safeStr(c.ibge),
                    cityCode: safeStr(c.codcidade || c.citycode),
                    city: safeStr(c.cidade || c.city),
                    state: safeStr(c.estado || c.state),
                    phone: safeStr(c.telefone || c.phone),
                    mobile: safeStr(c.celular || c.mobile),
                    fax: safeStr(c.fax),
                    email: safeStr(c.email),
                    birthDate: parseBrazilianDate(safeStr(c.nascimento || c.birthdate)) || safeStr(c.nascimento || c.birthdate),
                    lastPurchaseDate: lastPurchaseDate,
                    lastPurchaseValue: lastPurchaseValue,
                    region: safeStr(c.regiao || c.region),
                    representative: representative,
                    receitaStatus: safeStr(c.receitastatus),
                    lastReceitaCheck: safeStr(c.lastreceitacheck),
                    tags: safeArray(c.tags, true),
                    purchases: purchases,
                    delinquencyHistory: safeArray(c.delinquencyhistory || c.delinquencyHistory)
                };

                return company;
            });

            // --- 2. PROCESS INADIMPLENCIA (MERGE) ---
            // Tag Spec: "PENDENCIAS COM A RIBEIRO"
            const INAD_TAG = "PENDENCIAS COM A RIBEIRO";

            // Map for fast lookup by CNPJ and Code
            const companyMap = new Map<string, Company>();
            processedCompanies.forEach(c => {
                if (c.cnpj) companyMap.set(normalizeCnpj(c.cnpj), c);
            });

            inadRaw.forEach(row => {
                // Mapping: UF, DATA, VALOR, COD, NOME, CNPJ, CIDADE
                const rowCnpj = normalizeCnpj(row.cnpj || row.CNPJ);
                const rowVal = parseBrazilianCurrency(row.valor || row.VALOR);
                const rowDate = parseBrazilianDate(row.data || row.DATA) || new Date().toISOString();

                // Find existing company
                let targetCompany = companyMap.get(rowCnpj);

                // Fallback search by Code if CNPJ matches nothing but Code exists
                if (!targetCompany && row.cod) {
                    targetCompany = processedCompanies.find(c => c.clientCode === String(row.cod || row.COD));
                }

                const delinquencyRecord = {
                    id: generateId(),
                    date: rowDate,
                    value: rowVal,
                    status: 'pending' as const,
                    origin: 'Planilha Inadimplência'
                };

                if (targetCompany) {
                    // Update Existing
                    if (!targetCompany.tags.includes(INAD_TAG)) {
                        targetCompany.tags.push(INAD_TAG);
                    }

                    // Add to history if not duplicate (heuristic check)
                    const isDup = targetCompany.delinquencyHistory.some(d =>
                        Math.abs(d.value - rowVal) < 0.1 &&
                        d.date.substring(0, 10) === rowDate.substring(0, 10)
                    );

                    if (!isDup) {
                        targetCompany.delinquencyHistory.unshift(delinquencyRecord);
                    }
                } else {
                    // Create New Lead from Inad List
                    if (row.nome || row.NOME) {
                        const newCompany: Company = {
                            id: generateId(),
                            clientCode: safeStr(row.cod || row.COD),
                            isActive: false, // Starts inactive/blocked usually
                            type: 'J',
                            cnpj: safeStr(row.cnpj || row.CNPJ),
                            ie: '',
                            name: safeStr(row.nome || row.NOME),
                            fantasyName: safeStr(row.nome || row.NOME),
                            address: '',
                            neighborhood: '',
                            zip: '',
                            ibge: '',
                            cityCode: '',
                            city: safeStr(row.cidade || row.CIDADE),
                            state: safeStr(row.uf || row.UF),
                            phone: '',
                            mobile: '',
                            fax: '',
                            email: '',
                            region: '',
                            representative: '',
                            tags: [INAD_TAG, 'NOVO_VIA_INAD'],
                            purchases: [],
                            delinquencyHistory: [delinquencyRecord],
                            lastPurchaseValue: 0
                        };
                        processedCompanies.push(newCompany);
                        // Update map to avoid creating duplicates if CNPJ appears twice in inad list
                        if (rowCnpj) companyMap.set(rowCnpj, newCompany);
                    }
                }
            });



            // --- MERGE DATABASE LEADS ---
            console.log(`Merging ${databaseLeads.length} database leads...`);

            databaseLeads.forEach(lead => {
                const leadCnpj = normalizeCnpj(lead.cnpj);
                // companyMap is available from Inad processing scope
                let target = companyMap.get(leadCnpj);

                if (target) {
                    // Enrich existing company
                    if (!target.tags.includes('PROSPECÇÃO')) target.tags.push('PROSPECÇÃO');

                    // Add Base Tags (e.g. COOPESP)
                    lead.tags.forEach(t => {
                        if (!target!.tags.includes(t)) target!.tags.push(t);
                    });
                } else {
                    processedCompanies.push(lead);
                    if (leadCnpj) companyMap.set(leadCnpj, lead);
                }
            });

            // --- MERGE LEADS SHEET (PRIORITY) ---
            // We merge these as standard companies but with isLead flag.
            leadsList.forEach(lead => {
                const existing = processedCompanies.find(c => c.id === lead.id);
                if (!existing) {
                    processedCompanies.unshift(lead); // Add to top
                } else {
                    // Update existing with lead info if needed
                    existing.isLead = true;
                    existing.leadStatus = lead.leadStatus;
                    existing.sdr = lead.sdr;
                }
            });

            const allCompanies = processedCompanies;

            const sanitizedData = {
                companies: allCompanies.sort((a, b) => (b.lastPurchaseDate || '').localeCompare(a.lastPurchaseDate || '')),
                notes: notesRaw.map(n => ({
                    ...n,
                    id: safeStr(n.id),
                    companyId: safeStr(n.companyid || n.companyId),
                    content: safeStr(n.content),
                    type: safeStr(n.type) || 'note',
                    createdAt: safeStr(n.createdat || n.createdAt)
                })),
                tasks: tasksRaw.map(t => ({
                    ...t,
                    id: safeStr(t.id),
                    companyId: safeStr(t.companyid || t.companyId),
                    title: safeStr(t.title),
                    dueDate: safeStr(t.duedate || t.dueDate),
                    isCompleted: safeBool(t.iscompleted || t.isCompleted)
                })),
                cadences: cadencesRaw.map(c => ({
                    id: c.id || generateId(),
                    name: safeStr(c.name),
                    description: safeStr(c.description),
                    status: (safeStr(c.status) as any) || 'active',
                    items: safeArray(c.items),
                    createdAt: safeStr(c.createdat || c.createdAt) || new Date().toISOString()
                })),
                databases: [] // Empty to hide "Log" view
            };

            // Update LocalStorage (NOW IDB)
            await saveData(sanitizedData as any);
            return sanitizedData;
        } catch (error: any) {
            console.warn("Offline or API Error, using Local Data", error);
            // If we have no local data (fresh install) and API failed, we must alert the user!
            if (localData.companies.length === 0) {
                throw error;
            }
            // Otherwise, return local data gracefully (Offline Mode)
            return localData;
        }
    }

    return localData;
};

// --- SYNC PROCESSOR ---

let isSyncing = false;

// Helper to find row index by ID (Naive implementation)
const getRowIndexById = async (tab: string, id: string): Promise<number | null> => {
    try {
        // Fetch only column A (IDs) to minimize data transfer
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: (import.meta as any).env.VITE_GOOGLE_SHEETS_ID || '',
            range: `${tab}!A:A`,
        });
        const values = response.result.values;
        if (!values) return null;

        // Find index (1-based for Sheets A1 notation)
        const index = values.findIndex((row: any[]) => row[0] === id);
        return index !== -1 ? index + 1 : null;
    } catch (e) {
        console.warn(`Could not find row for ID ${id} in ${tab}`, e);
        return null;
    }
}

export const processSyncQueue = async () => {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;

    try {
        const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
        if (!queueStr) {
            isSyncing = false;
            return;
        }

        let queue: SyncItem[] = JSON.parse(queueStr);
        if (queue.length === 0) {
            isSyncing = false;
            return;
        }

        // Process one by one (FIFO)
        // We take a snapshot of the queue to avoid infinite loops if pushes happen
        const currentBatch = [...queue];

        // Clear queue immediately to handle new incomings
        // If failure, we might lose this batch, but better than sticking
        localStorage.setItem(SYNC_QUEUE_KEY, '[]');

        console.log(`Processing ${currentBatch.length} items from Sync Queue...`);

        for (const item of currentBatch) {
            try {
                switch (item.type) {
                    case 'note':
                        if (item.action === 'create') {
                            const row = objectToRow(item.payload, HEADERS.notes);
                            await appendRow('notes', row);
                        }
                        break;
                    case 'task':
                        if (item.action === 'create') {
                            const row = objectToRow(item.payload, HEADERS.tasks);
                            await appendRow('tasks', row);
                        } else if (item.action === 'update') {
                            const idx = await getRowIndexById('tasks', item.id);
                            if (idx) {
                                const row = objectToRow(item.payload, HEADERS.tasks);
                                await updateRow(`tasks!A${idx}`, row);
                            }
                        }
                        break;
                    case 'cadence':
                        if (item.action === 'create') {
                            const row = objectToRow(item.payload, HEADERS.cadences);
                            await appendRow('cadences', row);
                        } else if (item.action === 'update') {
                            const idx = await getRowIndexById('cadences', item.id);
                            if (idx) {
                                const row = objectToRow(item.payload, HEADERS.cadences);
                                await updateRow(`cadences!A${idx}`, row);
                            }
                        } else if (item.action === 'delete') {
                            // Delete logic usually usually not implemented in simple sheet append, 
                            // but we can flag as deleted or just ignore if valid
                        }
                        break;
                    case 'company':
                        // Check if it is a LEAD or a COMPANY
                        const co = item.payload as Company;
                        if (co.isLead) {
                            if (item.action === 'create') {
                                const row = objectToRow(mapLeadToSheetRow(co), HEADERS.leads);
                                await appendRow('leads', row);
                            } else if (item.action === 'update') {
                                const idx = await getRowIndexById('leads', item.id);
                                if (idx) {
                                    const row = objectToRow(mapLeadToSheetRow(co), HEADERS.leads);
                                    await updateRow(`leads!A${idx}`, row);
                                } else {
                                    // Not found in leads sheet (maybe was DB lead), so create it
                                    const row = objectToRow(mapLeadToSheetRow(co), HEADERS.leads);
                                    await appendRow('leads', row);
                                }
                            }
                        } else {
                            if (item.action === 'create') {
                                const row = objectToRow(mapCompanyToSheetRow(co), HEADERS.companies);
                                await appendRow('companies', row);
                            } else if (item.action === 'update') {
                                // Try companies sheet
                                let idx = await getRowIndexById('companies', item.id);
                                if (idx) {
                                    const row = objectToRow(mapCompanyToSheetRow(co), HEADERS.companies);
                                    await updateRow(`companies!A${idx}`, row);
                                }
                            } else if (item.action === 'bulk_create') {
                                // Import logic
                                const rows = (item.payload as Company[]).map(c =>
                                    objectToRow(mapCompanyToSheetRow(c), HEADERS.companies)
                                );
                                await appendRows('companies', rows);
                            }
                        }
                        break;
                    case 'database':
                        if (item.action === 'create') {
                            const row = objectToRow(item.payload, HEADERS.databases);
                            await appendRow('databases', row);
                        }
                        break;
                }
                // Small delay to prevent rate limits
                await new Promise(res => setTimeout(res, 300));

            } catch (err) {
                console.error(`Failed to process sync item ${item.id}`, err);
                // In a robust app, we would re-queue. Here, we log.
            }
        }

    } catch (e) {
        console.error("Sync Queue Critical Failure", e);
    } finally {
        isSyncing = false;
        // Check if more items arrived
        const nextQueue = localStorage.getItem(SYNC_QUEUE_KEY);
        if (nextQueue && JSON.parse(nextQueue).length > 0) {
            processSyncQueue();
        }
    }
};


// --- CRUD WRAPPERS ---

export const createCompany = async (company: Company) => {
    addToQueue({ id: company.id, type: 'company', action: 'create', payload: company });
    return { data: company, error: null };
};

export const updateCompany = async (company: Company) => {
    addToQueue({ id: company.id, type: 'company', action: 'update', payload: company });
    return { data: company, error: null };
};

export const deleteCompanies = async (ids: string[]) => {
    ids.forEach(id => {
        addToQueue({ id, type: 'company', action: 'delete', payload: id });
    });
    return { error: null };
};

export const createNote = async (note: Note) => {
    addToQueue({ id: note.id, type: 'note', action: 'create', payload: note });
    return { error: null };
};

export const createTask = async (task: Task) => {
    addToQueue({ id: task.id, type: 'task', action: 'create', payload: task });
    return { error: null };
};

export const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const local = await loadData();
    const task = local.tasks.find((t: Task) => t.id === taskId);
    if (task) {
        const updated = { ...task, ...updates };
        addToQueue({ id: taskId, type: 'task', action: 'update', payload: updated });
    }
    return { error: null };
};

export const createCadence = async (cadence: Cadence) => {
    addToQueue({ id: cadence.id, type: 'cadence', action: 'create', payload: cadence });
    return { error: null };
};

export const updateCadence = async (cadence: Cadence) => {
    addToQueue({ id: cadence.id, type: 'cadence', action: 'update', payload: cadence });
    return { error: null };
};

export const deleteCadence = async (id: string) => {
    addToQueue({ id, type: 'cadence', action: 'delete', payload: id });
    return { error: null };
};

export const createDatabaseLog = async (db: Database) => {
    addToQueue({ id: db.id, type: 'database', action: 'create', payload: db });
    return { error: null };
};

export const updateDatabaseColor = async (id: string, color: string) => {
    const local = await loadData();
    const db = local.databases.find((d: Database) => d.id === id);
    if (db) {
        const updated = { ...db, color };
        addToQueue({ id, type: 'database', action: 'update', payload: updated });
    }
    return { error: null };
};

export const deleteDatabase = async (id: string) => {
    addToQueue({ id, type: 'database', action: 'delete', payload: id });
    return { error: null };
};

export const bulkUpsertCompanies = async (companies: Company[]) => {
    const chunkSize = 500;

    for (let i = 0; i < companies.length; i += chunkSize) {
        const chunk = companies.slice(i, i + chunkSize);
        addToQueue({
            id: `bulk_${Date.now()}_${i}`,
            type: 'company',
            action: 'bulk_create',
            payload: chunk
        });
    }

    return { error: null, count: companies.length };
};