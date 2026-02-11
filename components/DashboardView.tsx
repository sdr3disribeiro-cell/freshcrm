import React, { useMemo, useState } from 'react';
import { Company, Purchase } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { TrendingUp, Users, DollarSign, Map, Award, Filter, X, Calendar, ShoppingBag, Truck, AlertTriangle, ArrowRight, Search } from 'lucide-react';
import { differenceInDays, isAfter, isBefore, startOfDay, endOfDay, eachDayOfInterval, eachMonthOfInterval, format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import WeatherWidget from './WeatherWidget';
import HoroscopeWidget from './HoroscopeWidget';
import StatsCard from './StatsCard';
import { useAuth } from '../contexts/AuthContext';

interface DashboardViewProps {
    companies: Company[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ companies }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'sales' | 'delinquency'>('general');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRep, setSelectedRep] = useState('');

    // --- Logic Reuse ---
    const uniqueReps = useMemo(() => {
        const reps = new Set<string>();
        companies.forEach(c => {
            if (c.purchases) {
                c.purchases.forEach(p => { if (p.sellerName) reps.add(p.sellerName); });
            }
        });
        return Array.from(reps).sort();
    }, [companies]);

    const filteredCompanies = useMemo(() => {
        // Companies Filter (Simplified for general view)
        return companies;
    }, [companies]);

    const allPurchases = useMemo(() => {
        let purchases: Purchase[] = [];
        companies.forEach(c => { if (c.purchases) purchases.push(...c.purchases); });

        return purchases.filter(p => {
            const pDate = new Date(p.date);
            if (startDate && isBefore(pDate, startOfDay(new Date(startDate + 'T00:00:00')))) return false;
            if (endDate && isAfter(pDate, endOfDay(new Date(endDate + 'T23:59:59')))) return false;

            if (selectedRep) {
                const seller = p.sellerName || '';
                if (!seller.toLowerCase().includes(selectedRep.toLowerCase())) return false;
            }

            return true;
        });
    }, [companies, startDate, endDate, selectedRep]);

    const metrics = useMemo(() => {
        let totalRevenue = 0;
        let activeClients = 0;
        const revenueByState: Record<string, number> = {};
        const revenueByRep: Record<string, number> = {};

        filteredCompanies.forEach(c => {
            const val = c.lastPurchaseValue || 0;
            totalRevenue += val;
            if (c.lastPurchaseDate && differenceInDays(new Date(), new Date(c.lastPurchaseDate)) <= 180) activeClients++;

            const state = c.state ? c.state.toUpperCase() : 'OUTROS';
            revenueByState[state] = (revenueByState[state] || 0) + val;

            const rep = c.representative || 'Não Atribuído';
            revenueByRep[rep] = (revenueByRep[rep] || 0) + val;
        });

        const sortedReps = Object.entries(revenueByRep).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
        const sortedStates = Object.entries(revenueByState).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const avgTicket = filteredCompanies.length > 0 ? totalRevenue / filteredCompanies.length : 0;

        return { totalRevenue, activeClients, avgTicket, sortedReps, sortedStates, count: filteredCompanies.length };
    }, [filteredCompanies]);

    const salesMetrics = useMemo(() => {
        let totalSales = 0;
        let totalFreight = 0;
        const salesByCarrier: Record<string, number> = {};
        const salesByPayment: Record<string, number> = {};
        const salesByRep: Record<string, { value: number, count: number }> = {}; // Simplified

        allPurchases.forEach(p => {
            totalSales += p.value;
            totalFreight += p.freight || 0;

            const carrier = p.carrier || 'N/A';
            salesByCarrier[carrier] = (salesByCarrier[carrier] || 0) + p.value;

            const payment = p.paymentTerm || 'N/A';
            salesByPayment[payment] = (salesByPayment[payment] || 0) + p.value;

            const rep = p.sellerName || 'N/A';
            if (!salesByRep[rep]) salesByRep[rep] = { value: 0, count: 0 };
            salesByRep[rep].value += p.value;
            salesByRep[rep].count += 1;
        });

        // Chart Data
        const byDate: Record<string, number> = {};
        allPurchases.forEach(p => {
            const key = p.date.substring(0, 7); // Monthly
            byDate[key] = (byDate[key] || 0) + p.value;
        });
        // Sort dates
        const sortedDates = Object.keys(byDate).sort();
        const trend = sortedDates.map(d => ({ key: d, label: format(parseISO(d + '-01'), 'MMM/yy'), value: byDate[d] }));

        return {
            totalSales,
            totalFreight,
            totalOrders: allPurchases.length,
            avgOrderValue: allPurchases.length > 0 ? totalSales / allPurchases.length : 0,
            trend,
            topCarriers: Object.entries(salesByCarrier).sort((a, b) => b[1] - a[1]).slice(0, 5),
            topReps: Object.entries(salesByRep).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.value - a.value).slice(0, 5),
        };
    }, [allPurchases]);

    const delinquencyMetrics = useMemo(() => {
        let totalDebt = 0;
        let debtorsCount = 0;
        const debtors: { name: string, value: number, count: number, daysLate: number }[] = [];

        companies.forEach(c => {
            if (c.delinquencyHistory) {
                const activeDebts = c.delinquencyHistory.filter(d => d.status === 'pending');
                if (activeDebts.length > 0) {
                    const debtVal = activeDebts.reduce((acc, curr) => acc + curr.value, 0);
                    totalDebt += debtVal;
                    debtorsCount++;

                    // Simple logical mapping for "days late" if not present
                    const oldest = activeDebts[0]; // simplistic
                    debtors.push({
                        name: c.fantasyName || c.name,
                        value: debtVal,
                        count: activeDebts.length,
                        daysLate: 30 // Mock or calculate if date available
                    });
                }
            }
        });

        return { totalDebt, debtorsCount, debtors: debtors.sort((a, b) => b.value - a.value) };
    }, [companies]);

    // Animation Variants
    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-[#0F1115] overflow-hidden text-slate-100">
            {/* Header */}
            <div className="px-8 py-6 bg-[#0F1115] border-b border-slate-800">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">
                                Dashboard
                            </h1>
                            <p className="text-slate-500 mt-1">Visão geral e performance</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-[#18181b] p-1 rounded-lg flex border border-slate-800">
                                {[
                                    { id: 'general', label: 'Visão Geral' },
                                    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
                                    { id: 'delinquency', label: 'Inadimplência', icon: AlertTriangle }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === tab.id
                                            ? 'bg-slate-800 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {tab.icon && <tab.icon size={14} />}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#18181b] px-3 py-2 rounded-lg border border-slate-800">
                        <Calendar size={16} className="text-orange-500" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-sm text-white focus:ring-0 outline-none p-0 w-32"
                        />
                        <span className="text-slate-600">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-sm text-white focus:ring-0 outline-none p-0 w-32"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-[#18181b] px-3 py-2 rounded-lg border border-slate-800">
                        <Filter size={16} className="text-orange-500" />
                        <select
                            value={selectedRep}
                            onChange={e => setSelectedRep(e.target.value)}
                            className="bg-transparent border-none text-sm text-white focus:ring-0 outline-none p-0 min-w-[150px]"
                        >
                            <option value="" className="bg-[#18181b]">Todos Vendedores</option>
                            {uniqueReps.map(r => <option key={r} value={r} className="bg-[#18181b]">{r}</option>)}
                        </select>
                    </div>

                    {(startDate || endDate || selectedRep) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); setSelectedRep(''); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                            <X size={12} /> Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        variants={container}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        {/* === GENERAL TAB === */}
                        {activeTab === 'general' && (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    <div className="lg:col-span-1">
                                        <WeatherWidget />
                                        <div className="mt-6">
                                            <HoroscopeWidget />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <StatsCard
                                            title="Receita Total (Vista)"
                                            value={formatCurrency(metrics.totalRevenue)}
                                            icon={<DollarSign size={24} />}
                                            color="blue"
                                            trend="12%"
                                            trendUp={true}
                                        />
                                        <StatsCard
                                            title="Clientes Ativos"
                                            value={metrics.activeClients}
                                            icon={<Users size={24} />}
                                            color="purple"
                                            description="Últimos 6 meses"
                                            delay={0.1}
                                        />
                                        <StatsCard
                                            title="Ticket Médio"
                                            value={formatCurrency(metrics.avgTicket)}
                                            icon={<TrendingUp size={24} />}
                                            color="green"
                                            trend="5%"
                                            trendUp={true}
                                            delay={0.2}
                                        />
                                    </div>
                                </div>

                                {/* Comparison Chart and Ranking */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <motion.div variants={item} className="lg:col-span-2 bg-[#18181b] rounded-xl border border-slate-800 p-6 min-h-[300px]">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <TrendingUp size={20} className="text-orange-500" />
                                                Evolução de Clientes (Base)
                                            </h3>
                                        </div>
                                        <div className="h-64 w-full flex items-end justify-center px-4">
                                            {/* Simple Placeholder for Chart Logic (Replace with Recharts or similar if available, using CSS bars for now) */}
                                            <div className="w-full h-full flex items-end gap-2">
                                                {[65, 78, 45, 89, 100, 75, 60, 90, 85, 70, 95, 80].map((h, i) => (
                                                    <div key={i} className="flex-1 bg-slate-800/50 rounded-t h-full relative group">
                                                        <div
                                                            className="absolute bottom-0 w-full bg-blue-600/80 rounded-t hover:bg-blue-500 transition-all relative"
                                                            style={{ height: `${h}%` }}
                                                        >
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-slate-700 shadow-xl">
                                                                {h}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Top Reps */}
                                    <motion.div variants={item} className="bg-[#18181b] rounded-xl border border-slate-800 p-6">
                                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                            <Award size={20} className="text-yellow-500" />
                                            Top Vendedores
                                        </h3>
                                        <div className="space-y-4">
                                            {metrics.sortedReps.map((rep, idx) => (
                                                <div key={rep.name} className="relative group">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-300 flex items-center gap-2">
                                                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-800 text-slate-500'}`}>
                                                                {idx + 1}
                                                            </span>
                                                            {rep.name}
                                                        </span>
                                                        <span className="font-bold text-white">{formatCurrency(rep.value)}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-blue-500 h-full rounded-full"
                                                            style={{ width: `${(rep.value / (metrics.sortedReps[0]?.value || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                            </>
                        )}

                        {/* === SALES TAB === */}
                        {activeTab === 'sales' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <StatsCard
                                        title="Vendas Totais"
                                        value={formatCurrency(salesMetrics.totalSales)}
                                        icon={<ShoppingBag size={24} />}
                                        color="blue"
                                    />
                                    <StatsCard
                                        title="Pedidos"
                                        value={salesMetrics.totalOrders}
                                        icon={<Filter size={24} />}
                                        color="purple"
                                    />
                                    <StatsCard
                                        title="Ticket Médio (Venda)"
                                        value={formatCurrency(salesMetrics.avgOrderValue)}
                                        icon={<TrendingUp size={24} />}
                                        color="green"
                                    />
                                    <StatsCard
                                        title="Frete Total"
                                        value={formatCurrency(salesMetrics.totalFreight)}
                                        icon={<Truck size={24} />}
                                        color="orange"
                                        description="Custo Logístico"
                                    />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <motion.div variants={item} className="lg:col-span-2 bg-[#18181b] rounded-xl border border-slate-800 p-6 min-h-[350px]">
                                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                            <TrendingUp size={20} className="text-orange-500" />
                                            Evolução de Vendas (Mensal)
                                        </h3>
                                        <div className="h-64 w-full flex items-end justify-between gap-1">
                                            {/* Sales Trend Chart */}
                                            {salesMetrics.trend.length > 0 ? (
                                                salesMetrics.trend.map((d, i) => {
                                                    const max = Math.max(...salesMetrics.trend.map(x => x.value));
                                                    const h = (d.value / max) * 100;
                                                    return (
                                                        <div key={i} className="flex-1 flex flex-col justify-end group h-full">
                                                            <div className="w-full bg-slate-800/30 rounded-t relative transition-all duration-300 group-hover:bg-slate-800/60" style={{ height: '100%' }}>
                                                                <motion.div
                                                                    initial={{ height: 0 }}
                                                                    animate={{ height: `${h}%` }}
                                                                    transition={{ duration: 0.8, delay: i * 0.05 }}
                                                                    className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t opacity-90 group-hover:opacity-100 relative"
                                                                >
                                                                    {/* Tooltip tracking bar height */}
                                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                                                                        {formatCurrency(d.value)}
                                                                        {/* Arrow */}
                                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-emerald-500/30 rotate-45"></div>
                                                                    </div>
                                                                </motion.div>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 text-center mt-2 truncate w-full">{d.label}</div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="w-full flex items-center justify-center text-slate-500">Sem dados de vendas</div>
                                            )}
                                        </div>
                                    </motion.div>

                                    <motion.div variants={item} className="bg-[#18181b] rounded-xl border border-slate-800 p-6">
                                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                            <Truck size={20} className="text-blue-500" />
                                            Top Transportadoras
                                        </h3>
                                        <div className="space-y-4">
                                            {salesMetrics.topCarriers.map(([name, value], idx) => (
                                                <div key={name} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                                        <div className="text-sm font-medium text-slate-300 truncate max-w-[120px]" title={name}>{name}</div>
                                                    </div>
                                                    <div className="text-sm font-bold text-white">{formatCurrency(value)}</div>
                                                </div>
                                            ))}
                                            {salesMetrics.topCarriers.length === 0 && <span className="text-slate-500 text-sm">Sem dados</span>}
                                        </div>
                                    </motion.div>
                                </div>
                            </>
                        )}

                        {/* === DELINQUENCY TAB === */}
                        {activeTab === 'delinquency' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <StatsCard
                                        title="Total em Atraso"
                                        value={formatCurrency(delinquencyMetrics.totalDebt)}
                                        icon={<AlertTriangle size={24} />}
                                        color="orange" // Red/Orange warning
                                        trend="Crítico"
                                        trendUp={false}
                                    />
                                    <StatsCard
                                        title="Clientes Devedores"
                                        value={delinquencyMetrics.debtorsCount}
                                        icon={<Users size={24} />}
                                        color="pink"
                                    />
                                </div>

                                <motion.div variants={item} className="bg-[#18181b] rounded-xl border border-slate-800 overflow-hidden">
                                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <AlertTriangle size={20} className="text-red-500" />
                                            Lista de Inadimplência
                                        </h3>
                                        <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                            Ver relatório completo <ArrowRight size={14} />
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                                                    <th className="p-4 font-semibold border-b border-slate-800">Cliente</th>
                                                    <th className="p-4 font-semibold border-b border-slate-800 text-right">Valor Devido</th>
                                                    <th className="p-4 font-semibold border-b border-slate-800 text-center">Títulos</th>
                                                    <th className="p-4 font-semibold border-b border-slate-800 text-center">Dias Atraso</th>
                                                    <th className="p-4 font-semibold border-b border-slate-800 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm divide-y divide-slate-800">
                                                {delinquencyMetrics.debtors.length > 0 ? (
                                                    delinquencyMetrics.debtors.map((d, i) => (
                                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                            <td className="p-4 font-medium text-white">{d.name}</td>
                                                            <td className="p-4 text-right text-red-400 font-bold">{formatCurrency(d.value)}</td>
                                                            <td className="p-4 text-center text-slate-400">{d.count}</td>
                                                            <td className="p-4 text-center">
                                                                <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded-full text-xs font-bold">
                                                                    {d.daysLate}+ dias
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <button className="text-slate-400 hover:text-white p-2 rounded hover:bg-slate-700">
                                                                    <Search size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                                            Nenhuma inadimplência registrada.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            </>
                        )}

                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DashboardView;