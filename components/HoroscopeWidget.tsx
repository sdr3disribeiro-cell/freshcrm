import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getHoroscope, getSignNamePT } from '../services/horoscopeService';
import { motion } from 'framer-motion';
import { Sparkles, Moon, Sun, Star } from 'lucide-react';

const HoroscopeWidget: React.FC = () => {
    const { user } = useAuth();

    // Safety check - only show for logged users
    if (!user) return null;

    // Get Horoscope based on user name (first name usually)
    const horoscope = useMemo(() => {
        // Extract first name for matching (e.g. "Abner Silva" -> "Abner")
        const firstName = user.name.split(' ')[0];
        return getHoroscope(firstName);
    }, [user.name]);

    if (!horoscope) return null;

    const signName = getSignNamePT(horoscope.sign);

    const icon = useMemo(() => {
        switch (horoscope.sign) {
            case 'Capricorn': return <Moon size={24} className="text-purple-400" />;
            case 'Aquarius': return <Star size={24} className="text-cyan-400" />;
            case 'Gemini': return <Sun size={24} className="text-yellow-400" />;
            default: return <Sparkles size={24} className="text-orange-400" />;
        }
    }, [horoscope.sign]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#0f0f15] to-slate-900 border border-slate-800 p-6 shadow-xl"
        >
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -ml-10 -mb-10"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10 shadow-inner">
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-wide">Oráculo de Vendas</h3>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                                {signName} • {new Date().toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                    {/* Decorative Star */}
                    <motion.div
                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="opacity-20"
                    >
                        <Sparkles size={40} className="text-white" />
                    </motion.div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                    <p className="text-slate-200 italic leading-relaxed text-sm">
                        "{horoscope.tip}"
                    </p>
                </div>

                <div className="mt-3 text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold opacity-60">
                    Energia do Dia
                </div>
            </div>
        </motion.div>
    );
};

export default HoroscopeWidget;
