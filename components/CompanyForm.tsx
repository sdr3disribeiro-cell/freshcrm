import React, { useState } from 'react';
import { X, Building, User, Phone, MapPin, Save, FileText } from 'lucide-react';
import { Company } from '../types';
import { generateId } from '../utils';

interface CompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (company: Company) => void;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    fantasyName: '',
    cnpj: '',
    ie: '',
    clientCode: '',
    type: 'J',
    isActive: true,
    representative: '',
    region: '',
    phone: '',
    mobile: '',
    fax: '',
    email: '',
    address: '',
    neighborhood: '',
    city: '',
    cityCode: '',
    state: '',
    zip: '',
    ibge: '',
    tags: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCompany: Company = {
      id: generateId(),
      name: formData.name,
      fantasyName: formData.fantasyName || formData.name,
      cnpj: formData.cnpj,
      ie: formData.ie,
      clientCode: formData.clientCode || generateId(),
      type: formData.type,
      isActive: Boolean(formData.isActive),
      representative: formData.representative,
      region: formData.region,
      phone: formData.phone,
      mobile: formData.mobile,
      fax: formData.fax,
      email: formData.email,
      address: formData.address,
      neighborhood: formData.neighborhood,
      city: formData.city,
      cityCode: formData.cityCode,
      state: formData.state,
      zip: formData.zip,
      ibge: formData.ibge,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      lastPurchaseDate: undefined,
      lastPurchaseValue: 0,
      purchases: [],
      delinquencyHistory: []
    };

    onSave(newCompany);
    onClose();
    // Reset form to defaults
    setFormData({
      name: '', fantasyName: '', cnpj: '', ie: '', clientCode: '', type: 'J', isActive: true,
      representative: '', region: '', phone: '', mobile: '', fax: '', email: '',
      address: '', neighborhood: '', city: '', cityCode: '', state: '', zip: '', ibge: '', tags: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building size={20} className="text-blue-600" /> 
            Nova Empresa (Cadastro Completo)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Dados Principais */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={14} /> Dados Cadastrais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social (Nome) *</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
                <input name="fantasyName" value={formData.fantasyName} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ / CPF *</label>
                <input required name="cnpj" value={formData.cnpj} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Estadual</label>
                <input name="ie" value={formData.ie} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Pessoa</label>
                 <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                     <option value="J">Jurídica</option>
                     <option value="F">Física</option>
                 </select>
              </div>
              <div className="flex items-center pt-6 gap-2">
                  <input type="checkbox" name="isActive" checked={Boolean(formData.isActive)} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
                  <label className="text-sm font-medium text-slate-700">Cliente Ativo</label>
              </div>
            </div>
          </div>

          {/* Contato & Comercial */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User size={14} /> Contato & Comercial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Fixo</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Celular / Whats</label>
                  <input name="mobile" value={formData.mobile} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fax</label>
                  <input name="fax" value={formData.fax} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Código Cliente</label>
                 <input name="clientCode" value={formData.clientCode} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" placeholder="Opcional" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Região</label>
                 <input name="region" value={formData.region} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
               </div>
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Representante/Vendedor</label>
                 <input name="representative" value={formData.representative} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
               </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin size={14} /> Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                <input name="zip" value={formData.zip} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço (Rua, Nº, Comp)</label>
                <input name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                <input name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                <input name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Cod. Cidade</label>
                <input name="cityCode" value={formData.cityCode} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
               <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                <input name="state" value={formData.state} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" maxLength={2} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">IBGE</label>
                <input name="ibge" value={formData.ibge} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (separadas por vírgula)</label>
            <input name="tags" value={formData.tags} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" placeholder="VIP, Prospecção, Varejo" />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Save size={18} /> Salvar Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;
