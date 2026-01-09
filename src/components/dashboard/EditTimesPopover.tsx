import { useState, useEffect } from 'react';
import { Clock, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EditTimesPopoverProps {
  scheduleId: string;
  checkIn: Date;
  checkOut: Date;
  status: string;
  onUpdated: (checkIn: Date, checkOut: Date) => void;
  teamMemberId?: string | null;
}

export function EditTimesPopover({
  scheduleId,
  checkIn,
  checkOut,
  status,
  onUpdated,
  teamMemberId,
}: EditTimesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInTime, setCheckInTime] = useState(format(checkIn, 'HH:mm'));
  const [checkOutTime, setCheckOutTime] = useState(format(checkOut, 'HH:mm'));
  const [validationError, setValidationError] = useState<string | null>(null);

  // Block editing for completed schedules
  const isBlocked = status === 'completed';

  // Reset times when popover opens
  useEffect(() => {
    if (open) {
      setCheckInTime(format(checkIn, 'HH:mm'));
      setCheckOutTime(format(checkOut, 'HH:mm'));
      setValidationError(null);
    }
  }, [open, checkIn, checkOut]);

  // Validate times
  const validateTimes = (): boolean => {
    const [inHours, inMinutes] = checkInTime.split(':').map(Number);
    const [outHours, outMinutes] = checkOutTime.split(':').map(Number);

    // Create temporary dates to compare times
    const checkInMins = inHours * 60 + inMinutes;
    const checkOutMins = outHours * 60 + outMinutes;

    if (checkOutMins <= checkInMins) {
      setValidationError('Check-out deve ser após check-in');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSave = async () => {
    if (isBlocked || isSubmitting) return;

    if (!validateTimes()) return;

    setIsSubmitting(true);
    try {
      // Build new dates with updated times
      const newCheckIn = new Date(checkIn);
      const newCheckOut = new Date(checkOut);

      const [inHours, inMinutes] = checkInTime.split(':').map(Number);
      const [outHours, outMinutes] = checkOutTime.split(':').map(Number);

      newCheckIn.setHours(inHours, inMinutes, 0, 0);
      newCheckOut.setHours(outHours, outMinutes, 0, 0);

      // Append history event for time change
      const historyEvent = {
        timestamp: new Date().toISOString(),
        team_member_id: teamMemberId || 'system',
        team_member_name: null,
        role: null,
        action: 'alteracao_horario',
        from_status: status,
        to_status: status,
        payload: {
          previous_check_in: checkIn.toISOString(),
          previous_check_out: checkOut.toISOString(),
          new_check_in: newCheckIn.toISOString(),
          new_check_out: newCheckOut.toISOString(),
        },
      };

      // Get current history
      const { data: currentData, error: fetchError } = await supabase
        .from('schedules')
        .select('history')
        .eq('id', scheduleId)
        .single();

      if (fetchError) throw fetchError;

      const currentHistory = Array.isArray(currentData?.history) ? currentData.history : [];
      const newHistory = [...currentHistory, historyEvent];

      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          check_in_time: newCheckIn.toISOString(),
          check_out_time: newCheckOut.toISOString(),
          history: newHistory,
        })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      onUpdated(newCheckIn, newCheckOut);
      toast.success('Horários atualizados');
      setOpen(false);
    } catch (err) {
      console.error('Error updating times:', err);
      toast.error('Erro ao atualizar horários');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-primary"
          disabled={isBlocked}
          title={isBlocked ? 'Não é possível editar horários de limpeza finalizada' : 'Editar horários'}
          onClick={(e) => e.stopPropagation()}
        >
          <Clock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-4"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Editar Horários</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check-in-time" className="text-xs">Check-in</Label>
              <Input
                id="check-in-time"
                type="time"
                value={checkInTime}
                onChange={(e) => {
                  setCheckInTime(e.target.value);
                  setValidationError(null);
                }}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-out-time" className="text-xs">Check-out</Label>
              <Input
                id="check-out-time"
                type="time"
                value={checkOutTime}
                onChange={(e) => {
                  setCheckOutTime(e.target.value);
                  setValidationError(null);
                }}
                className="h-9"
              />
            </div>
          </div>

          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Salvar
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground border-t pt-2">
            Alterações são registradas no histórico
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
