import React, { useMemo, useState } from 'react';
import { Company, Purchase } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { TrendingUp, Users, DollarSign, Map, Award, Filter, X, Calendar, ShoppingBag, Truck, CreditCard, AlertTriangle, FileWarning, ArrowRight } from 'lucide-react';
import { differenceInDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

interface DashboardViewProps {
    companies: Company[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ companies }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'sales' | 'delinquency'>('general');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // --- Filtering ---
    const filteredCompanies = useMemo(() => {
        if (!startDate && !endDate) return companies;

        return companies.filter(c => {
            if (!c.lastPurchaseDate) return false;

            // Ensure accurate comparison by setting time boundaries
            const purchaseDate = new Date(c.lastPurchaseDate);

            if (startDate) {
                const start = startOfDay(new Date(startDate + 'T00:00:00'));
                if (isBefore(purchaseDate, start)) return false;
            }

            if (endDate) {
                const end = endOfDay(new Date(endDate + 'T23:59:59'));
                if (isAfter(purchaseDate, end)) return false;
            }

            return true;
        });
    }, [companies, startDate, endDate]);

    const allPurchases = useMemo(() => {
        let purchases: Purchase[] = [];
        companies.forEach(c => {
            if (c.purchases && c.purchases.length > 0) {
                purchases = [...purchases, ...c.purchases];
            }
        });

        // Filter Purchases by Date Range
        if (startDate || endDate) {
            purchases = purchases.filter(p => {
                const pDate = new Date(p.date);
                if (startDate) {
                    const start = startOfDay(new Date(startDate + 'T00:00:00'));
                    if (isBefore(pDate, start)) return false;
                }
                if (endDate) {
                    const end = endOfDay(new Date(endDate + 'T23:59:59'));
                    if (isAfter(pDate, end)) return false;
                }
                return true;
            });
        }

        return purchases;
    }, [companies, startDate, endDate]);

    // --- Calculations ---

    const metrics = useMemo(() => {
        let totalRevenue = 0;
        let activeClients = 0;
        const revenueByState: Record<string, number> = {};
        const revenueByRep: Record<string, number> = {};
        const revenueByMonth: Record<string, number> = {}; // Format YYYY-MM

        filteredCompanies.forEach(c => {
            const val = c.lastPurchaseValue || 0;
            totalRevenue += val;

            if (c.lastPurchaseDate) {
                const days = differenceInDays(new Date(), new Date(c.lastPurchaseDate));
                if (days <= 180) activeClients++;

                const monthKey = c.lastPurchaseDate.substring(0, 7); // YYYY-MM
                revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + val;
            }

            const state = c.state ? c.state.toUpperCase() : 'OUTROS';
            revenueByState[state] = (revenueByState[state] || 0) + val;

            const rep = c.representative || 'Não Atribuído';
            revenueByRep[rep] = (revenueByRep[rep] || 0) + val;
        });

        // Sort Reps
        const sortedReps = Object.entries(revenueByRep)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Sort States
        const sortedStates = Object.entries(revenueByState)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Sort Months
        const sortedMonths = Object.entries(revenueByMonth)
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => a.key.localeCompare(b.key));

        const avgTicket = filteredCompanies.length > 0 ? totalRevenue / filteredCompanies.length : 0;

        return {
            totalRevenue,
            activeClients,
            avgTicket,
            sortedReps,
            sortedStates,
            sortedMonths,
            count: filteredCompanies.length
        };
    }, [filteredCompanies]);

    // Sales Intelligence Metrics (from Purchase History)
    const salesMetrics = useMemo(() => {
        let totalSales = 0;
        let totalFreight = 0;
        const salesByCarrier: Record<string, number> = {};
        const salesByPayment: Record<string, number> = {};
        const salesByRep: Record<string, number> = {};
        const salesByMonth: Record<string, number> = {};

        allPurchases.forEach(p => {
            totalSales += p.value;
            totalFreight += p.freight || 0;

            const carrier = p.carrier || 'Retira / Não Inf.';
            salesByCarrier[carrier] = (salesByCarrier[carrier] || 0) + p.value;

            const payment = p.paymentTerm || 'Não Inf.';
            salesByPayment[payment] = (salesByPayment[payment] || 0) + p.value;

            const rep = p.sellerName || 'Direto';
            salesByRep[rep] = (salesByRep[rep] || 0) + p.value;

            const monthKey = p.date.substring(0, 7);
            salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + p.value;
        });

        return {
            totalSales,
            totalFreight,
            totalOrders: allPurchases.length,
            avgOrderValue: allPurchases.length > 0 ? totalSales / allPurchases.length : 0,
            topCarriers: Object.entries(salesByCarrier).sort((a, b) => b[1] - a[1]).slice(0, 5),
            topPayments: Object.entries(salesByPayment).sort((a, b) => b[1] - a[1]).slice(0, 5),
            topReps: Object.entries(salesByRep).sort((a, b) => b[1] - a[1]).slice(0, 10),
            trend: Object.entries(salesByMonth).map(([key, value]) => ({ key, value })).sort((a, b) => a.key.localeCompare(b.key))
        };
    }, [allPurchases]);

    // Delinquency Metrics
    const delinquencyMetrics = useMemo(() => {
        let totalDebt = 0;
        let debtorsCount = 0;
        const debtByState: Record<string, number> = {};
        const topDebtors: { name: string, value: number, count: number }[] = [];

        companies.forEach(c => {
            const debts = c.delinquencyHistory || [];
            if (debts.length > 0) {
                const activeDebts = debts.filter(d => d.status === 'pending');
                if (activeDebts.length > 0) {
                    const companyDebt = activeDebts.reduce((acc, d) => acc + d.value, 0);
                    totalDebt += companyDebt;
                    debtorsCount++;

                    const state = c.state ? c.state.toUpperCase() : 'OUTROS';
                    debtByState[state] = (debtByState[state] || 0) + companyDebt;

                    topDebtors.push({ name: c.fantasyName || c.name, value: companyDebt, count: activeDebts.length });
                }
            }
        });

        return {
            totalDebt,
            debtorsCount,
            avgDebt: debtorsCount > 0 ? totalDebt / debtorsCount : 0,
            debtByState: Object.entries(debtByState).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            topDebtors: topDebtors.sort((a, b) => b.value - a.value).slice(0, 10)
        };
    }, [companies]);

    // Max value helper for charts
    const maxRepValue = Math.max(...metrics.sortedReps.map(r => r.value), 1);
    const maxStateValue = Math.max(...metrics.sortedStates.map(s => s.value), 1);
    const maxCarrierValue = Math.max(...salesMetrics.topCarriers.map(c => c[1]), 1);
    const maxDebtStateValue = Math.max(...delinquencyMetrics.debtByState.map(s => s.value), 1);

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden">
            <div className="px-8 py-6 bg-white border-b border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Dashboard de Vendas</h1>
                        <p className="text-slate-500 mt-1">Visão geral e inteligência comercial</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* View Toggle */}
                        <div className="bg-slate-100 p-1 rounded-lg flex">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'general' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Visão Geral
                            </button>
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'sales' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ShoppingBag size={14} />
                                Sales Intelligence
                            </button>
                            <button
                                onClick={() => setActiveTab('delinquency')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'delinquency' ? 'bg-red-50 shadow-sm text-red-600 border border-red-100' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <AlertTriangle size={14} />
                                Inadimplência
                            </button>
                        </div>

                        {/* Date Filter Controls */}
                        {activeTab !== 'delinquency' && (
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                                    <Filter size={16} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filtros</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative group">
                                        <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="pl-8 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded hover:border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none w-36 text-slate-600"
                                        />
                                    </div>
                                    <span className="text-slate-400 text-sm">até</span>
                                    <div className="relative group">
                                        <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="pl-8 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded hover:border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none w-36 text-slate-600"
                                        />
                                    </div>
                                </div>

                                {(startDate || endDate) && (
                                    <button
                                        onClick={clearFilters}
                                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors ml-1"
                                        title="Limpar filtros"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8">

                {/* === GENERAL TAB === */}
                {activeTab === 'general' && (
                    <>
                        {metrics.count === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                                <Filter size={48} className="mb-4 opacity-20" />
                                <p>Nenhum dado encontrado para o período selecionado.</p>
                                <button onClick={clearFilters} className="mt-2 text-blue-600 hover:underline text-sm">Limpar filtros</button>
                            </div>
                        ) : (
                            <>
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                                <DollarSign size={20} />
                                            </div>
                                            <span className="text-sm font-medium">Receita (Snapshot)</span>
                                        </div>
                                        <span className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.totalRevenue)}</span>
                                        <span className="text-xs text-slate-400 mt-1">Baseado na última compra</span>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                <Users size={20} />
                                            </div>
                                            <span className="text-sm font-medium">Clientes Filtrados</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-slate-800">{metrics.count}</span>
                                            <span className="text-xs text-slate-400">registros</span>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                                <TrendingUp size={20} />
                                            </div>
                                            <span className="text-sm font-medium">Ticket Médio</span>
                                        </div>
                                        <span className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.avgTicket)}</span>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estado Principal</span>
                                        <span className="text-2xl font-bold text-slate-800">{metrics.sortedStates[0]?.name || '-'}</span>
                                        <span className="text-xs text-green-600 font-medium">
                                            {metrics.sortedStates[0] ? formatCurrency(metrics.sortedStates[0].value) : ''}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                    {/* Sales by Representative Chart */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Award size={18} className="text-yellow-500" />
                                                Top Representantes
                                            </h3>
                                        </div>
                                        <div className="space-y-4">
                                            {metrics.sortedReps.map((rep, idx) => {
                                                const percent = (rep.value / maxRepValue) * 100;
                                                return (
                                                    <div key={rep.name} className="relative">
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="font-medium text-slate-700 flex items-center gap-2">
                                                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                                                                    {idx + 1}
                                                                </span>
                                                                {rep.name}
                                                            </span>
                                                            <span className="font-bold text-slate-800">{formatCurrency(rep.value)}</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                            <div
                                                                className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000"
                                                                style={{ width: `${percent}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {metrics.sortedReps.length === 0 && (
                                                <div className="text-center py-10 text-slate-400 text-sm">Sem dados de representantes.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sales by State Chart */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Map size={18} className="text-slate-500" />
                                                Vendas por Estado (UF)
                                            </h3>
                                        </div>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {metrics.sortedStates.map((uf) => {
                                                const percent = (uf.value / maxStateValue) * 100;
                                                return (
                                                    <div key={uf.name} className="flex items-center gap-4">
                                                        <div className="w-8 font-bold text-slate-500 text-sm">{uf.name}</div>
                                                        <div className="flex-1">
                                                            <div className="h-8 bg-slate-50 rounded-md relative overflow-hidden flex items-center px-2">
                                                                <div
                                                                    className="absolute top-0 left-0 bottom-0 bg-indigo-50 border-r-2 border-indigo-200"
                                                                    style={{ width: `${percent}%` }}
                                                                ></div>
                                                                <span className="relative z-10 text-xs font-medium text-slate-700">
                                                                    {formatCurrency(uf.value)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {metrics.sortedStates.length === 0 && (
                                                <div className="text-center py-10 text-slate-400 text-sm">Sem dados de localização.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* === SALES INTELLIGENCE TAB === */}
                {activeTab === 'sales' && (
                    <>
                        {allPurchases.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                                <ShoppingBag size={48} className="mb-4 opacity-20" />
                                <p>Nenhum histórico de vendas encontrado.</p>
                                <p className="text-sm mt-1">Importe uma base de dados de "Pedidos/Vendas" para visualizar insights.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-purple-500">
                                        <div className="text-sm font-medium text-slate-500 mb-1">Total Vendido (Histórico)</div>
                                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(salesMetrics.totalSales)}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                                        <div className="text-sm font-medium text-slate-500 mb-1">Pedidos Processados</div>
                                        <div className="text-2xl font-bold text-slate-800">{salesMetrics.totalOrders}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500">
                                        <div className="text-sm font-medium text-slate-500 mb-1">Custo de Frete Total</div>
                                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(salesMetrics.totalFreight)}</div>
                                        <div className="text-xs text-slate-400 mt-1">{(salesMetrics.totalFreight / salesMetrics.totalSales * 100).toFixed(1)}% da receita</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-green-500">
                                        <div className="text-sm font-medium text-slate-500 mb-1">Ticket Médio (Pedido)</div>
                                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(salesMetrics.avgOrderValue)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                    {/* Evolution Chart */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <TrendingUp size={18} className="text-purple-600" />
                                            Evolução de Vendas (Mensal)
                                        </h3>
                                        <div className="flex items-end gap-2 h-56 pt-4 border-b border-slate-200">
                                            {salesMetrics.trend.map((m) => {
                                                const maxMonth = Math.max(...salesMetrics.trend.map(i => i.value));
                                                const heightPercent = maxMonth > 0 ? (m.value / maxMonth) * 100 : 0;
                                                const [year, month] = m.key.split('-');

                                                return (
                                                    <div key={m.key} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                                                        <div className="w-full relative flex-1 flex items-end justify-center">
                                                            <div
                                                                className="w-full max-w-[30px] bg-purple-500 rounded-t-sm hover:bg-purple-600 transition-all relative group-hover:shadow-lg"
                                                                style={{ height: `${heightPercent}%` }}
                                                            >
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">
                                                                    {formatCurrency(m.value)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium">{month}/{year.slice(2)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Top Carriers */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <Truck size={18} className="text-orange-500" />
                                            Top Transportadoras
                                        </h3>
                                        <div className="space-y-4">
                                            {salesMetrics.topCarriers.map(([name, value], idx) => {
                                                const percent = (value / maxCarrierValue) * 100;
                                                return (
                                                    <div key={name} className="relative">
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="font-medium text-slate-700 flex items-center gap-2">
                                                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                                                                    {idx + 1}
                                                                </span>
                                                                {name}
                                                            </span>
                                                            <span className="font-bold text-slate-800">{formatCurrency(value)}</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-orange-500 h-2 rounded-full"
                                                                style={{ width: `${percent}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Payment Terms */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <CreditCard size={18} className="text-green-600" />
                                            Condições de Pagamento
                                        </h3>
                                        <div className="space-y-3">
                                            {salesMetrics.topPayments.map(([name, value]) => (
                                                <div key={name} className="flex items-center justify-between border-b border-slate-50 pb-2">
                                                    <span className="text-sm text-slate-600">{name}</span>
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold text-slate-800 text-sm">{formatCurrency(value)}</span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {((value / salesMetrics.totalSales) * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* === DELINQUENCY TAB === */}
                {activeTab === 'delinquency' && (
                    <>
                        {delinquencyMetrics.totalDebt === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                                <AlertTriangle size={48} className="mb-4 opacity-20" />
                                <p>Nenhuma inadimplência registrada.</p>
                                <p className="text-sm mt-1">Importe uma base de dados de "Inadimplência" para visualizar esta área.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-red-500">
                                        <div className="text-sm font-medium text-slate-500 mb-1">Total em Aberto</div>
                                        <div className="text-2xl font-bold text-red-600">{formatCurrency(delinquencyMetrics.totalDebt)}</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500">
                                        <div className="text-sm font-medium text-slate-500 mb-1">Clientes Inadimplentes</div>
                                        <div className="text-2xl font-bold text-slate-800">{delinquencyMetrics.debtorsCount}</div>
                                        <div className="text-xs text-slate-400 mt-1">{(delinquencyMetrics.debtorsCount / companies.length * 100).toFixed(1)}% da base</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-yellow-500">
                                        <div className="text-sm font-medium text-slate-500 mb-1">Ticket Médio da Dívida</div>
                                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(delinquencyMetrics.avgDebt)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Top Debtors List */}
                                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <FileWarning size={18} className="text-red-500" />
                                                Maiores Devedores
                                            </h3>
                                        </div>
                                        <div className="flex-1 overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs">
                                                    <tr>
                                                        <th className="px-6 py-3">Cliente</th>
                                                        <th className="px-6 py-3 text-center">Títulos</th>
                                                        <th className="px-6 py-3 text-right">Valor Total</th>
                                                        <th className="px-6 py-3"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {delinquencyMetrics.topDebtors.map((debtor) => (
                                                        <tr key={debtor.name} className="hover:bg-red-50/30 transition-colors">
                                                            <td className="px-6 py-4 font-medium text-slate-700">{debtor.name}</td>
                                                            <td className="px-6 py-4 text-center text-slate-500">{debtor.count}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(debtor.value)}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button className="text-blue-600 hover:text-blue-800">
                                                                    <ArrowRight size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Debt by State */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <Map size={18} className="text-slate-500" />
                                            Dívida por Região (UF)
                                        </h3>
                                        <div className="space-y-3">
                                            {delinquencyMetrics.debtByState.map((uf) => {
                                                const percent = (uf.value / maxDebtStateValue) * 100;
                                                return (
                                                    <div key={uf.name} className="flex items-center gap-4">
                                                        <div className="w-8 font-bold text-slate-500 text-sm">{uf.name}</div>
                                                        <div className="flex-1">
                                                            <div className="h-8 bg-slate-50 rounded-md relative overflow-hidden flex items-center px-2">
                                                                <div
                                                                    className="absolute top-0 left-0 bottom-0 bg-red-100 border-r-2 border-red-300"
                                                                    style={{ width: `${percent}%` }}
                                                                ></div>
                                                                <span className="relative z-10 text-xs font-medium text-slate-700">
                                                                    {formatCurrency(uf.value)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default DashboardView;