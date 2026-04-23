-- Reassign schedules
UPDATE public.schedules
SET responsible_team_member_id = 'b89336ae-cca7-4d7b-a673-cf8e2921ca58',
    cleaner_name = 'Murilo Lopes de Lima',
    updated_at = now()
WHERE responsible_team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';

-- Reassign inspections
UPDATE public.inspections
SET assigned_to = 'b89336ae-cca7-4d7b-a673-cf8e2921ca58',
    assigned_to_name = 'Murilo Lopes de Lima',
    updated_at = now()
WHERE assigned_to = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';

UPDATE public.inspections
SET completed_by = 'b89336ae-cca7-4d7b-a673-cf8e2921ca58',
    completed_by_name = 'Murilo Lopes de Lima',
    updated_at = now()
WHERE completed_by = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';

UPDATE public.inspections
SET user_id = '31255876-852e-41fd-8069-1d028e37bd2f',
    updated_at = now()
WHERE user_id = '0078c20b-7df1-4389-9873-c41069ca48a3';

-- Reassign maintenance_issues references to Murilo's user_id
UPDATE public.maintenance_issues
SET reported_by = '31255876-852e-41fd-8069-1d028e37bd2f',
    reported_by_name = 'Murilo Lopes de Lima'
WHERE reported_by = '0078c20b-7df1-4389-9873-c41069ca48a3';

UPDATE public.maintenance_issues
SET assigned_to = '31255876-852e-41fd-8069-1d028e37bd2f',
    assigned_to_name = 'Murilo Lopes de Lima'
WHERE assigned_to = '0078c20b-7df1-4389-9873-c41069ca48a3';

UPDATE public.maintenance_issues
SET resolved_by = '31255876-852e-41fd-8069-1d028e37bd2f',
    resolved_by_name = 'Murilo Lopes de Lima'
WHERE resolved_by = '0078c20b-7df1-4389-9873-c41069ca48a3';

-- Clean up dependent rows for Limpeza Teste
DELETE FROM public.team_member_properties WHERE team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';
DELETE FROM public.cleaning_rates WHERE team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';
DELETE FROM public.password_audit_logs WHERE team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';
DELETE FROM public.team_member_audit_logs WHERE team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';
DELETE FROM public.cleaning_rate_audit_logs WHERE team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';
DELETE FROM public.property_config_audit_logs WHERE team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';
DELETE FROM public.security_audit_logs WHERE user_id = '0078c20b-7df1-4389-9873-c41069ca48a3' OR team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';

-- Remove user roles & profile
DELETE FROM public.user_roles WHERE user_id = '0078c20b-7df1-4389-9873-c41069ca48a3';
UPDATE public.profiles SET team_member_id = NULL WHERE team_member_id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';
DELETE FROM public.profiles WHERE id = '0078c20b-7df1-4389-9873-c41069ca48a3';

-- Delete the team member
DELETE FROM public.team_members WHERE id = '137b9b19-d79e-4daf-a20a-664c2e4d03f6';

-- Delete the auth user
DELETE FROM auth.users WHERE id = '0078c20b-7df1-4389-9873-c41069ca48a3';