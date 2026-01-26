import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  /** Show back button (default: true) - RULE 1 */
  showBackButton?: boolean;
  /** Show hamburger menu (default: false) - RULE 2.3: Only on Profile screen */
  showHamburgerMenu?: boolean;
  /** Custom back action (default: navigate to /) - RULE 1.2 */
  onBack?: () => void;
  /** Custom menu action */
  onMenuClick?: () => void;
  /** Right side content */
  rightContent?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * REGRA 1: Botão Voltar obrigatório em todas as telas mobile
 * REGRA 2: Header sem repetição do nome da página
 * 
 * Este componente implementa as regras de navegação mobile:
 * - 1.1: Todas as telas têm botão Voltar visível
 * - 1.2: Voltar retorna sempre para Home (/)
 * - 1.3: Nenhuma tela deixa o usuário "preso"
 * - 2.1: Header não repete o nome da página
 * - 2.2: Título simples + Voltar à esquerda
 * - 2.3: Menu sanduíche apenas na tela Perfil
 */
export const MobilePageHeader = memo(function MobilePageHeader({
  title,
  subtitle,
  showBackButton = true,
  showHamburgerMenu = false,
  onBack,
  onMenuClick,
  rightContent,
  className
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  // REGRA 1.2: Voltar sempre retorna para Home
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <header 
      className={cn(
        "sticky top-0 z-30 bg-stone-50/95 dark:bg-[#22252a]/95 backdrop-blur-md",
        "px-4 py-4 shadow-sm border-b border-border safe-area-top",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* REGRA 1: Botão Voltar obrigatório */}
        {showBackButton && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center rounded-full p-2 -ml-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600"
            aria-label="Voltar para Home"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* REGRA 2.3: Menu sanduíche apenas na tela Perfil */}
        {showHamburgerMenu && !showBackButton && (
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center rounded-full p-2 -ml-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* REGRA 2.2: Título simples */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {/* Right side content */}
        {rightContent && (
          <div className="flex items-center gap-2 shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
});
