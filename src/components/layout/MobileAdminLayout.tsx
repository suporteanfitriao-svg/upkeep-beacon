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
type ManagerTab = 'home' | 'calendario' | 'checklist' | 'inspecoes' | 'perfil';

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
    if (path === '/inspecoes') return 'inspecoes';
    if (path === '/inventario') return 'checklist';
    if (path === '/minha-conta') return 'perfil';
    // Home e Calendário são abas internas da página Index
    // Quando na raiz, consideramos como 'home' por padrão
    return 'home';
  };

  const activeTab = getActiveTab();

  // Handlers de navegação - usam navigate sem reload
  const handleNavClick = useCallback((route: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Usa requestAnimationFrame para garantir feedback visual suave
    requestAnimationFrame(() => {
      navigate(route);
    });
  }, [navigate]);

  // Para as abas Home e Calendário que são internas à página Index,
  // navegamos para / com um state que indica qual aba ativar
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

        {/* Checklist */}
        <button 
          type="button"
          onClick={(e) => handleNavClick('/inventario', e)}
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
            effectiveTab === 'checklist' ? "text-primary" : "text-[#8A8B88] active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[24px]",
            effectiveTab === 'checklist' && "filled"
          )}>checklist</span>
          <span className={cn("text-[9px]", effectiveTab === 'checklist' ? "font-bold" : "font-medium")}>Checklist</span>
        </button>

        {/* Inspeções */}
        <button 
          type="button"
          onClick={(e) => handleNavClick('/inspecoes', e)}
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
            effectiveTab === 'inspecoes' ? "text-primary" : "text-[#8A8B88] active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[24px]",
            effectiveTab === 'inspecoes' && "filled"
          )}>search</span>
          <span className={cn("text-[9px]", effectiveTab === 'inspecoes' ? "font-bold" : "font-medium")}>Inspeções</span>
        </button>

        {/* Perfil */}
        <button 
          type="button"
          onClick={(e) => handleNavClick('/minha-conta', e)}
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 min-w-[56px] transition-colors touch-manipulation select-none",
            effectiveTab === 'perfil' ? "text-primary" : "text-[#8A8B88] active:text-primary"
          )}
        >
          <span className={cn(
            "material-symbols-outlined text-[24px]",
            effectiveTab === 'perfil' && "filled"
          )}>person</span>
          <span className={cn("text-[9px]", effectiveTab === 'perfil' ? "font-bold" : "font-medium")}>Perfil</span>
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
