import React from 'react';
import { Users, Calendar, PlusCircle, Upload, ListTodo, Database, LayoutDashboard, Moon, Sun, Map as MapIcon, RefreshCw, Briefcase } from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  onImport: () => void;
  onNewCompany: () => void;
  onSync: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onImport, onNewCompany, onSync, isDarkMode, toggleTheme }) => {
  const navItemClass = (active: boolean) =>
    `flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer mb-1 ${active
      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-colors duration-200 z-50">
      <div className="p-6 flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">
          F
        </div>
        <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">FreshCRM</span>
      </div>

      <div className="px-4 mb-4 flex-shrink-0">
        <button
          onClick={onNewCompany}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium transition-all shadow-sm shadow-blue-200 dark:shadow-none"
        >
          <PlusCircle size={18} />
          <span>Nova Empresa</span>
        </button>
      </div>

      <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar min-h-0">
        <div
          className={navItemClass(currentView === 'dashboard')}
          onClick={() => onChangeView('dashboard')}
          title="Visão Geral"
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </div>
        <div
          className={navItemClass(currentView === 'list' || currentView === 'detail')}
          onClick={() => onChangeView('list')}
          title="Lista de Clientes"
        >
          <Users size={20} />
          <span>Leads & Clientes</span>
        </div>
        <div
          className={navItemClass(currentView === 'cadences')}
          onClick={() => onChangeView('cadences')}
          title="Processos de Venda"
        >
          <ListTodo size={20} />
          <span>Cadências</span>
        </div>
        {/* ROTEIRO MODULE */}
        <div
          className={navItemClass(currentView === 'roteiro')}
          onClick={() => onChangeView('roteiro')}
          title="Gerar Roteiro de Visitas"
        >
          <MapIcon size={20} />
          <span>Roteiro de Visitas</span>
        </div>
        <div
          className={navItemClass(currentView === 'databases')}
          onClick={() => onChangeView('databases')}
          title="Gestão de Dados"
        >
          <Database size={20} />
          <span>Base de Dados</span>
        </div>
        <div
          className={navItemClass(currentView === 'calendar')}
          onClick={() => onChangeView('calendar')}
          title="Agenda"
        >
          <Calendar size={20} />
          <span>Calendário</span>
        </div>

        <div
          className={navItemClass(currentView === 'deals')}
          onClick={() => onChangeView('deals')}
          title="Oportunidades de Negócio"
        >
          <Briefcase size={20} />
          <span>Negócios</span>
        </div>

        <div className="my-4 border-t border-slate-100 dark:border-slate-800"></div>

        <div
          className="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={onSync}
          title="Forçar atualização da planilha"
        >
          <RefreshCw size={20} />
          <span>Sincronizar Dados</span>
        </div>
      </nav>

      {/* Dark Mode Toggle */}
      <div className="px-4 py-2 flex-shrink-0 mt-auto">
        <div
          onClick={toggleTheme}
          className="flex items-center justify-between p-3 rounded-lg cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
            <span className="text-sm font-medium">{isDarkMode ? 'Modo Escuro' : 'Modo Claro'}</span>
          </div>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isDarkMode ? 'left-4.5 translate-x-1' : 'left-0.5'}`}></div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        <button
          onClick={onImport}
          className="flex items-center gap-2 w-full justify-center p-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm"
        >
          <Upload size={16} />
          <span>Importar CSV</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;