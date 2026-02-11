import React, { useState, useMemo } from 'react';
import { Company, Task } from '../types';
import { Search, Filter, UserPlus, CheckCircle, XCircle, Calendar, Plus, Phone, Mail, MoreHorizontal } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';

interface LeadsViewProps {
    companies: Company[];
    onUpdateCompany: (company: Company) => void;
    onAddTask: (task: Task) => void;
    onSelectCompany: (company: Company) => void;
}

const MEMBROS_SDR = ['Abner', 'Elvis', 'Vinicius'];

const LeadsView: React.FC<LeadsViewProps> = ({ companies, onUpdateCompany, onAddTask, onSelectCompany }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'New' | 'Qualified' | 'Disqualified'>('All');
    const [sdrFilter, setSdrFilter] = useState<string>('All');

    const leads = useMemo(() => {
        return companies.filter(c => c.isLead || c.tags.includes('INBOUND') || c.leadStatus);
    }, [companies]);

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' ? true : lead.leadStatus === statusFilter || (!lead.leadStatus && statusFilter === 'New');
            const matchesSdr = sdrFilter === 'All' ? true : lead.sdr === sdrFilter;

            return matchesSearch && matchesStatus && matchesSdr;
        });
    }, [leads, searchTerm, statusFilter, sdrFilter]);

    const handleAssignSdr = (lead: Company, sdr: string) => {
        const updatedLead = { ...lead, sdr, leadStatus: lead.leadStatus || 'New', isLead: true };
        onUpdateCompany(updatedLead);
    };

    const handleStatusChange = (lead: Company, status: 'Qualified' | 'Disqualified') => {
        const updatedLead = { ...lead, leadStatus: status, isLead: true };
        onUpdateCompany(updatedLead);
    };

    const handleCreateTask = (lead: Company) => {
        const title = prompt('Título da Tarefa para ' + lead.name);
        if (title) {
            const newTask: Task = {
                id: Math.random().toString(36).substr(2, 9),
                companyId: lead.id,
                title: title,
                dueDate: new Date().toISOString(),
                isCompleted: false
            };
            onAddTask(newTask);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <UserPlus className="text-blue-600" />
                        Gestão de Leads
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {filteredLeads.length} leads encontrados
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Stats or Actions */}
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="All">Todos Status</option>
                    <option value="New">Novos</option>
                    <option value="Qualified">Qualificados</option>
                    <option value="Disqualified">Desqualificados</option>
                </select>

                <select
                    value={sdrFilter}
                    onChange={(e) => setSdrFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="All">Todos SDRs</option>
                    {MEMBROS_SDR.map(sdr => (
                        <option key={sdr} value={sdr}>{sdr}</option>
                    ))}
                </select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4">
                    {filteredLeads.map(lead => (
                        <div key={lead.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-all hover:shadow-md">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                                {/* Info */}
                                <div className="flex-1 cursor-pointer" onClick={() => onSelectCompany(lead)}>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{lead.name}</h3>
                                        {lead.leadStatus === 'Qualified' && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Qualificado</span>}
                                        {lead.leadStatus === 'Disqualified' && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">Desqualificado</span>}
                                        {(!lead.leadStatus || lead.leadStatus === 'New') && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Novo</span>}
                                    </div>
                                    <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} /> {lead.email || 'Sem email'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} /> {lead.mobile || lead.phone || 'Sem telefone'}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Panel */}
                                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 pt-4 md:pt-0 md:pl-4">

                                    {/* SDR Selector */}
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 mb-1">SDR Responsável</span>
                                        <select
                                            value={lead.sdr || ''}
                                            onChange={(e) => handleAssignSdr(lead, e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm text-slate-700 dark:text-slate-300"
                                        >
                                            <option value="">Atribuir...</option>
                                            {MEMBROS_SDR.map(sdr => (
                                                <option key={sdr} value={sdr}>{sdr}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCreateTask(lead)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400"
                                            title="Criar Tarefa"
                                        >
                                            <Calendar size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(lead, 'Qualified')}
                                            className={`p-2 rounded-lg transition-colors ${lead.leadStatus === 'Qualified' ? 'bg-green-100 text-green-600' : 'hover:bg-green-50 text-slate-400 hover:text-green-600'}`}
                                            title="Qualificar"
                                        >
                                            <CheckCircle size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(lead, 'Disqualified')}
                                            className={`p-2 rounded-lg transition-colors ${lead.leadStatus === 'Disqualified' ? 'bg-red-100 text-red-600' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                                            title="Desqualificar"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>

                                </div>

                            </div>
                        </div>
                    ))}

                    {filteredLeads.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <p>Nenhum lead encontrado com os filtros atuais.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeadsView;
