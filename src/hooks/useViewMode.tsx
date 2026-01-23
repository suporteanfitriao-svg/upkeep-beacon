import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUserRole } from './useUserRole';

export type ViewMode = 'owner' | 'manager' | 'cleaner';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  canSwitchView: boolean;
  getViewLabel: (mode: ViewMode) => string;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const VIEW_MODE_STORAGE_KEY = 'superadmin_view_mode';

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { isSuperAdmin, loading } = useUserRole();
  const [viewMode, setViewModeState] = useState<ViewMode>('owner');

  // Load saved view mode from localStorage
  useEffect(() => {
    if (isSuperAdmin) {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved && ['owner', 'manager', 'cleaner'].includes(saved)) {
        setViewModeState(saved as ViewMode);
      }
    }
  }, [isSuperAdmin]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    if (isSuperAdmin) {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
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

  // Only superadmins can switch view
  const canSwitchView = !loading && isSuperAdmin;

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, canSwitchView, getViewLabel }}>
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
