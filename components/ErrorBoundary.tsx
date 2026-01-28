import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    window.location.reload();
  };

  handleHardReset = () => {
    if (window.confirm("Isso limpará todos os dados locais e recarregará a página. Use apenas se o erro persistir. Continuar?")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Ocorreu um erro inesperado na renderização da aplicação. Geralmente isso é causado por dados inconsistentes.
            </p>
            
            <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-left text-xs font-mono text-red-500 mb-6 overflow-auto max-h-32">
                {this.state.error?.message}
            </div>

            <div className="flex flex-col gap-3">
                <button
                onClick={this.handleReset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                <RefreshCw size={18} />
                Tentar Novamente
                </button>
                
                <button
                onClick={this.handleHardReset}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                <Trash2 size={18} />
                Limpar Cache e Recarregar
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;