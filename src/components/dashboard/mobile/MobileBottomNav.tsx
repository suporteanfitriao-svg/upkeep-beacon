import { memo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

// Tab types for different roles
type CleanerTab = 'inicio' | 'agenda' | 'menu';
type ManagerTab = 'home' | 'calendario' | 'checklist' | 'inspecoes' | 'perfil';

interface MobileBottomNavProps {
  activeTab: CleanerTab;
  onTabChange: (tab: CleanerTab) => void;
}

export const MobileBottomNav = memo(function MobileBottomNav({ 
  activeTab, 
  onTabChange 
}: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isManager, isAdmin, isSuperAdmin } = useUserRole();

  // REGRA 4: Anfitrião tem menu específico com 5 abas
  // Admin e SuperAdmin usam o mesmo menu que outros roles administrativos
  const showManagerNav = isManager && !isAdmin && !isSuperAdmin;

  // Optimized handlers for cleaner/admin nav
  const handleTabClick = useCallback((tab: CleanerTab, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Manager-specific navigation handler
  const handleManagerNavClick = useCallback((route: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestAnimationFrame(() => {
      navigate(route);
    });
  }, [navigate]);

  // Determine active manager tab based on current route
  const getActiveManagerTab = (): ManagerTab => {
    if (location.pathname === '/inspecoes') return 'inspecoes';
    if (location.pathname === '/minha-conta') return 'perfil';
    // For home and calendar, use the activeTab prop mapping
    if (activeTab === 'agenda') return 'calendario';
    return 'home';
  };

  const activeManagerTab = getActiveManagerTab();

  // REGRA 4: Menu do Anfitrião - Home, Calendário, Checklist, Inspeções, Perfil
  if (showManagerNav) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-[100] safe-area-inset-bottom">
        <div className="absolute inset-0 bg-stone-50/95 dark:bg-[#22252a]/95 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-700/50" />
        <div className="relative flex h-20 items-center justify-around px-1 pb-2">
          {/* Home */}
          <button 
            type="button"
            onClick={(e) => { handleTabClick('inicio', e); }}
            className={cn(
              "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
              activeManagerTab === 'home' ? "text-primary" : "text-[#8A8B88] active:text-primary"
            )}
          >
            <span className={cn(
              "material-symbols-outlined text-[24px]",
              activeManagerTab === 'home' && "filled"
            )}>home</span>
            <span className={cn("text-[9px]", activeManagerTab === 'home' ? "font-bold" : "font-medium")}>Home</span>
          </button>

          {/* Calendário */}
          <button 
            type="button"
            onClick={(e) => { handleTabClick('agenda', e); }}
            className={cn(
              "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
              activeManagerTab === 'calendario' ? "text-primary" : "text-[#8A8B88] active:text-primary"
            )}
          >
            <span className={cn(
              "material-symbols-outlined text-[24px]",
              activeManagerTab === 'calendario' && "filled"
            )}>calendar_today</span>
            <span className={cn("text-[9px]", activeManagerTab === 'calendario' ? "font-bold" : "font-medium")}>Calendário</span>
          </button>

          {/* Checklist - Opens property checklist view */}
          <button 
            type="button"
            onClick={(e) => handleManagerNavClick('/inventario', e)}
            className={cn(
              "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
              location.pathname === '/inventario' ? "text-primary" : "text-[#8A8B88] active:text-primary"
            )}
          >
            <span className={cn(
              "material-symbols-outlined text-[24px]",
              location.pathname === '/inventario' && "filled"
            )}>checklist</span>
            <span className={cn("text-[9px]", location.pathname === '/inventario' ? "font-bold" : "font-medium")}>Checklist</span>
          </button>

          {/* Inspeções */}
          <button 
            type="button"
            onClick={(e) => handleManagerNavClick('/inspecoes', e)}
            className={cn(
              "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
              activeManagerTab === 'inspecoes' ? "text-primary" : "text-[#8A8B88] active:text-primary"
            )}
          >
            <span className={cn(
              "material-symbols-outlined text-[24px]",
              activeManagerTab === 'inspecoes' && "filled"
            )}>search</span>
            <span className={cn("text-[9px]", activeManagerTab === 'inspecoes' ? "font-bold" : "font-medium")}>Inspeções</span>
          </button>

          {/* Perfil */}
          <button 
            type="button"
            onClick={(e) => handleManagerNavClick('/minha-conta', e)}
            className={cn(
              "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
              activeManagerTab === 'perfil' ? "text-primary" : "text-[#8A8B88] active:text-primary"
            )}
          >
            <span className={cn(
              "material-symbols-outlined text-[24px]",
              activeManagerTab === 'perfil' && "filled"
            )}>person</span>
            <span className={cn("text-[9px]", activeManagerTab === 'perfil' ? "font-bold" : "font-medium")}>Perfil</span>
          </button>
        </div>
      </nav>
    );
  }

  // Default navigation for Cleaner/Admin/SuperAdmin
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
