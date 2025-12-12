-- Add unique constraint on external_id for upsert to work
ALTER TABLE public.reservations ADD CONSTRAINT reservations_external_id_unique UNIQUE (external_id);

-- Add unique constraint on reservation_id for schedules upsert
ALTER TABLE public.schedules ADD CONSTRAINT schedules_reservation_id_unique UNIQUE (reservation_id);