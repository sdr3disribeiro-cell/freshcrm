
export interface Purchase {
  id: string;
  orderId: string; // PEDIDO
  status: string; // STATUS
  date: string; // DATA (ISO)
  sellerCode: string; // CODVENDEDOR
  sellerName: string; // VENDEDOR
  operation: string; // OPERACAO
  invoice: string; // NF
  paymentTerm: string; // CONDICAOPAGTO
  itemsCount: number; // PECAS
  value: number; // VALOR
  discount: number; // DESCONTO
  ipi: number; // IPI
  freight: number; // FRETE
  freightType: string; // Tipo Frete
  carrier: string; // TRANSPORTADORA
}

export interface Delinquency {
  id: string;
  date: string; // Data da dívida
  value: number;
  status: 'pending' | 'resolved';
  origin?: string; // Nome do arquivo ou origem
}

export interface BuySuggestion {
  nextPurchaseDate: string; // ISO Date
  cycleInDays: number;
  reason: string;
  isLate: boolean;
  daysLate: number;
}

export interface Company {
  id: string;
  // Mapeamento solicitado
  clientCode: string;      // CODIGO
  isActive: boolean;       // ATIVO
  type: string;            // TIPO (ex: F, J, Consumidor)
  cnpj: string;            // CPF_CPNJ
  ie: string;              // IE
  name: string;            // NOME (Razão Social)
  fantasyName: string;     // Nome da Empresa (Fantasia)
  address: string;         // ENDERECO
  neighborhood: string;    // BAIRRO
  zip: string;             // CEP
  ibge: string;            // IBGE
  cityCode: string;        // CODCIDADE
  city: string;            // CIDADE
  state: string;           // ESTADO
  phone: string;           // TELEFONE
  mobile: string;          // CELULAR
  fax: string;             // FAX
  email: string;           // EMAIL
  birthDate?: string;      // NASCIMENTO (ISO Date)
  lastPurchaseDate?: string; // ULTIMACOMPRA (ISO Date)
  lastPurchaseValue?: number; // VLRULTIMACOMPRA
  region: string;          // REGIAO

  // Campos Auxiliares do CRM
  representative: string;  // Mantido para compatibilidade, pode ser igual a REGIAO
  tags: string[];
  receitaStatus?: string;
  lastReceitaCheck?: string;
  purchases: Purchase[];
  delinquencyHistory: Delinquency[];
}

export interface Note {
  id: string;
  companyId: string;
  content: string;
  createdAt: string; // ISO Date string
  type: 'note' | 'call' | 'email' | 'meeting';
}

export interface Task {
  id: string;
  companyId: string;
  title: string;
  dueDate: string; // ISO Date string
  isCompleted: boolean;
}

export interface CadenceItem {
  companyId: string;
  status: 'pending' | 'completed' | 'skipped';
  addedAt: string;
}

export interface Cadence {
  id: string;
  name: string;
  description: string;
  items: CadenceItem[];
  createdAt: string;
  status?: 'active' | 'completed'; // New field
}

export type TagColor = 'slate' | 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'pink' | 'teal';

export interface Database {
  id: string;
  tagName: string;
  fileName: string;
  importedAt: string;
  matchedCount: number;
  totalRows: number;
  color: TagColor;
  type?: 'general' | 'sales' | 'inadimplencia'; // Added inadimplencia
}

export type ViewMode = 'dashboard' | 'list' | 'calendar' | 'detail' | 'cadences' | 'databases' | 'roteiro' | 'deals';

export interface CRMState {
  companies: Company[];
  notes: Note[];
  tasks: Task[];
  cadences: Cadence[];
  databases: Database[];
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
