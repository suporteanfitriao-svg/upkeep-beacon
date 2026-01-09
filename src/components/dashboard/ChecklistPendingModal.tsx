interface PendingCategory {
  name: string;
  pendingCount: number;
  totalCount: number;
}

interface ChecklistPendingModalProps {
  pendingCategories: PendingCategory[];
  onClose: () => void;
}

export function ChecklistPendingModal({ pendingCategories, onClose }: ChecklistPendingModalProps) {
  const totalPending = pendingCategories.reduce((acc, cat) => acc + cat.pendingCount, 0);

  return (
    <div 
      aria-modal="true" 
      role="dialog"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-xs overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] p-6 shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20">
          <span className="material-symbols-outlined text-2xl text-orange-600 dark:text-orange-400">checklist</span>
        </div>
        
        {/* Title */}
        <h3 className="mb-2 text-center text-lg font-bold leading-6 text-slate-900 dark:text-white">Checklist Incompleto</h3>
        
        {/* Message */}
        <p className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Você possui <strong className="text-orange-600 dark:text-orange-400">{totalPending} {totalPending === 1 ? 'item pendente' : 'itens pendentes'}</strong> nas seções abaixo:
        </p>

        {/* Pending Categories List */}
        <div className="mb-6 flex flex-col gap-2">
          {pendingCategories.map((category) => (
            <div 
              key={category.name}
              className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500 text-[18px]">warning</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{category.name}</span>
              </div>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                {category.pendingCount}/{category.totalCount}
              </span>
            </div>
          ))}
        </div>
        
        {/* Button */}
        <button 
          onClick={onClose}
          className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-transform active:scale-95 dark:bg-white dark:text-slate-900"
        >
          Voltar ao Checklist
        </button>
      </div>
    </div>
  );
}
