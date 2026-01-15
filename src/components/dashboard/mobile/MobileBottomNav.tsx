import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: 'inicio' | 'agenda' | 'msgs' | 'menu';
  onTabChange: (tab: 'inicio' | 'agenda' | 'msgs' | 'menu') => void;
}

export const MobileBottomNav = memo(function MobileBottomNav({ 
  activeTab, 
  onTabChange 
}: MobileBottomNavProps) {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] safe-area-inset-bottom">
      <div className="absolute inset-0 bg-stone-50/95 dark:bg-[#22252a]/95 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-700/50" />
      <div className="relative flex h-20 items-center justify-around px-2 pb-2">
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('inicio');
          }}
          className={cn(
            "group flex flex-col items-center justify-center gap-1 p-3 min-w-[60px] transition-colors touch-manipulation",
            activeTab === 'inicio' ? "text-primary" : "text-[#8A8B88] hover:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[28px] transition-transform group-active:scale-90",
            activeTab === 'inicio' && "filled"
          )}>home</span>
          <span className={cn("text-[10px]", activeTab === 'inicio' ? "font-bold" : "font-medium")}>Início</span>
        </button>
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('agenda');
          }}
          className={cn(
            "group flex flex-col items-center justify-center gap-1 p-3 min-w-[60px] transition-colors touch-manipulation",
            activeTab === 'agenda' ? "text-primary" : "text-[#8A8B88] hover:text-primary"
          )}
        >
          <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">calendar_today</span>
          <span className={cn("text-[10px]", activeTab === 'agenda' ? "font-bold" : "font-medium")}>Agenda</span>
        </button>
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/mensagens');
          }}
          className="group flex flex-col items-center justify-center gap-1 p-3 min-w-[60px] transition-colors text-[#8A8B88] hover:text-primary touch-manipulation"
        >
          <div className="relative">
            <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">chat_bubble</span>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-stone-50 dark:border-[#22252a]" />
          </div>
          <span className="text-[10px] font-medium">Msgs</span>
        </button>
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/minha-conta');
          }}
          className="group flex flex-col items-center justify-center gap-1 p-3 min-w-[60px] transition-colors text-[#8A8B88] hover:text-primary touch-manipulation"
        >
          <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">menu</span>
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
});
