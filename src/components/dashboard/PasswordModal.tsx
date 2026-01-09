import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { usePasswordAudit } from '@/hooks/usePasswordAudit';
import { toast } from 'sonner';

interface PasswordModalProps {
  propertyId: string;
  propertyName: string;
  scheduleId: string;
  passwordFromIcal?: string;
  accessPassword?: string;
  teamMemberId: string | null;
  onClose: () => void;
  onPasswordUpdated?: (newPassword: string) => void;
}

type PasswordMode = 'ical' | 'manual';

export function PasswordModal({ 
  propertyId,
  propertyName, 
  scheduleId,
  passwordFromIcal,
  accessPassword,
  teamMemberId,
  onClose,
  onPasswordUpdated,
}: PasswordModalProps) {
  const { isAdmin, isManager, role } = useUserRole();
  const { logAction } = usePasswordAudit();
  const canManage = isAdmin || isManager;
  
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('ical');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoggedView, setHasLoggedView] = useState(false);

  // Fetch property password mode
  useEffect(() => {
    const fetchPasswordMode = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('password_mode')
          .eq('id', propertyId)
          .single();

        if (error) throw error;
        setPasswordMode((data?.password_mode as PasswordMode) || 'ical');
      } catch (err) {
        console.error('Error fetching password mode:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPasswordMode();
  }, [propertyId]);

  // Determine which password to display
  const displayPassword = passwordMode === 'ical' ? passwordFromIcal : accessPassword;
  const hasPassword = Boolean(displayPassword && displayPassword.trim());

  // Log view action when password is displayed (only once per modal open)
  useEffect(() => {
    if (!isLoading && hasPassword && teamMemberId && !hasLoggedView) {
      logAction({
        scheduleId,
        propertyId,
        teamMemberId,
        action: 'viewed',
      });
      setHasLoggedView(true);
    }
  }, [isLoading, hasPassword, teamMemberId, scheduleId, propertyId, logAction, hasLoggedView]);

  // Check if cleaner can view password
  const canView = () => {
    // Admin and manager can always view
    if (canManage) return true;
    
    // Cleaner can only view if password exists
    if (role === 'cleaner') {
      return hasPassword;
    }
    
    return false;
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Digite uma senha válida');
      return;
    }

    setIsSaving(true);
    try {
      const isCreating = !accessPassword;
      
      const { error } = await supabase
        .from('schedules')
        .update({ access_password: newPassword.trim() })
        .eq('id', scheduleId);

      if (error) throw error;

      // Log action
      if (teamMemberId) {
        await logAction({
          scheduleId,
          propertyId,
          teamMemberId,
          action: isCreating ? 'created' : 'updated',
        });
      }

      toast.success(isCreating ? 'Senha definida com sucesso' : 'Senha atualizada com sucesso');
      setIsEditing(false);
      onPasswordUpdated?.(newPassword.trim());
    } catch (err) {
      console.error('Error saving password:', err);
      toast.error('Erro ao salvar senha');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPasswordContent = () => {
    if (isLoading) {
      return (
        <div className="mt-6 mb-4 flex w-full flex-col items-center justify-center rounded-xl bg-slate-50 border border-slate-200 py-5 dark:bg-slate-800/80 dark:border-slate-600">
          <span className="material-symbols-outlined text-2xl animate-spin text-muted-foreground">progress_activity</span>
        </div>
      );
    }

    if (!canView()) {
      return (
        <div className="mt-6 mb-4 flex w-full flex-col items-center justify-center rounded-xl bg-amber-50 border border-amber-200 py-5 dark:bg-amber-900/20 dark:border-amber-800">
          <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400 mb-2">lock</span>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Senha não disponível
          </span>
          <span className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {passwordMode === 'manual' 
              ? 'Aguardando definição pelo gestor'
              : 'Não disponível para esta reserva'}
          </span>
        </div>
      );
    }

    // Manual mode editing for admin/manager
    if (passwordMode === 'manual' && canManage && isEditing) {
      return (
        <div className="mt-6 mb-4 w-full">
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Digite a nova senha"
            className="w-full text-center text-2xl font-bold tracking-widest rounded-xl bg-slate-50 border border-slate-200 py-4 px-4 dark:bg-slate-800/80 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setIsEditing(false);
                setNewPassword('');
              }}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSavePassword}
              disabled={isSaving || !newPassword.trim()}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      );
    }

    // Display password
    if (hasPassword) {
      return (
        <>
          <div className="mt-6 mb-4 flex w-full flex-col items-center justify-center rounded-xl bg-slate-50 border border-slate-200 py-5 dark:bg-slate-800/80 dark:border-slate-600">
            <span className="font-display text-4xl font-extrabold tracking-widest text-slate-900 dark:text-white">
              {displayPassword}
            </span>
          </div>
          
          {/* Mode indicator */}
          <div className="mb-4 text-center">
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              passwordMode === 'ical' 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            )}>
              <span className="material-symbols-outlined text-sm">
                {passwordMode === 'ical' ? 'cloud_sync' : 'edit_note'}
              </span>
              {passwordMode === 'ical' ? 'Senha do iCal' : 'Senha Manual'}
            </span>
          </div>

          {/* Edit button for manual mode */}
          {passwordMode === 'manual' && canManage && (
            <button
              onClick={() => {
                setNewPassword(accessPassword || '');
                setIsEditing(true);
              }}
              className="mb-2 flex items-center justify-center gap-1 text-sm text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Alterar senha
            </button>
          )}
        </>
      );
    }

    // No password defined (manual mode)
    if (passwordMode === 'manual' && canManage) {
      return (
        <div className="mt-6 mb-4 w-full">
          <div className="flex w-full flex-col items-center justify-center rounded-xl bg-amber-50 border border-amber-200 py-5 dark:bg-amber-900/20 dark:border-amber-800 mb-4">
            <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400 mb-2">add_circle</span>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Senha não definida
            </span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
          >
            Definir Senha
          </button>
        </div>
      );
    }

    // No password from iCal
    return (
      <div className="mt-6 mb-4 flex w-full flex-col items-center justify-center rounded-xl bg-amber-50 border border-amber-200 py-5 dark:bg-amber-900/20 dark:border-amber-800">
        <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400 mb-2">warning</span>
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          Senha não disponível
        </span>
        <span className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Esta reserva não possui senha no iCal
        </span>
      </div>
    );
  };

  return (
    <div 
      aria-modal="true" 
      role="dialog"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-xs transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-[#2d3138] dark:border dark:border-slate-700">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        
        {/* Content */}
        <div className="flex flex-col items-center text-center mt-2">
          {/* Icon */}
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 shadow-sm">
            <span className="material-symbols-outlined text-3xl text-primary">vpn_key</span>
          </div>
          
          {/* Title */}
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Senha de Acesso</h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 max-w-[200px]">
            Utilize o código abaixo para destravar a porta principal
          </p>
          
          {renderPasswordContent()}
          
          {/* Close Button */}
          {!isEditing && (
            <button 
              onClick={onClose}
              className="mt-2 w-full rounded-lg bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Fechar Visualização
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
