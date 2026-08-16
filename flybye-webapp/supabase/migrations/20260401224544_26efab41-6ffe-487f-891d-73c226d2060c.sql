ALTER TABLE public.profiles ADD COLUMN gender text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN gender_preference text DEFAULT 'any';