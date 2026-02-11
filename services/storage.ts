import { Company, Note, Task, Cadence, Database } from '../types';

const DB_NAME = 'fresh_crm_db';
const DB_VERSION = 1;
const STORE_NAME = 'crm_data';
const KEY = 'fresh_crm_data_v6_clean_start';

// Inicialização vazia
const INITIAL_DATA = {
  companies: [] as Company[],
  notes: [] as Note[],
  tasks: [] as Task[],
  cadences: [] as Cadence[],
  databases: [] as Database[],
  itineraries: [] as import('../types').Itinerary[] // Explicit type to avoid circular dependency if needed, or just let TS infer
};

type AppData = typeof INITIAL_DATA;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject("IndexedDB error: " + (event.target as any).error);

    request.onsuccess = (event) => resolve((event.target as any).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as any).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const loadData = async (): Promise<AppData> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY);

      request.onerror = () => {
        console.warn("Error loading from IDB, using initial data");
        resolve(INITIAL_DATA);
      };

      request.onsuccess = () => {
        const stored = request.result;
        if (!stored) {
          // Start with empty
          resolve(INITIAL_DATA);
          return;
        }

        try {
          // If stored is string, parse it (legacy compat), if object usage directly
          const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;

          // Ensure new fields exist if migrating
          if (!parsed.cadences) parsed.cadences = [];
          if (!parsed.databases) parsed.databases = [];
          if (!parsed.itineraries) parsed.itineraries = [];

          // Cleanup / Migration Logic
          if (parsed.companies) {
            parsed.companies = parsed.companies.map((c: any) => ({
              ...c,
              purchases: c.purchases || [],
              delinquencyHistory: c.delinquencyHistory || [],
              clientCode: c.clientCode || '',
              isActive: c.isActive !== undefined ? c.isActive : true,
              type: c.type || '',
              ie: c.ie || '',
              fantasyName: c.fantasyName || c.name,
              ibge: c.ibge || '',
              cityCode: c.cityCode || '',
              fax: c.fax || '',
              email: c.email || '',
              region: c.region || c.representative || '',
              birthDate: c.birthDate || ''
            }));
          }
          resolve(parsed);
        } catch (e) {
          console.error("Error parsing IDB data", e);
          resolve(INITIAL_DATA);
        }
      };
    });
  } catch (e) {
    console.error("Critical IDB Error", e);
    return INITIAL_DATA;
  }
};

export const saveData = async (data: AppData) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, KEY);

      request.onerror = () => {
        console.error("Failed to save to IDB");
        reject("Failed to save");
      };

      request.onsuccess = () => resolve();
    });
  } catch (e) {
    console.error("Save Data Error", e);
  }
};