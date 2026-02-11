import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Ghost, Glasses, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const { signIn, bypassAuth, loading } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Luxurious Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black z-0"></div>

      {/* Optical/Light Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[150px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-amber-600/5 rounded-full blur-[150px] animate-pulse-slow delay-1000"></div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-6"
      >
        {/* Glassmorphism Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 relative overflow-hidden group">

          {/* Shine Effect on Hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent z-0"></div>

          <div className="relative z-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
              className="w-20 h-20 bg-gradient-to-br from-amber-200 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-amber-500/20 rotate-3"
            >
              <Glasses size={40} className="text-slate-900" strokeWidth={2.5} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h1 className="text-4xl font-serif text-white tracking-wide mb-2">VistaCRM</h1>
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-3"></div>
              <p className="text-slate-400 font-light text-sm tracking-widest uppercase">Premium Optical Management</p>
            </motion.div>

            <div className="mt-12 space-y-4">
              <p className="text-slate-400 text-xs px-4 leading-relaxed">
                Acesse sua área exclusiva para gerenciar clientes e roteiros com a precisão que sua ótica merece.
              </p>

              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={signIn}
                disabled={loading}
                className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-white/5 transition-all flex items-center justify-center gap-3 relative overflow-hidden"
              >
                {loading ? (
                  <Loader2 className="animate-spin text-slate-900" size={20} />
                ) : (
                  <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
                    <span className="tracking-wide">ACESSAR SISTEMA</span>
                  </>
                )}
              </motion.button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-amber-500/60 font-medium">
                <Sparkles size={10} />
                <span>Excellence in Vision</span>
                <Sparkles size={10} />
              </div>

              <button
                onClick={() => {
                  if (confirm("ATENÇÃO: Modo Offline/Dev.\n\nDeseja continuar?")) {
                    bypassAuth();
                  }
                }}
                className="mt-4 text-slate-600 hover:text-slate-400 text-[10px] flex items-center gap-1 transition-colors uppercase tracking-wider"
              >
                <Ghost size={10} />
                Offline Mode
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-600 text-[10px]">v1.2.0 • VistaCRM Luxury Edition</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;