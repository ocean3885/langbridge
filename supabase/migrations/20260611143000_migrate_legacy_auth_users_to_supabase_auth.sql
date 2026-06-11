-- Migrate existing legacy public.auth_users IDs to Supabase Auth UUIDs.
--
-- This migration uses email as the bridge:
--   public.auth_users.email -> auth.users.email
--
-- Run only after all remaining legacy users have matching auth.users records.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM auth.users
        WHERE email IS NOT NULL
        GROUP BY lower(email)
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot migrate auth users: duplicate email found in auth.users.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.auth_users
        GROUP BY lower(email)
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot migrate auth users: duplicate email found in public.auth_users.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.auth_users legacy
        LEFT JOIN auth.users supabase_user
            ON lower(supabase_user.email) = lower(legacy.email)
        WHERE supabase_user.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot migrate auth users: every remaining public.auth_users row must have a matching auth.users email.';
    END IF;
END $$;

CREATE TEMP TABLE _auth_user_id_migration_map ON COMMIT DROP AS
SELECT
    legacy.id AS old_user_id,
    supabase_user.id::text AS new_user_id,
    legacy.email,
    legacy.created_at
FROM public.auth_users legacy
JOIN auth.users supabase_user
    ON lower(supabase_user.email) = lower(legacy.email)
WHERE legacy.id <> supabase_user.id::text;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM _auth_user_id_migration_map
        GROUP BY old_user_id
        HAVING count(*) > 1
    ) OR EXISTS (
        SELECT 1
        FROM _auth_user_id_migration_map
        GROUP BY new_user_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot migrate auth users: user ID mapping is not one-to-one.';
    END IF;
END $$;

CREATE TEMP TABLE _auth_users_fk_constraints ON COMMIT DROP AS
SELECT
    con.oid,
    con.conname,
    con.conrelid::regclass::text AS table_name,
    pg_get_constraintdef(con.oid) AS constraint_def
FROM pg_constraint con
WHERE con.contype = 'f'
  AND con.confrelid = 'public.auth_users'::regclass;

DO $$
DECLARE
    constraint_record record;
BEGIN
    FOR constraint_record IN
        SELECT table_name, conname
        FROM _auth_users_fk_constraints
    LOOP
        EXECUTE format(
            'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
            constraint_record.table_name,
            constraint_record.conname
        );
    END LOOP;
END $$;

UPDATE public.user_profiles profile
SET
    email = COALESCE(profile.email, migration.email),
    updated_at = timezone('utc'::text, now())
FROM _auth_user_id_migration_map migration
WHERE profile.id = migration.new_user_id;

INSERT INTO public.user_profiles (id, email, created_at, updated_at)
SELECT
    migration.new_user_id,
    COALESCE(profile.email, migration.email),
    COALESCE(profile.created_at, migration.created_at),
    timezone('utc'::text, now())
FROM _auth_user_id_migration_map migration
LEFT JOIN public.user_profiles profile
    ON profile.id = migration.old_user_id
ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_profiles.email),
    updated_at = timezone('utc'::text, now());

DELETE FROM public.user_profiles profile
USING _auth_user_id_migration_map migration
WHERE profile.id = migration.old_user_id;

DO $$
DECLARE
    column_record record;
BEGIN
    FOR column_record IN
        SELECT c.table_schema, c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
            ON t.table_schema = c.table_schema
           AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.data_type = 'text'
          AND c.column_name IN ('user_id', 'uploader_id')
    LOOP
        EXECUTE format(
            'UPDATE %I.%I target
             SET %I = migration.new_user_id
             FROM _auth_user_id_migration_map migration
             WHERE target.%I = migration.old_user_id',
            column_record.table_schema,
            column_record.table_name,
            column_record.column_name,
            column_record.column_name
        );
    END LOOP;
END $$;

UPDATE public.auth_users legacy
SET
    id = migration.new_user_id,
    password_hash = 'supabase-auth',
    password_salt = 'supabase-auth',
    updated_at = timezone('utc'::text, now())
FROM _auth_user_id_migration_map migration
WHERE legacy.id = migration.old_user_id;

DO $$
DECLARE
    constraint_record record;
BEGIN
    FOR constraint_record IN
        SELECT table_name, conname, constraint_def
        FROM _auth_users_fk_constraints
    LOOP
        EXECUTE format(
            'ALTER TABLE %s ADD CONSTRAINT %I %s',
            constraint_record.table_name,
            constraint_record.conname,
            constraint_record.constraint_def
        );
    END LOOP;
END $$;

ANALYZE public.auth_users;
ANALYZE public.user_profiles;
