import { Eye, Building2, UserCog, Brush } from 'lucide-react';
import { useViewMode, ViewMode } from '@/hooks/useViewMode';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ViewModeSwitcherProps {
  collapsed?: boolean;
}

const viewModes: { mode: ViewMode; icon: typeof Building2; description: string }[] = [
  { mode: 'owner', icon: Building2, description: 'Visão completa de gestão' },
  { mode: 'manager', icon: UserCog, description: 'Visão de operações' },
  { mode: 'cleaner', icon: Brush, description: 'Visão mobile de execução' },
];

export function ViewModeSwitcher({ collapsed = false }: ViewModeSwitcherProps) {
  const { viewMode, setViewMode, canSwitchView, getViewLabel } = useViewMode();

  if (!canSwitchView) return null;

  const currentView = viewModes.find(v => v.mode === viewMode) || viewModes[0];
  const CurrentIcon = currentView.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-3 border-dashed border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30",
            collapsed && "justify-center px-2"
          )}
        >
          <Eye className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">
                Visão ativa
              </span>
              <span className="text-sm font-semibold">
                {getViewLabel(viewMode)}
              </span>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 text-amber-600">
          <Eye className="h-4 w-4" />
          Alternar Visão
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {viewModes.map(({ mode, icon: Icon, description }) => (
          <DropdownMenuItem
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              viewMode === mode && "bg-amber-50 dark:bg-amber-900/20"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              viewMode === mode 
                ? "bg-amber-500 text-white" 
                : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "font-medium",
                viewMode === mode && "text-amber-700 dark:text-amber-300"
              )}>
                {getViewLabel(mode)}
              </span>
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            </div>
            {viewMode === mode && (
              <div className="ml-auto h-2 w-2 rounded-full bg-amber-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
