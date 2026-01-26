import { memo } from 'react';
import { Calendar, ClipboardCheck, Search, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateType = 'schedule' | 'inspection' | 'search' | 'generic';

interface MobileEmptyStateProps {
  type?: EmptyStateType;
  /** Custom message to display */
  message?: string;
  /** Custom submessage for additional context */
  submessage?: string;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

const defaultConfig: Record<EmptyStateType, { icon: React.ReactNode; message: string }> = {
  schedule: {
    icon: <Calendar className="w-12 h-12 text-muted-foreground" />,
    message: 'Não há agendamentos para este dia.'
  },
  inspection: {
    icon: <ClipboardCheck className="w-12 h-12 text-muted-foreground" />,
    message: 'Nenhuma inspeção agendada para este dia.'
  },
  search: {
    icon: <Search className="w-12 h-12 text-muted-foreground" />,
    message: 'Nenhum resultado encontrado.'
  },
  generic: {
    icon: <FileX className="w-12 h-12 text-muted-foreground" />,
    message: 'Nenhum item encontrado.'
  }
};

/**
 * REGRA 5: Estado vazio
 * 
 * Quando não houver tarefas para o dia selecionado:
 * - 5.1: Mostra mensagem amigável
 * - 5.2: Nunca exibe tela vazia sem explicação
 */
export const MobileEmptyState = memo(function MobileEmptyState({
  type = 'generic',
  message,
  submessage,
  icon,
  className
}: MobileEmptyStateProps) {
  const config = defaultConfig[type];
  const displayIcon = icon || config.icon;
  const displayMessage = message || config.message;

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      <div className="mb-4 opacity-60">
        {displayIcon}
      </div>
      <p className="text-muted-foreground font-medium text-base">
        {displayMessage}
      </p>
      {submessage && (
        <p className="text-muted-foreground/70 text-sm mt-2">
          {submessage}
        </p>
      )}
    </div>
  );
});
