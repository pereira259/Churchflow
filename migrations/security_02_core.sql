-- ==============================================================================
-- SECURITY OVERHAUL - PHASE 2: CORE TABLES (CHURCHES & USERS)
-- Description: Locks down the tenant system.
-- ==============================================================================

-- A. USERS TABLE (The Identity Source)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. VIEW: Users can see profiles from THEIR OWN church only.
DROP POLICY IF EXISTS "users_read_isolation" ON public.users;
CREATE POLICY "users_read_isolation" ON public.users
FOR SELECT
TO authenticated
USING (
    church_id = auth.get_user_church_id() 
    OR 
    public.is_super_admin()
);

-- 2. UPDATE: Users can update OWN profile.
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
FOR UPDATE
TO authenticated
USING ( id = auth.uid() )
WITH CHECK ( id = auth.uid() );

-- 3. UPDATE (ADMIN): Admins can update users of THEIR OWN church only.
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
FOR UPDATE
TO authenticated
USING (
    church_id = auth.get_user_church_id() 
    AND 
    public.is_admin_or_pastor()
);

-- 4. INSERT (SIGNUP): Allow users to insert themselves (if logic is client-side)
-- Note: Usually signup is handled by a trigger on auth.users, but keeping this for compatibility.
DROP POLICY IF EXISTS "users_insert_signup" ON public.users;
CREATE POLICY "users_insert_signup" ON public.users
FOR INSERT
TO authenticated
WITH CHECK ( id = auth.uid() );


-- B. CHURCHES TABLE (The Tenant)
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can see THEIR OWN church (and potentially others if we have a public directory, but let's restrict for now)
DROP POLICY IF EXISTS "churches_read_isolation" ON public.churches;
CREATE POLICY "churches_read_isolation" ON public.churches
FOR SELECT
TO authenticated
USING (
    id = auth.get_user_church_id()
    OR
    public.is_super_admin()
);

-- 2. UPDATE: Only ADMINS of the church can update it.
DROP POLICY IF EXISTS "churches_update_admin" ON public.churches;
CREATE POLICY "churches_update_admin" ON public.churches
FOR UPDATE
TO authenticated
USING (
    id = auth.get_user_church_id()
    AND
    public.is_admin_or_pastor()
)
WITH CHECK (
    id = auth.get_user_church_id()
);

-- 3. INSERT: Allow authenticated users to create a church (Onboarding flow)
DROP POLICY IF EXISTS "churches_insert_onboarding" ON public.churches;
CREATE POLICY "churches_insert_onboarding" ON public.churches
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. DELETE: Only Super Admin (Safety catch)
DROP POLICY IF EXISTS "churches_delete_super_admin" ON public.churches;
CREATE POLICY "churches_delete_super_admin" ON public.churches
FOR DELETE
TO authenticated
USING ( public.is_super_admin() );

