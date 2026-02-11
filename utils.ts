import { Company, BuySuggestion } from './types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    // Check if it's already ISO or similar, otherwise try to handle potential issues
    try {
        // Use split to avoid timezone issues with simple dates
        if (dateString.includes('T')) {
            return new Date(dateString).toLocaleDateString('pt-BR');
        }
        const [year, month, day] = dateString.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
};

export const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateDeterministicId = (text: string): string => {
    // Simple hash to create a unique-ish string
    let hash = 0;
    const clean = text.trim().toLowerCase();
    if (clean.length === 0) return Math.random().toString(36).substr(2, 9);
    for (let i = 0; i < clean.length; i++) {
        const char = clean.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `stable_${Math.abs(hash).toString(36)}`;
};

// --- Scoring Logic ---

export interface ScoreResult {
    score: number;
    label: string;
    color: 'slate' | 'blue' | 'orange' | 'red';
    details: string[];
}

export const calculateLeadScore = (company: Company): ScoreResult => {
    let score = 0;
    const details: string[] = [];
    const now = new Date();

    // 1. Frequência: Comprou mais de 2x (+15)
    // Fallback: se não tiver array de purchases, mas tiver lastPurchaseDate, conta como 1
    const purchaseCount = company.purchases && company.purchases.length > 0
        ? company.purchases.length
        : (company.lastPurchaseDate ? 1 : 0);

    if (purchaseCount > 2) {
        score += 15;
        details.push("Frequência (>2x): +15");
    }

    // 2. Recência (Regra Atualizada: Inativo > 6 meses)
    if (company.lastPurchaseDate) {
        const lastDate = new Date(company.lastPurchaseDate);
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Média de dias no mês

        if (diffMonths > 6) {
            // Recência (Inativo): > 6 meses (-10)
            score -= 10;
            details.push("Inativo (>6 meses): -10");
        } else if (diffMonths > 3) {
            // Recência (Oportunidade): Entre 3 e 6 meses (+25)
            score += 25;
            details.push("Oportunidade (>3 meses): +25");
        } else if (diffMonths < 2) {
            // Recência (Frio/Abastecido): < 2 meses (+5)
            score += 5;
            details.push("Recente (<2 meses): +5");
        }
    }

    // 3. Volume Financeiro (LTV)
    let totalVolume = 0;
    if (company.purchases && company.purchases.length > 0) {
        totalVolume = company.purchases.reduce((acc, p) => acc + (p.value || 0), 0);
    } else {
        // Fallback para dados legados sem histórico detalhado
        totalVolume = company.lastPurchaseValue || 0;
    }

    if (totalVolume > 100000) {
        score += 40;
        details.push("Volume Ouro (>100k): +40");
    } else if (totalVolume > 50000) {
        score += 20;
        details.push("Volume Prata (>50k): +20");
    } else if (totalVolume > 20000) {
        score += 10;
        details.push("Volume Bronze (>20k): +10");
    }

    // Classificação Final
    let label = 'Frio/Baixo';
    let color: 'slate' | 'blue' | 'orange' | 'red' = 'slate';

    if (score > 80) {
        label = 'Prioritário';
        color = 'red';
    } else if (score > 50) {
        label = 'Quente';
        color = 'orange';
    } else if (score > 20) {
        label = 'Morno';
        color = 'blue';
    }

    return { score, label, color, details };
};

// --- Best Time to Buy Logic ---

export const calculateBestTimeToBuy = (company: Company): BuySuggestion | null => {
    // Need at least one purchase to calculate anything
    if (!company.purchases || company.purchases.length === 0) {
        if (company.lastPurchaseDate) {
            // Legacy fallback: If we only have the lastPurchaseDate field but no array
            const lastDate = new Date(company.lastPurchaseDate);
            if (isNaN(lastDate.getTime())) return null;

            const nextDate = new Date(lastDate);
            nextDate.setMonth(nextDate.getMonth() + 3); // Default 3 months

            const now = new Date();
            const diffTime = now.getTime() - nextDate.getTime();
            const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                nextPurchaseDate: nextDate.toISOString(),
                cycleInDays: 90,
                reason: 'Compra Única (Padrão 3 meses)',
                isLate: daysLate > 0,
                daysLate: daysLate > 0 ? daysLate : 0
            };
        }
        return null;
    }

    // Sort purchases by date ascending
    const sortedPurchases = [...company.purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const validPurchases = sortedPurchases.filter(p => !isNaN(new Date(p.date).getTime()));

    if (validPurchases.length === 0) return null;

    const lastPurchase = validPurchases[validPurchases.length - 1];
    const lastDate = new Date(lastPurchase.date);

    if (validPurchases.length === 1) {
        // Rule: Only 1 purchase -> Best moment is > 3 months
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + 3);

        const now = new Date();
        const diffTime = now.getTime() - nextDate.getTime();
        const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            nextPurchaseDate: nextDate.toISOString(),
            cycleInDays: 90,
            reason: 'Compra Única (Padrão 3 meses)',
            isLate: daysLate > 0,
            daysLate: daysLate > 0 ? daysLate : 0
        };
    } else {
        // Rule: 2 or more -> Analyze average cycle
        let totalDays = 0;
        let intervals = 0;

        for (let i = 1; i < validPurchases.length; i++) {
            const prev = new Date(validPurchases[i - 1].date);
            const curr = new Date(validPurchases[i].date);
            const diffTime = Math.abs(curr.getTime() - prev.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Ignore crazy outliers (e.g. same day 0 days, or > 2 years maybe?) 
            // For now, simple average
            if (diffDays > 0) {
                totalDays += diffDays;
                intervals++;
            }
        }

        const avgCycle = intervals > 0 ? Math.round(totalDays / intervals) : 90;

        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + avgCycle);

        const now = new Date();
        const diffTime = now.getTime() - nextDate.getTime();
        const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            nextPurchaseDate: nextDate.toISOString(),
            cycleInDays: avgCycle,
            reason: `Média de ${intervals} intervalos`,
            isLate: daysLate > 0,
            daysLate: daysLate > 0 ? daysLate : 0
        };
    }
};

