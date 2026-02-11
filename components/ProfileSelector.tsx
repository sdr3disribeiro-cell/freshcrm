import React, { useState } from 'react';
import { User } from '../types';
import { UserCircle2, Plus, LogOut, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundService } from '../services/soundService';

interface ProfileSelectorProps {
    profiles: User[];
    onSelectProfile: (user: User) => void;
    onLogout: () => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ profiles, onSelectProfile, onLogout }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleSelect = (user: User) => {
        if (selectedId) return; // Prevent double selection

        // 1. Play Sound (Suction + Boom)
        soundService.playSelectProfile();

        // 2. Start Animation
        setSelectedId(user.email);

        // 3. Delays
        setTimeout(() => {
            soundService.playWelcome();
        }, 1200);

        setTimeout(() => {
            onSelectProfile(user);
        }, 3000); // Wait for entire sequence
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 animate-fade-in relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]"></div>

            <AnimatePresence>
                {!selectedId && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Quem está acessando?</h1>
                        <p className="text-slate-400 text-lg">Escolha seu perfil para continuar</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-wrap justify-center gap-6 md:gap-8 max-w-4xl relative min-h-[200px] w-full items-center">
                {profiles.map((profile) => {
                    const isSelected = selectedId === profile.email;
                    const isOther = selectedId && !isSelected;

                    return (
                        <motion.button
                            key={profile.email || profile.name}
                            onClick={() => handleSelect(profile)}
                            disabled={!!selectedId}
                            layout
                            animate={
                                isSelected
                                    ? {
                                        scale: 1.5,
                                        zIndex: 50,
                                        y: -50, // Move up slightly to center better
                                    }
                                    : isOther
                                        ? {
                                            scale: 0.8,
                                            opacity: 0,
                                            filter: 'blur(10px)',
                                        }
                                        : {
                                            scale: 1,
                                            opacity: 1,
                                        }
                            }
                            transition={{
                                duration: 0.8,
                                ease: [0.16, 1, 0.3, 1], // Custom ease for "snap" feel
                            }}
                            className="group flex flex-col items-center gap-4 w-32 md:w-40 focus:outline-none relative"
                        >
                            {/* Glow Effect for Selected */}
                            {isSelected && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1.5 }}
                                    transition={{ duration: 1, delay: 0.2 }}
                                    className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl -z-10"
                                />
                            )}

                            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-slate-800/50 backdrop-blur-md border border-slate-700/50 overflow-hidden relative transition-shadow duration-300 ${!selectedId && 'group-hover:border-blue-500/50 group-hover:shadow-blue-500/20'}`}>
                                {profile.avatar ? (
                                    <img
                                        src={profile.avatar}
                                        alt={profile.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-3xl md:text-4xl select-none">
                                        {profile.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {!selectedId && (
                                <span className="text-slate-400 group-hover:text-white text-lg font-medium transition-colors text-center truncate w-full">
                                    {profile.name}
                                </span>
                            )}

                            {/* Welcome Message */}
                            {isSelected && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1, duration: 0.8 }}
                                    className="absolute -bottom-20 w-[300px] text-center"
                                >
                                    <h2 className="text-2xl text-white font-light tracking-wider">
                                        Bem vindo, <span className="font-semibold">Chimia!</span>
                                    </h2>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "50%" }}
                                        transition={{ delay: 1.5, duration: 1 }}
                                        className="h-0.5 bg-blue-500 mx-auto mt-2 rounded-full"
                                    />
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}

                {/* Hide "Add" button when selecting */}
                <AnimatePresence>
                    {!selectedId && (
                        <motion.button
                            initial={{ opacity: 0.5, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            disabled
                            className="group flex flex-col items-center gap-4 w-32 md:w-40 opacity-50 cursor-not-allowed"
                        >
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-slate-700 flex items-center justify-center text-slate-500 bg-transparent">
                                <Plus size={40} />
                            </div>
                            <span className="text-slate-500 text-lg font-medium">Adicionar</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {!selectedId && (
                    <motion.div
                        exit={{ opacity: 0, y: 20 }}
                        className="mt-16"
                    >
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500 px-6 py-2 rounded-full transition-all uppercase tracking-widest text-xs font-bold"
                        >
                            <LogOut size={14} />
                            Sair da Conta Google
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfileSelector;
