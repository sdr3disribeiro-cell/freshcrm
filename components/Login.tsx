import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle, FileSpreadsheet } from 'lucide-react';

const Login: React.FC = () => {
  const { signIn, loading } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-green-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png')] bg-no-repeat bg-center opacity-10 blur-xl"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 backdrop-blur-sm shadow-inner">
               <FileSpreadsheet size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">FreshCRM Sheets</h1>
            <p className="text-green-100 text-sm mt-1">Operação Interna via Google Sheets</p>
          </div>
        </div>

        <div className="p-8">
            <div className="mb-6 text-center text-slate-600 text-sm">
                <p>Este sistema utiliza sua conta Google para autenticação e o Google Sheets como banco de dados.</p>
            </div>

            <button 
              onClick={signIn}
              disabled={loading}
              className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-lg transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                  <Loader2 className="animate-spin text-green-600" size={24} />
              ) : (
                  <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-6 h-6" />
                    <span>Entrar com Google</span>
                  </>
              )}
            </button>
            
            <div className="mt-6 text-xs text-center text-slate-400">
                <p>Certifique-se de que seu e-mail está cadastrado na aba <span className="font-mono bg-slate-100 px-1 rounded">users</span> da planilha.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;