import React from 'react';
import { Users, Calendar, PlusCircle, Upload, ListTodo, Database, LayoutDashboard, Moon, Sun, Map as MapIcon, RefreshCw, Briefcase, X, UserPlus, LogOut, Settings } from 'lucide-react';
import { ViewMode } from '../types';
import { motion } from 'framer-motion';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  onImport: () => void;
  onNewCompany: () => void;
  onSync: () => void;
  onSettings: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isOpen: boolean;        // Mobile state
  onClose: () => void;    // Close handler
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView, onChangeView, onImport, onNewCompany, onSync, onSettings,
  isDarkMode, toggleTheme, isOpen, onClose
}) => {

  const navItemClass = (active: boolean) =>
    `flex items-center gap-3 p-3 text-sm font-medium rounded-r-full transition-all cursor-pointer mb-2 border-l-4 ${active
      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`;

  const renderItem = (view: ViewMode, icon: React.ReactNode, label: string) => (
    <motion.div
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.95 }}
      className={navItemClass(currentView === view)}
      onClick={() => { onChangeView(view); onClose(); }}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </motion.div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <motion.aside
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-[#0F1115] border-r border-slate-800 flex flex-col z-50`}
        initial={false}
        animate={{ x: isOpen ? 0 : 0 }}
      >
        {/* Logo Area */}
        <div className="p-6 flex items-center justify-between flex-shrink-0 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-400 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-orange-900/20">
              <span className="text-xl">V</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">VistaCRM</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest">Enterprise</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500">
            <X size={24} />
          </button>
        </div>

        {/* CTA Button */}
        <div className="px-6 py-6">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(249, 115, 22, 0.3)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { onNewCompany(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white p-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20"
          >
            <PlusCircle size={20} />
            <span>Nova Empresa</span>
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Geral</p>
            {renderItem('dashboard', <LayoutDashboard size={20} />, 'Dashboard')}
            {renderItem('calendar', <Calendar size={20} />, 'Calendário')}
          </div>

          <div className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas</p>
            {renderItem('leads', <UserPlus size={20} />, 'Leads (Inbound)')}
            {renderItem('deals', <Briefcase size={20} />, 'Pipeline / Negócios')}
            {renderItem('cadences', <ListTodo size={20} />, 'Cadências')}
            {renderItem('roteiro', <MapIcon size={20} />, 'Roteiro de Visitas')}
          </div>

          <div className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dados</p>
            {renderItem('list', <Users size={20} />, 'Base de Clientes')}
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0F1115]">
          <motion.button
            whileHover={{ x: 5 }}
            onClick={() => { onSync(); onClose(); }}
            className="flex items-center gap-3 w-full p-2 text-slate-400 hover:text-orange-400 transition-colors mb-2"
          >
            <RefreshCw size={18} />
            <span className="text-sm font-medium">Sincronizar Dados</span>
          </motion.button>

          <motion.button
            whileHover={{ x: 5 }}
            onClick={() => { onImport(); onClose(); }}
            className="flex items-center gap-3 w-full p-2 text-slate-400 hover:text-blue-400 transition-colors mb-2"
          >
            <Upload size={18} />
            <span className="text-sm font-medium">Importar CSV</span>
          </motion.button>

          <motion.button
            whileHover={{ x: 5 }}
            onClick={() => { onSettings(); onClose(); }}
            className="flex items-center gap-3 w-full p-2 text-slate-400 hover:text-pink-400 transition-colors"
          >
            <Settings size={18} />
            <span className="text-sm font-medium">Configurações</span>
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;