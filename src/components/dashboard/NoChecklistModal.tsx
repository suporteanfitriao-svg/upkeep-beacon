interface NoChecklistModalProps {
  propertyName: string;
  onClose: () => void;
}

export function NoChecklistModal({ propertyName, onClose }: NoChecklistModalProps) {
  return (
    <div 
      aria-modal="true" 
      role="dialog"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] p-6 text-center shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
          <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">
            checklist_rtl
          </span>
        </div>
        
        {/* Title */}
        <h3 className="mb-2 text-lg font-bold leading-6 text-slate-900 dark:text-white">
          Checklist Não Configurado
        </h3>
        
        {/* Message */}
        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
          A propriedade <strong className="text-slate-700 dark:text-slate-200">{propertyName}</strong> não possui um checklist configurado.
        </p>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Entre em contato com o administrador para configurar o checklist antes de iniciar a limpeza.
        </p>
        
        {/* Contact Info */}
        <div className="mb-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-sm align-middle mr-1">support_agent</span>
            Solicite a configuração do checklist ao gestor responsável
          </p>
        </div>
        
        {/* Button */}
        <button 
          onClick={onClose}
          className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-transform active:scale-95 dark:bg-white dark:text-slate-900"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
