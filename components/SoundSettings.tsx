import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Upload, Music, Play, Trash2 } from 'lucide-react';
import { soundService } from '../services/soundService';

interface SoundSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const SoundSettings: React.FC<SoundSettingsProps> = ({ isOpen, onClose }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [hasCustomSound, setHasCustomSound] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Initial State Check
    useEffect(() => {
        if (isOpen) {
            setHasCustomSound(!!soundService.getCustomVictorySound());
            // We don't have a direct 'getMuted' but we can assume false or add getter
            // For now, let's just toggle based on user action.
        }
    }, [isOpen]);

    const handleToggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        soundService.setMuted(newState);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB Limit
            setUploadError("Arquivo muito grande. Máximo 2MB.");
            return;
        }

        soundService.saveCustomVictorySound(file)
            .then(() => {
                setHasCustomSound(true);
                setUploadError(null);
                soundService.playVictory();
            })
            .catch((err: any) => {
                setUploadError(err.message || "Erro ao salvar áudio.");
            });
    };

    const handleRemoveCustom = () => {
        soundService.clearCustomVictorySound();
        setHasCustomSound(false);
    };

    const handleTestSound = () => {
        soundService.playVictory();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Music className="text-pink-500" size={20} />
                        Configurar Áudio
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Volume / Mute */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isMuted ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-600'}`}>
                                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                            </div>
                            <div>
                                <p className="font-medium text-slate-700">Sons do Sistema</p>
                                <p className="text-xs text-slate-500">{isMuted ? 'Mudo' : 'Ativado'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleMute}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${isMuted
                                    ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {isMuted ? 'Ativar' : 'Silenciar'}
                        </button>
                    </div>

                    {/* Custom Victory Sound */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Som de Vitória (Venda)</h3>
                            {hasCustomSound && (
                                <button
                                    onClick={handleRemoveCustom}
                                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                >
                                    <Trash2 size={12} /> Remover
                                </button>
                            )}
                        </div>

                        {!hasCustomSound ? (
                            <label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    className="hidden" // Hidden input, controlled by label
                                    onChange={handleFileUpload}
                                />
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <Upload size={24} />
                                </div>
                                <p className="text-sm font-medium text-slate-700">Carregar arquivo de áudio</p>
                                <p className="text-xs text-slate-400 mt-1">MP3 ou WAV (Max 2MB)</p>
                            </label>
                        ) : (
                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center border border-pink-200 shadow-sm">
                                        <Music size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">Áudio Personalizado</p>
                                        <p className="text-xs text-green-600 font-medium">Ativo e pronto para uso</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleTestSound}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-slate-900/10 transition-transform active:scale-95"
                                >
                                    <Play size={16} fill="currentColor" /> Testar Agora
                                </button>
                            </div>
                        )}

                        {uploadError && (
                            <p className="text-red-500 text-xs mt-3 text-center bg-red-50 p-2 rounded-lg border border-red-100">{uploadError}</p>
                        )}
                    </div>

                </div>
            </div>

            {/* Click outside to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose}></div>
        </div>
    );
};

export default SoundSettings;