// --- New Parsers ---

export const parseBrazilianDate = (dateStr: string): string | undefined => {
    if (!dateStr || typeof dateStr !== 'string') return undefined;
    const cleanStr = dateStr.trim();
    if (!cleanStr) return undefined;

    // Handle dd/mm/yyyy or dd.mm.yyyy or dd-mm-yyyy
    // Matches 1 or 2 digits, separator, 1 or 2 digits, separator, 2 or 4 digits
    const brDateRegex = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/;
    const match = cleanStr.match(brDateRegex);

    if (match) {
        let [_, day, month, year] = match;
        // Handle 2 digit year (assume 20xx)
        if (year.length === 2) year = '20' + year;

        // Return ISO format YYYY-MM-DD
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
    }

    // Handle standard SQL format YYYY-MM-DD that might be in the CSV
    const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})/;
    if (isoDateRegex.test(cleanStr)) {
        return `${cleanStr}T00:00:00.000Z`;
    }

    // Try standard date parse as fallback
    const date = new Date(cleanStr);
    return !isNaN(date.getTime()) ? date.toISOString() : undefined;
};

export const parseBrazilianCurrency = (valStr: string | number): number => {
    if (valStr === undefined || valStr === null || valStr === '') return 0;
    if (typeof valStr === 'number') return valStr;

    let cleanStr = valStr.toString().trim();

    // Heuristic to detect format:
    // If it has a comma, it is likely BR format (1.200,50 or 50,00)
    // If it has no comma but has a dot, and it parses directly, it might be US format (1200.50)

    if (cleanStr.includes(',')) {
        // Brazilian Format: Remove dots (thousands), replace comma with dot (decimal)
        cleanStr = cleanStr
            .replace(/[R$\s]/g, '') // remove currency symbol
            .replace(/\./g, '')     // remove thousand separator dots
            .replace(',', '.');     // replace comma with dot
    } else {
        // International/Database Format: Just clean symbols
        cleanStr = cleanStr.replace(/[R$\s,]/g, '');
    }

    const number = parseFloat(cleanStr);
    return isNaN(number) ? 0 : number;
};

