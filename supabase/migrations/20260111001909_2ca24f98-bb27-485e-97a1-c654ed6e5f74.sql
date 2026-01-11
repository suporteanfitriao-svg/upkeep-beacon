
-- First, add is_active column if not exists
ALTER TABLE public.property_checklists 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Keep only the most recent checklist active per property, deactivate the rest
WITH ranked_checklists AS (
  SELECT id, property_id,
         ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY created_at DESC) as rn
  FROM property_checklists
)
UPDATE property_checklists pc
SET is_active = false
FROM ranked_checklists rc
WHERE pc.id = rc.id AND rc.rn > 1;

-- Now create unique partial index for only 1 active checklist per property
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_checklists_unique_active 
ON public.property_checklists (property_id) 
WHERE is_active = true;

-- Add checklist_state column to schedules for freezing the checklist at start
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS checklist_state jsonb DEFAULT NULL;

-- Create function to check if checklist can be deleted/deactivated
CREATE OR REPLACE FUNCTION public.can_deactivate_checklist(p_property_id uuid, p_checklist_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cleaning_count integer;
  v_pending_count integer;
  v_result jsonb;
BEGIN
  -- Count schedules with status 'cleaning' for this property
  SELECT COUNT(*) INTO v_cleaning_count
  FROM schedules
  WHERE property_id = p_property_id
    AND status = 'cleaning'
    AND is_active = true;

  -- Count schedules with status 'waiting' or 'released' for this property
  SELECT COUNT(*) INTO v_pending_count
  FROM schedules
  WHERE property_id = p_property_id
    AND status IN ('waiting', 'released')
    AND is_active = true;

  v_result := jsonb_build_object(
    'can_deactivate', (v_cleaning_count = 0),
    'requires_confirmation', (v_pending_count > 0),
    'cleaning_count', v_cleaning_count,
    'pending_count', v_pending_count,
    'message', CASE 
      WHEN v_cleaning_count > 0 THEN 
        'Não é possível desativar o checklist. Existem ' || v_cleaning_count || ' limpezas em andamento.'
      WHEN v_pending_count > 0 THEN 
        'Existem ' || v_pending_count || ' agendamentos pendentes. Confirme a substituição do checklist.'
      ELSE 
        'Checklist pode ser desativado/substituído.'
    END
  );

  RETURN v_result;
END;
$function$;

-- Create function to freeze checklist when cleaning starts
CREATE OR REPLACE FUNCTION public.freeze_checklist_on_cleaning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_property_checklist jsonb;
BEGIN
  -- Only act when transitioning TO 'cleaning' status
  IF NEW.status = 'cleaning' AND (OLD.status IS NULL OR OLD.status != 'cleaning') THEN
    -- Check if checklist_state is already set (frozen)
    IF NEW.checklist_state IS NULL THEN
      -- Get the active checklist for this property
      SELECT items INTO v_property_checklist
      FROM property_checklists
      WHERE property_id = NEW.property_id
        AND is_active = true
      LIMIT 1;

      IF v_property_checklist IS NOT NULL THEN
        -- Freeze the checklist to checklist_state with completed = false for all items
        NEW.checklist_state := (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', item->>'id',
              'title', item->>'title',
              'category', COALESCE(item->>'category', 'Geral'),
              'completed', false
            )
          )
          FROM jsonb_array_elements(v_property_checklist) AS item
        );
        
        -- Also update checklists column for backward compatibility
        NEW.checklists := NEW.checklist_state;
        NEW.checklist_loaded_at := now();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the triggers
DROP TRIGGER IF EXISTS trg_freeze_checklist_on_cleaning ON public.schedules;
CREATE TRIGGER trg_freeze_checklist_on_cleaning
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.freeze_checklist_on_cleaning();

DROP TRIGGER IF EXISTS trg_freeze_checklist_on_cleaning_insert ON public.schedules;
CREATE TRIGGER trg_freeze_checklist_on_cleaning_insert
BEFORE INSERT ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.freeze_checklist_on_cleaning();
