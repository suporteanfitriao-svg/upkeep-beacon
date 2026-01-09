interface AttentionModalProps {
  onClose: () => void;
}

export function AttentionModal({ onClose }: AttentionModalProps) {
  return (
    <div 
      aria-modal="true" 
      role="dialog"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-xs overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] p-6 text-center shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20">
          <span className="material-symbols-outlined text-2xl text-orange-600 dark:text-orange-400">priority_high</span>
        </div>
        
        {/* Title */}
        <h3 className="mb-2 text-lg font-bold leading-6 text-slate-900 dark:text-white">Atenção</h3>
        
        {/* Message */}
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Você precisa confirmar a leitura das <strong className="text-slate-700 dark:text-slate-200">Informações Importantes</strong> antes de iniciar a limpeza.
        </p>
        
        {/* Button */}
        <button 
          onClick={onClose}
          className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-transform active:scale-95 dark:bg-white dark:text-slate-900"
        >
          Ok, entendi
        </button>
      </div>
    </div>
  );
}
