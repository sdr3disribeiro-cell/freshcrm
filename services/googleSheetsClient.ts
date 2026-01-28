
// Helper to manage Google Identity Services (GIS) and Sheets API interactions

declare const gapi: any;
declare const google: any;

// CRITICAL: Trim whitespace to avoid copy-paste errors
const CLIENT_ID = ((import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '').trim();
const API_KEY = ((import.meta as any).env.VITE_GOOGLE_API_KEY || '').trim();
const SPREADSHEET_ID = ((import.meta as any).env.VITE_GOOGLE_SHEETS_ID || '').trim();

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets profile email';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
let initPromise: Promise<void> | null = null;

// Export ID for debugging
export const getSpreadsheetId = () => SPREADSHEET_ID;

// Dynamically load scripts if missing
const loadScript = (src: string) => {
    return new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
};

export const initGoogleClient = async (): Promise<void> => {
    // If already inited, resolve immediately
    if (gapiInited && gisInited) return Promise.resolve();

    // Return existing promise if initialization is in progress
    if (initPromise) return initPromise;

    initPromise = new Promise(async (resolve, reject) => {
        try {
            // 1. Ensure Scripts are Loaded
            if (typeof gapi === 'undefined' || typeof google === 'undefined') {
                console.log("Injecting Google Scripts...");
                await Promise.all([
                    loadScript('https://accounts.google.com/gsi/client'),
                    loadScript('https://apis.google.com/js/api.js')
                ]);
            }

            // 2. Wait for gapi to be ready (sometimes script loads but global obj isn't ready instantly)
            let attempts = 0;
            while ((typeof gapi === 'undefined' || typeof google === 'undefined') && attempts < 20) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }

            if (typeof gapi === 'undefined' || typeof google === 'undefined') {
                throw new Error("Timeout waiting for Google Scripts to load globally.");
            }

            // 3. Initialize GAPI Client
            await new Promise<void>((resolveGapi, rejectGapi) => {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: API_KEY,
                            discoveryDocs: [DISCOVERY_DOC],
                        });
                        gapiInited = true;
                        resolveGapi();
                    } catch (err: any) {
                        console.error("GAPI Client Init Error:", err);
                        // Check for common config errors
                        if (err?.result?.error?.message) {
                            rejectGapi(new Error(`GAPI Init Failed: ${err.result.error.message}`));
                        } else {
                            rejectGapi(err);
                        }
                    }
                });
            });

            // 4. Initialize GIS (Token Client)
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (resp: any) => {
                    if (resp.error !== undefined) {
                        throw (resp);
                    }
                    if (gapi.client) {
                        gapi.client.setToken(resp);
                    }
                },
            });

            gisInited = true;
            console.log("Google Client Initialized Successfully");
            resolve();

        } catch (error) {
            console.error("Initialization Failed:", error);
            initPromise = null; // Reset promise so we can try again later
            // We resolve anyway so the app doesn't crash on load, 
            // but 'gisInited' will be false, triggering error on login click.
            resolve();
        }
    });

    return initPromise;
};

export const signInWithGoogle = async (): Promise<string> => {
    // If not ready, try to initialize one more time
    if (!gisInited || !tokenClient) {
        console.log("Client not ready, attempting late initialization...");
        await initGoogleClient();
    }

    return new Promise((resolve, reject) => {
        if (!gisInited || !tokenClient) {
            console.error("SignIn aborted: Libraries not initialized.");
            const missing = [];
            if (!gapiInited) missing.push("API Client");
            if (!gisInited) missing.push("Identity Services");

            reject(`Erro de Inicialização: ${missing.join(', ')} não carregaram.\n\nVerifique se sua API KEY e CLIENT ID estão corretos no arquivo .env e se não há bloqueadores de anúncios.`);
            return;
        }

        try {
            // Override callback for this specific sign-in request
            tokenClient.callback = (resp: any) => {
                if (resp.error) {
                    reject(resp);
                    return;
                }
                if (gapi.client) {
                    gapi.client.setToken(resp);
                }
                resolve(resp.access_token);
            };

            // Request access token
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (e) {
            console.error("Token Request Error:", e);
            reject(e);
        }
    });
};

// --- CRUD Operations ---

// Converts Array of Arrays (Sheet) to Array of Objects
export const sheetToObjects = (values: any[][]): any[] => {
    if (!values || values.length < 2) return [];

    // Safer header parsing
    const headers = values[0].map((h: any) => (h || '').toString().toLowerCase().trim());

    return values.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
            if (!h) return; // Skip empty headers
            let val = row[i];
            // Try to parse JSON strings (arrays/objects stored in cells)
            try {
                if (val && typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                    val = JSON.parse(val);
                }
            } catch (e) { /* ignore */ }
            obj[h] = val;
        });
        return obj;
    });
};

// Converts Object to Array (Row) based on Headers
export const objectToRow = (obj: any, headers: string[]): any[] => {
    return headers.map(h => {
        const header = h.trim();
        // 1. Try exact match (e.g. companyId)
        let val = obj[header];

        // 2. Try lowercase match (e.g. codigo vs CODIGO)
        if (val === undefined) {
            val = obj[header.toLowerCase()];
        }

        if (Array.isArray(val) || typeof val === 'object') {
            return JSON.stringify(val);
        }
        return val === undefined || val === null ? '' : val;
    });
};

export const fetchSheetData = async (range: string) => {
    try {
        if (!gapi.client) throw new Error("GAPI Client not ready");

        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });
        return sheetToObjects(response.result.values || []);
    } catch (error) {
        console.error("Error fetching sheet:", error);
        throw error;
    }
};

export const appendRow = async (range: string, rowData: any[]) => {
    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });
    } catch (error) {
        console.error("Error appending row:", error);
        throw error;
    }
};

// NEW: Append Multiple Rows at once (Batch)
export const appendRows = async (range: string, rowsData: any[][]) => {
    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: rowsData,
            },
        });
    } catch (error) {
        console.error("Error appending bulk rows:", error);
        throw error;
    }
};

export const updateRow = async (range: string, rowData: any[]) => {
    try {
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });
    } catch (error) {
        console.error("Error updating row:", error);
        throw error;
    }
};

export const batchUpdate = async (data: any[]) => {
    // Placeholder
};
