/**
 * MobileAdminLayout - Layout persistente para Anfitrião e Proprietário no mobile
 * 
 * REGRAS DO SISTEMA:
 * 1. Menu inferior SEMPRE visível - nunca some, nunca recarrega
 * 2. Navegação entre telas não causa reload ou recriação do menu
 * 3. Apenas o conteúdo central muda durante navegação
 * 4. Menu permanece interativo durante carregamento de conteúdo
 */

import { memo, useCallback, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Tab types para roles admin/manager
type ManagerTab = 'home' | 'equipe' | 'calendario' | 'inspecoes' | 'menu';

interface MobileAdminLayoutProps {
  children?: React.ReactNode;
}

// Navigation bar component - memoizado para evitar re-renders
const MobileAdminNavBar = memo(function MobileAdminNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determina a aba ativa baseado na rota atual
  const getActiveTab = (): ManagerTab => {
    const path = location.pathname;
    if (path === '/equipe') return 'equipe';
    if (path === '/inspecoes') return 'inspecoes';
    if (path === '/minha-conta' || path === '/inventario' || path === '/manutencao' || path === '/propriedades') return 'menu';
    return 'home';
  };

  const activeTab = getActiveTab();

  // Handlers de navegação - usam navigate sem reload
  const handleNavClick = useCallback((route: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestAnimationFrame(() => {
      navigate(route);
    });
  }, [navigate]);

  // Para as abas Home e Calendário que são internas à página Index
  const handleHomeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestAnimationFrame(() => {
      navigate('/', { state: { activeTab: 'inicio' } });
    });
  }, [navigate]);

  const handleCalendarClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestAnimationFrame(() => {
      navigate('/', { state: { activeTab: 'agenda' } });
    });
  }, [navigate]);

  // Verifica se estamos na página Index para destacar Home ou Calendário
  const isOnIndexPage = location.pathname === '/';
  const indexState = location.state as { activeTab?: 'inicio' | 'agenda' } | null;
  
  // Se estamos na Index, usa o state para determinar aba ativa
  const effectiveTab = isOnIndexPage 
    ? (indexState?.activeTab === 'agenda' ? 'calendario' : 'home')
    : activeTab;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] safe-area-inset-bottom">
      <div className="absolute inset-0 bg-stone-50/95 dark:bg-[#22252a]/95 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-700/50" />
      <div className="relative flex h-20 items-center justify-around px-1 pb-2">
        {/* Home */}
        <button 
          type="button"
          onClick={handleHomeClick}
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
            effectiveTab === 'home' ? "text-primary" : "text-muted-foreground active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[24px]",
            effectiveTab === 'home' && "filled"
          )}>home</span>
          <span className={cn("text-[9px]", effectiveTab === 'home' ? "font-bold" : "font-medium")}>Home</span>
        </button>

        {/* Equipe */}
        <button 
          type="button"
          onClick={(e) => handleNavClick('/equipe', e)}
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
            effectiveTab === 'equipe' ? "text-primary" : "text-muted-foreground active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[24px]",
            effectiveTab === 'equipe' && "filled"
          )}>groups</span>
          <span className={cn("text-[9px]", effectiveTab === 'equipe' ? "font-bold" : "font-medium")}>Equipe</span>
        </button>

        {/* Calendário */}
        <button 
          type="button"
          onClick={handleCalendarClick}
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
            effectiveTab === 'calendario' ? "text-primary" : "text-muted-foreground active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[24px]",
            effectiveTab === 'calendario' && "filled"
          )}>calendar_today</span>
          <span className={cn("text-[9px]", effectiveTab === 'calendario' ? "font-bold" : "font-medium")}>Calendário</span>
        </button>

        {/* Inspeções */}
        <button 
          type="button"
          onClick={(e) => handleNavClick('/inspecoes', e)}
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
            effectiveTab === 'inspecoes' ? "text-primary" : "text-muted-foreground active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[24px]",
            effectiveTab === 'inspecoes' && "filled"
          )}>search</span>
          <span className={cn("text-[9px]", effectiveTab === 'inspecoes' ? "font-bold" : "font-medium")}>Inspeções</span>
        </button>

        {/* Menu */}
        <button 
          type="button"
          onClick={(e) => handleNavClick('/minha-conta', e)}
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
            effectiveTab === 'menu' ? "text-primary" : "text-muted-foreground active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[24px]",
            effectiveTab === 'menu' && "filled"
          )}>menu</span>
          <span className={cn("text-[9px]", effectiveTab === 'menu' ? "font-bold" : "font-medium")}>Menu</span>
        </button>
      </div>
    </nav>
  );
});

// Loading placeholder para o conteúdo central
export const MobileContentLoading = memo(function MobileContentLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in duration-200">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
});

/**
 * Layout principal para mobile admin
 * O menu inferior é renderizado uma única vez e NUNCA é recriado
 * Apenas o conteúdo (children ou Outlet) muda durante navegação
 */
export const MobileAdminLayout = memo(function MobileAdminLayout({ 
  children 
}: MobileAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1d21]">
      {/* Conteúdo da página - este é o único elemento que muda */}
      <div className="pb-24">
        {children || <Outlet />}
      </div>
      
      {/* Menu inferior FIXO - nunca recarrega */}
      <MobileAdminNavBar />
    </div>
  );
});

export default MobileAdminLayout;
