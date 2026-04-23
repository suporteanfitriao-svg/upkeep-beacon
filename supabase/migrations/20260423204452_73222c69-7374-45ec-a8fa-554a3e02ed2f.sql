-- 1. Backfill: atribuir Murilo (principal do Apê Embaré) ao agendamento de 26/04
UPDATE public.schedules s
SET responsible_team_member_id = tmp.team_member_id,
    cleaner_name = tm.name,
    updated_at = now()
FROM public.team_member_properties tmp
JOIN public.team_members tm ON tm.id = tmp.team_member_id
WHERE s.responsible_team_member_id IS NULL
  AND s.property_id = tmp.property_id
  AND tmp.is_primary = true
  AND tm.is_active = true
  AND s.status IN ('waiting', 'released');

-- 2. Trigger function: ao inserir schedule sem responsável, usar o principal da propriedade
CREATE OR REPLACE FUNCTION public.assign_primary_cleaner_on_schedule_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_primary_id uuid;
  v_primary_name text;
BEGIN
  IF NEW.responsible_team_member_id IS NOT NULL OR NEW.property_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tmp.team_member_id, tm.name
  INTO v_primary_id, v_primary_name
  FROM public.team_member_properties tmp
  JOIN public.team_members tm ON tm.id = tmp.team_member_id
  WHERE tmp.property_id = NEW.property_id
    AND tmp.is_primary = true
    AND tm.is_active = true
  LIMIT 1;

  IF v_primary_id IS NOT NULL THEN
    NEW.responsible_team_member_id := v_primary_id;
    IF NEW.cleaner_name IS NULL THEN
      NEW.cleaner_name := v_primary_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_primary_cleaner_on_schedule_insert ON public.schedules;
CREATE TRIGGER trg_assign_primary_cleaner_on_schedule_insert
BEFORE INSERT ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.assign_primary_cleaner_on_schedule_insert();