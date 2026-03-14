-- Seed admin role for Andy
INSERT INTO public.user_roles (user_id, role) VALUES ('104941e2-a39e-4277-bee7-51fb077c1920', 'admin') ON CONFLICT (user_id, role) DO NOTHING;

-- Align movement patterns to spec:
-- Lunge -> Single Leg, Rotation -> Rotational, Jump -> Plyometric, Sprint -> Plyometric, Swim -> Isolation, Row -> Pull
UPDATE public.exercises SET movement_pattern = 'Single Leg' WHERE movement_pattern = 'Lunge';
UPDATE public.exercises SET movement_pattern = 'Rotational' WHERE movement_pattern = 'Rotation';
UPDATE public.exercises SET movement_pattern = 'Plyometric' WHERE movement_pattern = 'Jump';
UPDATE public.exercises SET movement_pattern = 'Plyometric' WHERE movement_pattern = 'Sprint';
UPDATE public.exercises SET movement_pattern = 'Isolation' WHERE movement_pattern = 'Swim';
UPDATE public.exercises SET movement_pattern = 'Pull' WHERE movement_pattern = 'Row';