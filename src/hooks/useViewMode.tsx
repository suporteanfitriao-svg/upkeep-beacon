import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useUserRole } from './useUserRole';

export type ViewMode = 'owner' | 'manager' | 'cleaner';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  canSwitchView: boolean;
  availableModes: ViewMode[];
  getViewLabel: (mode: ViewMode) => string;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const VIEW_MODE_STORAGE_KEY = 'superadmin_view_mode';

// Map app roles to view modes
function rolesToViewModes(roles: string[], isSuperAdmin: boolean): ViewMode[] {
  if (isSuperAdmin) return ['owner', 'manager', 'cleaner'];
  const modes: ViewMode[] = [];
  if (roles.includes('admin')) modes.push('owner');
  if (roles.includes('manager')) modes.push('manager');
  if (roles.includes('cleaner')) modes.push('cleaner');
  return modes;
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { isSuperAdmin, roles, loading } = useUserRole();
  const [viewMode, setViewModeState] = useState<ViewMode>('owner');

  const availableModes = useMemo(
    () => rolesToViewModes(roles, isSuperAdmin),
    [roles, isSuperAdmin]
  );

  const canSwitchView = !loading && availableModes.length > 1;

  // Load saved view mode from localStorage
  useEffect(() => {
    if (loading) return;
    if (canSwitchView) {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved && availableModes.includes(saved as ViewMode)) {
        setViewModeState(saved as ViewMode);
      } else {
        setViewModeState(availableModes[0] || 'owner');
      }
    } else if (availableModes.length === 1) {
      setViewModeState(availableModes[0]);
    }
  }, [loading, canSwitchView, availableModes]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  };

  const getViewLabel = (mode: ViewMode): string => {
    switch (mode) {
      case 'owner':
        return 'Proprietário';
      case 'manager':
        return 'Anfitrião';
      case 'cleaner':
        return 'Cleaner';
      default:
        return mode;
    }
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, canSwitchView, availableModes, getViewLabel }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextType {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