// Robust CSV Parser
export const parseCSV = (text: string): any[] => {
    // Normalize line endings
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const firstLine = lines[0];

    // Auto-detect separator (count occurrences in header)
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const separator = semicolonCount >= commaCount ? ';' : ',';

    // Parser helper to handle quotes
    const parseLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                // Handle escaped quotes ("") inside quotes
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === separator && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    // Get headers and normalize to lowercase for easier matching, keep original for reference if needed
    const headers = parseLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));

    return lines.slice(1).map(line => {
        if (!line.trim()) return null;
        const values = parseLine(line);
        const obj: any = {};
        headers.forEach((h, i) => {
            // Clean up values (remove surrounding quotes if any)
            let val = values[i] || '';
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            // Map to lowercase key for fuzzy search later, but keep data intact
            obj[h.toLowerCase()] = val;
        });
        return obj;
    }).filter(Boolean);
};

// --- Export CSV ---
export const exportToCSV = (companies: Company[], fileName?: string) => {
    const headers = [
        'Nome',
        'CNPJ',
        'Código',
        'Representante',
        'Status',
        'Telefone',
        'Celular',
        'Cidade',
        'UF',
        'Bairro',
        'Endereço',
        'CEP',
        'Tags',
        'Data Últ. Compra',
        'Valor Últ. Compra'
    ];

    const escapeCsv = (val: any) => {
        if (val === undefined || val === null) return '';
        const str = String(val);
        // If contains separator or quotes, wrap in quotes and escape internal quotes
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvRows = [
        headers.join(';'), // Header row
        ...companies.map(c => {
            return [
                escapeCsv(c.name),
                escapeCsv(c.cnpj),
                escapeCsv(c.clientCode),
                escapeCsv(c.representative),
                escapeCsv(c.isActive ? 'ATIVO' : 'INATIVO'),
                escapeCsv(c.phone),
                escapeCsv(c.mobile),
                escapeCsv(c.city),
                escapeCsv(c.state),
                escapeCsv(c.neighborhood),
                escapeCsv(c.address),
                escapeCsv(c.zip),
                escapeCsv(c.tags.join(', ')),
                escapeCsv(formatDate(c.lastPurchaseDate)),
                escapeCsv(c.lastPurchaseValue?.toString().replace('.', ',')) // Format number for BR Excel
            ].join(';');
        })
    ];

    const csvString = csvRows.join('\n');
    // Add BOM for Excel UTF-8 recognition
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });

    // Determine filename
    let finalName = fileName || `exportacao_crm_${new Date().toISOString().split('T')[0]}`;
    if (!finalName.toLowerCase().endsWith('.csv')) {
        finalName += '.csv';
    }

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', finalName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Export PDF ---
export const exportToPDF = (companies: Company[], fileName?: string) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text(`Relatório de Clientes (${companies.length})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 21);

    // Columns for the PDF
    const tableColumn = [
        "Empresa",
        "Status",
        "Cidade/UF",
        "Telefone/Celular",
        "Rep.",
        "Tags",
        "Últ. Compra",
        "Valor"
    ];

    const tableRows = companies.map(c => [
        c.name,
        c.isActive ? 'ATIVO' : 'INATIVO',
        `${c.city} - ${c.state}`,
        `${c.phone || ''} ${c.mobile ? '/ ' + c.mobile : ''}`,
        c.representative,
        c.tags.join(', '),
        formatDate(c.lastPurchaseDate),
        formatCurrency(c.lastPurchaseValue)
    ]);

    // Generate Table
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235] }, // Blue-600
        alternateRowStyles: { fillColor: [241, 245, 249] }, // Slate-100
        columnStyles: {
            0: { cellWidth: 50 }, // Name
            5: { cellWidth: 30 }, // Tags
            7: { halign: 'right' } // Value
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                if (data.cell.raw === 'INATIVO') {
                    data.cell.styles.textColor = [220, 38, 38]; // Red
                    data.cell.styles.fontStyle = 'bold';
                } else {
                    data.cell.styles.textColor = [22, 163, 74]; // Green
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // Determine filename
    let finalName = fileName || `relatorio_crm_${new Date().toISOString().split('T')[0]}`;
    if (!finalName.toLowerCase().endsWith('.pdf')) {
        finalName += '.pdf';
    }

    doc.save(finalName);
};

// --- GENERATE ITINERARY PDF (ROTEIRO - ENHANCED) ---
export const generateItineraryPDF = (companies: Company[], title: string = "Roteiro de Visitas", customNotes: Record<string, string> = {}, mapImage?: string) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // --- HEADER ---
    doc.setFillColor(15, 23, 42); // Slate 950
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 14, 16);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} | ${companies.length} Clientes`, 283, 16, { align: 'right' });

    let tableStartY = 30;

    // --- MAP IMAGE ---
    if (mapImage) {
        // Add map image
        // A4 Landscape is 297mm x 210mm
        // Margins 14mm
        const imgWidth = 297 - 28; // Full width minus margins
        const imgHeight = 90; // Fixed height for map

        doc.addImage(mapImage, 'PNG', 14, 30, imgWidth, imgHeight);
        tableStartY = 30 + imgHeight + 10; // Push table down
    }

    // --- TABLE COLUMNS ---
    const tableColumn = [
        "Cidade / UF",
        "Cliente & Dados",
        "Contato",
        "Histórico & Status", // Merged important finance data here
        "Tags",
        "Obs / Roteiro"
    ];

    // Helper to check delinquency
    const isDelinquent = (c: Company) => {
        return c.delinquencyHistory && c.delinquencyHistory.some(d => d.status === 'pending');
    };

    const tableRows = companies.map(c => {
        const delinquent = isDelinquent(c);

        // Col 1: Cidade (Isolated)
        const col1 = `${c.city}\n${c.state}`;

        // Col 2: Name and Address
        const col2 = `${c.name}\n${c.address}, ${c.neighborhood}\nCNPJ: ${c.cnpj}`;

        // Col 3: Contact
        const phones = [c.phone, c.mobile].filter(Boolean).join(' / ');
        const col3 = `Tel: ${phones}\nRep: ${c.representative}\nCód: ${c.clientCode}`;

        // Col 4: Finance & Status (EMPHASIZED)
        const lastBuyDate = c.lastPurchaseDate ? formatDate(c.lastPurchaseDate) : '-';
        const lastValRaw = c.lastPurchaseValue ? formatCurrency(c.lastPurchaseValue) : 'R$ 0,00';
        const statusText = c.isActive ? "ATIVO" : "INATIVO";

        // We put raw values to style them in didParseCell
        // Format: [STATUS] \n VALUE \n DATE
        const col4 = `${statusText}\n${lastValRaw}\n${lastBuyDate}`;

        // Col 5: Tags & Alert
        let tags = c.tags.join(', ');
        if (delinquent) {
            tags = `[INADIMPLENTE]\n${tags}`;
        }

        // Col 6: Custom Notes
        const note = customNotes[c.id] || "";

        return [col1, col2, col3, col4, tags, note];
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: tableStartY,
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle',
            lineColor: [203, 213, 225], // Slate 300
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [51, 65, 85], // Slate 700
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold', halign: 'center' }, // Cidade
            1: { cellWidth: 70 }, // Cliente + Endereço
            2: { cellWidth: 35 }, // Contato
            3: { cellWidth: 35, halign: 'center' }, // Financeiro (Highlighted)
            4: { cellWidth: 35 }, // Tags
            5: { cellWidth: 'auto' } // Remainder for notes
        },
        // ROW STYLING LOGIC
        didParseCell: (data) => {
            if (data.section === 'body') {
                const rowIndex = data.row.index;
                const company = companies[rowIndex];

                // Highlight Delinquent Rows
                if (isDelinquent(company)) {
                    data.cell.styles.fillColor = [254, 242, 242]; // Red 50
                } else if (!company.isActive) {
                    data.cell.styles.fillColor = [224, 242, 254]; // Blue 50
                }

                // COLUMN 3: FINANCE & STATUS EMPHASIS
                if (data.column.index === 3) {
                    // This cell has 3 lines: Status, Value, Date
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 10;

                    if (company.isActive) {
                        data.cell.styles.textColor = [21, 128, 61]; // Green 700
                    } else {
                        data.cell.styles.textColor = [185, 28, 28]; // Red 700
                    }
                }

                // Highlight Delinquency Tag Text in Col 4
                if (data.column.index === 4 && isDelinquent(company)) {
                    data.cell.styles.textColor = [220, 38, 38]; // Red
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    doc.save(filename);
};