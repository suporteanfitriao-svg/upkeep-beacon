/**
 * MobileAdminLayoutWrapper - Wrapper condicional para layout mobile admin
 * 
 * Este componente decide se deve usar o MobileAdminLayout baseado em:
 * 1. Se está em um dispositivo móvel
 * 2. Se o usuário é admin/manager (não cleaner)
 * 
 * REGRA: Menu inferior é estrutura, não conteúdo. Estrutura não recarrega.
 */

import { memo, ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useViewMode } from '@/hooks/useViewMode';
import { MobileAdminLayout } from './MobileAdminLayout';
import { Skeleton } from '@/components/ui/skeleton';

interface MobileAdminLayoutWrapperProps {
  children: ReactNode;
  /** Se true, força o uso do layout mesmo sem checagem de role */
  forceLayout?: boolean;
}

/**
 * Wrapper que aplica o MobileAdminLayout condicionalmente
 * - Em mobile + (admin ou manager) = aplica layout com nav fixo
 * - Em desktop ou cleaner = renderiza children diretamente
 */
export const MobileAdminLayoutWrapper = memo(function MobileAdminLayoutWrapper({
  children,
  forceLayout = false
}: MobileAdminLayoutWrapperProps) {
  const isMobile = useIsMobile();
  const { hasManagerAccess, isCleaner, loading: roleLoading } = useUserRole();
  const { viewMode, canSwitchView } = useViewMode();

  // Aguarda carregar role para evitar flash de layout incorreto
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#1a1d21] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Condições para usar o layout admin mobile:
  // 1. Está em mobile
  // 2. Tem acesso de manager (admin ou manager)
  // 3. NÃO é cleaner puro (ou seja, é admin/manager que também pode ser cleaner)
  // 4. Se superadmin, não está no modo cleaner view
  
  const isCleanerViewMode = canSwitchView && viewMode === 'cleaner';
  const shouldUseAdminLayout = isMobile && hasManagerAccess && !isCleanerViewMode && !isCleaner;

  // Força layout se solicitado (útil para páginas específicas)
  if (forceLayout && isMobile && hasManagerAccess && !isCleanerViewMode) {
    return <MobileAdminLayout>{children}</MobileAdminLayout>;
  }

  // Aplica layout condicional
  if (shouldUseAdminLayout) {
    return <MobileAdminLayout>{children}</MobileAdminLayout>;
  }

  // Sem layout wrapper - renderiza children diretamente
  return <>{children}</>;
});

export default MobileAdminLayoutWrapper;
