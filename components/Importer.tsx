import React, { useState, useRef } from 'react';
import { X, Upload, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { parseCSV, generateId, parseBrazilianDate, parseBrazilianCurrency } from '../utils';
import { Company } from '../types';

interface ImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (companies: Company[]) => void;
}

const Importer: React.FC<ImporterProps> = ({ isOpen, onClose, onImport }) => {
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processData = (text: string) => {
    try {
      const data = parseCSV(text);
      if (data.length === 0) throw new Error("Nenhum dado encontrado no arquivo.");

      const findValue = (row: any, candidates: string[], exclude: string[] = []) => {
        const rowKeys = Object.keys(row);
        // 1. Exact Match
        for (const candidate of candidates) {
          const exactKey = rowKeys.find(k => k === candidate.toLowerCase());
          if (exactKey && !exclude.some(e => exactKey.includes(e))) return row[exactKey];
        }
        // 2. Contains Match
        for (const candidate of candidates) {
          const foundKey = rowKeys.find(k => k.includes(candidate.toLowerCase()) && !exclude.some(e => k.includes(e)));
          if (foundKey && row[foundKey]) return row[foundKey];
        }
        return '';
      };

      const companies: Company[] = data.map(row => {
        // Essential fields
        const name = findValue(row, ['nome', 'razao social', 'cliente', 'nome da empresa']);
        const codigo = findValue(row, ['codigo', 'id', 'cod']);

        if (!name && !codigo) return null; // Skip empty rows

        // Parsing fields specific to the user request
        const rawDate = findValue(row, ['ultimacompra', 'ultima compra']);
        const rawValue = findValue(row, ['vlrultimacompra', 'valor ultima compra']);
        const rawBirth = findValue(row, ['nascimento', 'data nascimento']);
        const rawAtivo = findValue(row, ['ativo']);

        return {
          id: generateId(),
          clientCode: codigo || generateId(),
          isActive: rawAtivo ? (rawAtivo.toLowerCase() === 'sim' || rawAtivo === '1' || rawAtivo.toLowerCase() === 'true') : true,
          type: findValue(row, ['tipo']),
          cnpj: findValue(row, ['cpf_cpnj', 'cnpj', 'cpf']),
          ie: findValue(row, ['ie', 'inscrição estadual', 'inscricao estadual']),
          name: name,
          fantasyName: findValue(row, ['nome da empresa', 'nome fantasia', 'fantasia']) || name,
          address: findValue(row, ['endereco', 'logradouro', 'rua']),
          neighborhood: findValue(row, ['bairro', 'distrito']),
          zip: findValue(row, ['cep']),
          ibge: findValue(row, ['ibge']),
          cityCode: findValue(row, ['codcidade', 'cod cidade']),
          city: findValue(row, ['cidade', 'municipio']),
          state: findValue(row, ['estado', 'uf']),
          phone: findValue(row, ['telefone', 'fixo']),
          mobile: findValue(row, ['celular', 'whatsapp', 'mobile']),
          fax: findValue(row, ['fax']),
          email: findValue(row, ['email', 'e-mail']),
          birthDate: parseBrazilianDate(rawBirth),
          lastPurchaseDate: parseBrazilianDate(rawDate),
          lastPurchaseValue: parseBrazilianCurrency(rawValue),
          region: findValue(row, ['regiao']),

          // Aux fields
          representative: findValue(row, ['nome vendedor', 'vendedor', 'nome fantasia vendedor', 'consultor']) ||
            findValue(row, ['representante'], ['legal', 'socio']) || // Avoid 'Representante Legal'
            findValue(row, ['regiao']) || '',
          tags: (findValue(row, ['tags', 'categoria']) || '').split(/[,;]/).map((t: string) => t.trim()).filter(Boolean),
          purchases: [],
          delinquencyHistory: []
        };
      }).filter(Boolean) as Company[];

      if (companies.length === 0) {
        throw new Error("Não foi possível identificar os dados. Verifique o cabeçalho do arquivo.");
      }

      onImport(companies);
      setCsvText('');
      setFileName(null);
      setError(null);
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erro ao processar CSV. Verifique o formato.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
        setError(null);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Upload size={20} className="text-blue-600" />
            Importação CSV
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="bg-blue-50 p-4 rounded-lg mb-6 flex gap-3 items-start text-sm text-blue-800">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">Layout Esperado (Colunas):</p>
              <p className="mb-2">O sistema reconhece automaticamente colunas como:</p>
              <p className="font-mono text-xs bg-white/50 p-2 rounded border border-blue-100 mb-2">
                CODIGO, ATIVO, TIPO, CPF_CPNJ, IE, NOME, FANTASIA, ENDERECO, BAIRRO, CEP, IBGE, CODCIDADE, CIDADE, ESTADO, TELEFONE, CELULAR, FAX, EMAIL, NASCIMENTO, ULTIMACOMPRA, VLRULTIMACOMPRA, REGIAO
              </p>
              <p className="text-xs">Outros nomes de colunas comuns (ex: 'Razão Social' para 'NOME') também são aceitos.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
              />
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                <FileSpreadsheet size={24} className="text-slate-500 group-hover:text-blue-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                {fileName ? fileName : "Clique para selecionar seu arquivo CSV"}
              </p>
              {!fileName && (
                <p className="text-xs text-slate-400 mt-1">ou arraste e solte aqui</p>
              )}
            </div>

            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setFileName(null);
              }}
              placeholder="Cole os dados CSV aqui (Cabeçalho + Dados)..."
              className="w-full h-32 p-4 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-200 outline-none resize-none"
            />
          </div>

          {error && (
            <div className="mt-3 text-red-500 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => processData(csvText)}
            disabled={!csvText.trim()}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            Processar Dados
          </button>
        </div>
      </div>
    </div>
  );
};

export default Importer;