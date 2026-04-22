-- 1. Hóspedes mínimo em properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS min_guests integer NOT NULL DEFAULT 1;

ALTER TABLE public.properties
ADD CONSTRAINT properties_guests_range_chk 
CHECK (min_guests >= 1 AND max_guests >= min_guests AND default_guests >= min_guests AND default_guests <= max_guests);

-- 2. Cleaner principal por propriedade
ALTER TABLE public.team_member_properties
ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_primary_cleaner_per_property
ON public.team_member_properties (property_id)
WHERE is_primary = true;

-- 3. Templates de padrões (criar tabela primeiro, sem policies que referenciem outras)
CREATE TABLE IF NOT EXISTS public.cleaning_standard_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  area text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cleaning_standard_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_cleaning_standard_templates_updated_at
BEFORE UPDATE ON public.cleaning_standard_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Etapas dos padrões
CREATE TABLE IF NOT EXISTS public.cleaning_standard_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.cleaning_standard_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cleaning_standard_steps_template ON public.cleaning_standard_steps(template_id, sort_order);
ALTER TABLE public.cleaning_standard_steps ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_cleaning_standard_steps_updated_at
BEFORE UPDATE ON public.cleaning_standard_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Atribuição template ↔ propriedade
CREATE TABLE IF NOT EXISTS public.property_cleaning_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.cleaning_standard_templates(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_property_cleaning_standards_property ON public.property_cleaning_standards(property_id);
ALTER TABLE public.property_cleaning_standards ENABLE ROW LEVEL SECURITY;

-- 6. Agora criar todas as policies (todas as tabelas já existem)
CREATE POLICY "Owners and managers manage cleaning standard templates"
ON public.cleaning_standard_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Cleaners read assigned templates"
ON public.cleaning_standard_templates FOR SELECT
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND EXISTS (
    SELECT 1 FROM public.property_cleaning_standards pcs
    WHERE pcs.template_id = cleaning_standard_templates.id
      AND has_property_access(pcs.property_id)
  )
);

CREATE POLICY "Owners and managers manage cleaning standard steps"
ON public.cleaning_standard_steps FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Cleaners read steps of accessible templates"
ON public.cleaning_standard_steps FOR SELECT
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND EXISTS (
    SELECT 1 FROM public.property_cleaning_standards pcs
    WHERE pcs.template_id = cleaning_standard_steps.template_id
      AND has_property_access(pcs.property_id)
  )
);

CREATE POLICY "Owners and managers manage property cleaning standards"
ON public.property_cleaning_standards FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Cleaners read assignments for accessible properties"
ON public.property_cleaning_standards FOR SELECT
USING (
  has_role(auth.uid(), 'cleaner'::app_role) AND has_property_access(property_id)
);

-- 7. Storage bucket para fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaning-standards', 'cleaning-standards', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read cleaning-standards"
ON storage.objects FOR SELECT
USING (bucket_id = 'cleaning-standards');

CREATE POLICY "Authenticated upload cleaning-standards"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cleaning-standards' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Owners update cleaning-standards"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'cleaning-standards' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Owners delete cleaning-standards"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cleaning-standards' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);