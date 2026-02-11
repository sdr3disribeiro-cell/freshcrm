import React from 'react';
import { motion } from 'framer-motion';
import TiltCard from './UI/TiltCard';
import AnimatedCounter from './UI/AnimatedCounter';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
    trend?: string;
    trendUp?: boolean;
    description?: string;
    delay?: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend, trendUp, description, delay = 0 }) => {

    const colorStyles = {
        blue: { header: 'bg-blue-600', text: 'text-blue-400', bg: 'from-blue-500/10 to-transparent' },
        green: { header: 'bg-emerald-500', text: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent' },
        purple: { header: 'bg-violet-600', text: 'text-violet-400', bg: 'from-violet-500/10 to-transparent' },
        orange: { header: 'bg-orange-500', text: 'text-orange-400', bg: 'from-orange-500/10 to-transparent' },
        pink: { header: 'bg-pink-500', text: 'text-pink-400', bg: 'from-pink-500/10 to-transparent' },
    };

    const style = colorStyles[color];

    // Parser for AnimatedCounter
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9,-]+/g, "").replace(',', '.')) : value;
    const isCurrency = typeof value === 'string' && (value.includes('R$') || value.includes(','));
    const isValidNumber = !isNaN(numericValue as number);

    const formatValue = (v: number) => {
        if (isCurrency) return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return v.toLocaleString('pt-BR');
    };

    return (
        <TiltCard className="h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay }}
                className="relative overflow-hidden bg-[#18181b] rounded-xl border border-slate-800 shadow-xl group h-full"
            >
                {/* Top Colored Bar */}
                <div className={`h-1.5 w-full ${style.header}`} />

                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-lg bg-white/5 ${style.text}`}>
                            {icon}
                        </div>
                        {trend && (
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {trendUp ? '↑' : '↓'} {trend}
                            </div>
                        )}
                    </div>

                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>

                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            {isValidNumber ? (
                                <AnimatedCounter value={numericValue as number} formatter={formatValue} />
                            ) : value}
                        </h2>
                    </div>

                    {description && (
                        <p className="text-slate-500 text-xs mt-2">{description}</p>
                    )}
                </div>

                {/* Background Gradient Effect */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${style.bg} blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity`} />
            </motion.div>
        </TiltCard>
    );
};

export default StatsCard;
