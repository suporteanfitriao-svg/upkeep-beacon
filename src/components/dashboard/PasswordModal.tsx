interface PasswordModalProps {
  propertyName: string;
  password: string;
  onClose: () => void;
}

export function PasswordModal({ propertyName, password, onClose }: PasswordModalProps) {
  return (
    <div 
      aria-modal="true" 
      role="dialog"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-xs transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-[#2d3138] dark:border dark:border-slate-700">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        
        {/* Content */}
        <div className="flex flex-col items-center text-center mt-2">
          {/* Icon */}
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 shadow-sm">
            <span className="material-symbols-outlined text-3xl text-primary">vpn_key</span>
          </div>
          
          {/* Title */}
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Senha de Acesso</h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 max-w-[200px]">
            Utilize o código abaixo para destravar a porta principal
          </p>
          
          {/* Password Display */}
          <div className="mt-6 mb-4 flex w-full flex-col items-center justify-center rounded-xl bg-slate-50 border border-slate-200 py-5 dark:bg-slate-800/80 dark:border-slate-600">
            <span className="font-display text-4xl font-extrabold tracking-widest text-slate-900 dark:text-white">
              {password || '----'}
            </span>
          </div>
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="mt-2 w-full rounded-lg bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
}
