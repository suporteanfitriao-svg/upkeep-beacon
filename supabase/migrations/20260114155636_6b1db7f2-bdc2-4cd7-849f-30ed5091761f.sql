-- Create onboarding_settings table to store global settings from onboarding
CREATE TABLE public.onboarding_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  default_check_in_time time DEFAULT '15:00',
  default_check_out_time time DEFAULT '11:00',
  require_photo_for_issues boolean NOT NULL DEFAULT true,
  require_photo_per_category boolean NOT NULL DEFAULT false,
  enable_notifications boolean NOT NULL DEFAULT true,
  auto_release_schedules boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_settings_user_id_unique UNIQUE (user_id)
);

-- Create house_rules table
CREATE TABLE public.house_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'info' CHECK (priority IN ('info', 'warning')),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create inventory_categories table
CREATE TABLE public.inventory_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.inventory_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create default_checklists table for onboarding checklists (before assigning to properties)
CREATE TABLE public.default_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Checklist Padrão',
  items jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.onboarding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_settings
CREATE POLICY "Users can view own onboarding settings" 
ON public.onboarding_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding settings" 
ON public.onboarding_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding settings" 
ON public.onboarding_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for house_rules
CREATE POLICY "Admins and managers can manage house rules" 
ON public.house_rules FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Cleaners can read house rules" 
ON public.house_rules FOR SELECT 
USING (has_role(auth.uid(), 'cleaner'));

-- RLS Policies for inventory_categories
CREATE POLICY "Admins and managers can manage inventory categories" 
ON public.inventory_categories FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Cleaners can read inventory categories" 
ON public.inventory_categories FOR SELECT 
USING (has_role(auth.uid(), 'cleaner'));

-- RLS Policies for inventory_items
CREATE POLICY "Admins and managers can manage inventory items" 
ON public.inventory_items FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Cleaners can read inventory items" 
ON public.inventory_items FOR SELECT 
USING (has_role(auth.uid(), 'cleaner'));

-- RLS Policies for default_checklists
CREATE POLICY "Admins and managers can manage default checklists" 
ON public.default_checklists FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Cleaners can read default checklists" 
ON public.default_checklists FOR SELECT 
USING (has_role(auth.uid(), 'cleaner'));

-- Create indexes for performance
CREATE INDEX idx_house_rules_user_id ON public.house_rules(user_id);
CREATE INDEX idx_inventory_categories_user_id ON public.inventory_categories(user_id);
CREATE INDEX idx_inventory_items_category_id ON public.inventory_items(category_id);
CREATE INDEX idx_default_checklists_user_id ON public.default_checklists(user_id);