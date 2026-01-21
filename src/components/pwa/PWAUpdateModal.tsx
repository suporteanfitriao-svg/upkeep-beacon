import { memo, useEffect, useState } from 'react';
import { RefreshCw, Download, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// App version - increment this with each release
export const APP_VERSION = '1.0.1';

interface PWAUpdateModalProps {
  isOpen: boolean;
  onUpdate: () => void;
  isUpdating?: boolean;
}

export const PWAUpdateModal = memo(function PWAUpdateModal({
  isOpen,
  onUpdate,
  isUpdating = false,
}: PWAUpdateModalProps) {
  const [countdown, setCountdown] = useState(5);

  // Auto-update countdown
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onUpdate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onUpdate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-[#2d3138] rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header with icon */}
        <div className="relative bg-gradient-to-br from-primary to-[#267373] p-6 text-center">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 left-4 w-2 h-2 bg-white rounded-full animate-pulse" />
            <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-100" />
            <div className="absolute bottom-4 left-8 w-1 h-1 bg-white rounded-full animate-pulse delay-200" />
          </div>
          <div className="relative mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Atualização Disponível</h2>
          <p className="text-sm text-white/80 mt-1">v{APP_VERSION}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-center text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            Uma nova versão do app está disponível com melhorias e correções.
          </p>

          {/* Update button */}
          <button
            onClick={onUpdate}
            disabled={isUpdating}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-white transition-all",
              isUpdating
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-primary hover:bg-[#267373] active:scale-[0.98] shadow-lg shadow-primary/30"
            )}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Atualizando...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Atualizar Agora</span>
              </>
            )}
          </button>

          {/* Auto-update countdown */}
          {!isUpdating && countdown > 0 && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
              Atualizando automaticamente em{' '}
              <span className="font-bold text-primary">{countdown}s</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
