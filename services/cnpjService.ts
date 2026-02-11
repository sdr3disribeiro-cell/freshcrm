
export interface CnpjData {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    situacao_cadastral: string; // ATIVA, BAIXADA, INAPTA, etc.
    cnae_fiscal_descricao: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    qsa?: { nome_socio: string; qualif_socio: string }[];
}

class CnpjService {
    private static instance: CnpjService;
    private cache: Map<string, CnpjData> = new Map();

    private constructor() { }

    public static getInstance(): CnpjService {
        if (!CnpjService.instance) {
            CnpjService.instance = new CnpjService();
        }
        return CnpjService.instance;
    }

    public async consultCnpj(cnpj: string): Promise<CnpjData | null> {
        const cleanCnpj = cnpj.replace(/\D/g, '');

        if (cleanCnpj.length !== 14) {
            throw new Error("CNPJ Inválido (deve ter 14 dígitos).");
        }

        if (this.cache.has(cleanCnpj)) {
            return this.cache.get(cleanCnpj)!;
        }

        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);

            if (response.status === 404) {
                throw new Error("CNPJ não encontrado na Receita Federal.");
            }
            if (!response.ok) {
                // Too many requests (429) logic could be handled here or by caller delay
                throw new Error(`Erro API: ${response.status}`);
            }

            const data = await response.json();
            this.cache.set(cleanCnpj, data);
            return data;
        } catch (error) {
            console.error("Erro ao consultar CNPJ:", error);
            throw error;
        }
    }
}

export const cnpjService = CnpjService.getInstance();
