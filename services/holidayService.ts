
export interface Holiday {
    id?: string;
    date: string; // YYYY-MM-DD
    name: string;
    type: 'national' | 'state' | 'municipal' | 'optional';
    level?: string; // BR, SP, RJ, City Name, etc.
    description?: string;
}

class HolidayService {
    private static instance: HolidayService;
    private cache: Map<string, Holiday[]> = new Map();
    private customHolidays: Holiday[] = [];
    private loaded = false;

    private constructor() {
        this.loadCustomHolidays();
    }

    public static getInstance(): HolidayService {
        if (!HolidayService.instance) {
            HolidayService.instance = new HolidayService();
        }
        return HolidayService.instance;
    }

    private loadCustomHolidays() {
        try {
            const stored = localStorage.getItem('freshcrm_custom_holidays');
            if (stored) {
                this.customHolidays = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to load custom holidays", e);
        }
        this.loaded = true;
    }

    private saveCustomHolidays() {
        try {
            localStorage.setItem('freshcrm_custom_holidays', JSON.stringify(this.customHolidays));
            this.cache.clear();
        } catch (e) {
            console.error("Failed to save custom holidays", e);
        }
    }

    public addHoliday(holiday: Holiday) {
        if (!holiday.id) holiday.id = Math.random().toString(36).substr(2, 9);
        this.customHolidays.push(holiday);
        this.saveCustomHolidays();
        return holiday;
    }

    public removeHoliday(id: string) {
        this.customHolidays = this.customHolidays.filter(h => h.id !== id);
        this.saveCustomHolidays();
    }

    public async getHolidays(year: number, state?: string, city?: string): Promise<Holiday[]> {
        const cacheKey = `holidays_${year}_${state || ''}_${city || ''}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey) || [];
        }

        let fetchedHolidays: Holiday[] = [];
        let usedSource = '';

        // 1. Try feriados.dev (Primary)
        try {
            let url = `https://api.feriados.dev/v1/holidays?year=${year}`;
            if (state) url += `&state=${state}`;
            if (city) url += `&city=${encodeURIComponent(city)}`;

            // Note: API might require key or be rate limited.
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                fetchedHolidays = data.map((h: any) => ({
                    id: `dev_${h.date}_${h.name}`,
                    date: h.date,
                    name: h.name,
                    type: h.type === 'national' ? 'national' : h.type === 'state' ? 'state' : 'municipal',
                    level: h.type === 'national' ? 'BR' : (h.state || h.city || 'Regional')
                }));
                usedSource = 'feriados.dev';
            } else {
                throw new Error(`feriados.dev status: ${response.status}`);
            }
        } catch (error) {
            console.warn("feriados.dev failed, falling back to basic/BrasilAPI:", error);

            // 2. Fallback: BrasilAPI (National only)
            try {
                const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
                if (response.ok) {
                    const data = await response.json();
                    fetchedHolidays = data.map((h: any) => ({
                        id: `nat_${h.date}`,
                        date: h.date,
                        name: h.name,
                        type: 'national',
                        level: 'BR'
                    }));
                    usedSource = 'brasilapi';
                }
            } catch (err2) {
                console.error("BrasilAPI also failed:", err2);
                // 3. Fallback: Hardcoded
                fetchedHolidays = [
                    { date: `${year}-01-01`, name: 'Confraternização Universal (Offline)', type: 'national', level: 'BR' },
                    { date: `${year}-12-25`, name: 'Natal (Offline)', type: 'national', level: 'BR' }
                ];
                usedSource = 'offline';
            }
        }

        // 4. Merge with Custom & Static
        const relevantCustom = this.customHolidays.filter(h => h.date.startsWith(year.toString()));

        // Static supplements (if not already fetched by API)
        // Only add static regionals if we are in BrasilAPI mode (since feriados.dev should have them)
        let staticRegionals: Holiday[] = [];
        if (usedSource !== 'feriados.dev') {
            staticRegionals = [
                { id: 'reg_sj_ne', date: `${year}-06-24`, name: 'São João (Nordeste)', type: 'state' as const, level: 'NE' },
                { id: 'reg_sp_mj', date: `${year}-07-09`, name: 'Revolução Constitucionalista', type: 'state' as const, level: 'SP' },
                { id: 'reg_rj_g', date: `${year}-04-23`, name: 'Dia de São Jorge', type: 'state' as const, level: 'RJ' },
                { id: 'reg_sp_cn', date: `${year}-11-20`, name: 'Dia da Consciência Negra', type: 'state' as const, level: 'SP' },
            ].filter(s => !relevantCustom.some(c => c.date === s.date && c.name === s.name));
        }

        const allHolidays = [...fetchedHolidays, ...staticRegionals, ...relevantCustom]
            .filter((h, index, self) =>
                index === self.findIndex((t) => (
                    t.date === h.date && t.name === h.name
                ))
            )
            .sort((a, b) => a.date.localeCompare(b.date));

        this.cache.set(cacheKey, allHolidays);
        return allHolidays;
    }
}

export const holidayService = HolidayService.getInstance();
