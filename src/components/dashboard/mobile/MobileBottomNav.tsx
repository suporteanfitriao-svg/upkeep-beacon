import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: 'inicio' | 'agenda' | 'menu';
  onTabChange: (tab: 'inicio' | 'agenda' | 'menu') => void;
}

export const MobileBottomNav = memo(function MobileBottomNav({ 
  activeTab, 
  onTabChange 
}: MobileBottomNavProps) {
  const navigate = useNavigate();

  // Optimized handlers - prevent default and use requestAnimationFrame for smoother transitions
  const handleTabClick = useCallback((tab: 'inicio' | 'agenda', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Use requestAnimationFrame for smoother visual feedback
    requestAnimationFrame(() => {
      onTabChange(tab);
    });
  }, [onTabChange]);

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestAnimationFrame(() => {
      navigate('/minha-conta');
    });
  }, [navigate]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] safe-area-inset-bottom">
      <div className="absolute inset-0 bg-stone-50/95 dark:bg-[#22252a]/95 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-700/50" />
      <div className="relative flex h-20 items-center justify-around px-2 pb-2">
        <button 
          type="button"
          onClick={(e) => handleTabClick('inicio', e)}
          className={cn(
            "group flex flex-col items-center justify-center gap-1 p-3 min-w-[60px] transition-colors touch-manipulation select-none",
            activeTab === 'inicio' ? "text-primary" : "text-[#8A8B88] active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[28px] transition-transform",
            activeTab === 'inicio' && "filled"
          )}>home</span>
          <span className={cn("text-[10px]", activeTab === 'inicio' ? "font-bold" : "font-medium")}>Início</span>
        </button>
        <button 
          type="button"
          onClick={(e) => handleTabClick('agenda', e)}
          className={cn(
            "group flex flex-col items-center justify-center gap-1 p-3 min-w-[60px] transition-colors touch-manipulation select-none",
            activeTab === 'agenda' ? "text-primary" : "text-[#8A8B88] active:text-primary"
          )}
        >
          <span className="material-symbols-outlined text-[28px] transition-transform">calendar_today</span>
          <span className={cn("text-[10px]", activeTab === 'agenda' ? "font-bold" : "font-medium")}>Agenda</span>
        </button>
        <button 
          type="button"
          onClick={handleMenuClick}
          className="group flex flex-col items-center justify-center gap-1 p-3 min-w-[60px] transition-colors text-[#8A8B88] active:text-primary touch-manipulation select-none"
        >
          <span className="material-symbols-outlined text-[28px] transition-transform">menu</span>
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
});
