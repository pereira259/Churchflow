-- ==============================================================================
-- CHURCHFLOW SECURITY OVERHAUL (FULL) - V2 (FIXED)
-- Description: Applies Phase 1, 2, and 3 security protections in one go.
-- Instructions: Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- ==============================================================================
-- PHASE 1: HELPERS & FUNCTIONS
-- ==============================================================================

-- 1. Helper to get the current user's church_id safely
-- [FIX] Moved from auth.get_user_church_id() to public.get_user_church_id() to avoid permissions error
CREATE OR REPLACE FUNCTION public.get_user_church_id()
RETURNS UUID AS $$
DECLARE
  v_church_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT church_id INTO v_church_id
  FROM public.users
  WHERE id = auth.uid();

  RETURN v_church_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper to check if user has elevated privileges (Admin/Pastor)
CREATE OR REPLACE FUNCTION public.is_admin_or_pastor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'pastor_chefe', 'pastor_lider')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper to check if user has Leader privileges
CREATE OR REPLACE FUNCTION public.is_admin_or_leader()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Helper to check if user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PHASE 2: CORE TABLES
-- ==============================================================================

-- A. USERS TABLE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_isolation" ON public.users;
CREATE POLICY "users_read_isolation" ON public.users
FOR SELECT TO authenticated
USING ( church_id = public.get_user_church_id() OR public.is_super_admin() );

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
FOR UPDATE TO authenticated
USING ( id = auth.uid() )
WITH CHECK ( id = auth.uid() );

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
FOR UPDATE TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_pastor() );

DROP POLICY IF EXISTS "users_insert_signup" ON public.users;
CREATE POLICY "users_insert_signup" ON public.users
FOR INSERT TO authenticated
WITH CHECK ( id = auth.uid() );

-- B. CHURCHES TABLE
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "churches_read_isolation" ON public.churches;
CREATE POLICY "churches_read_isolation" ON public.churches
FOR SELECT TO authenticated
USING ( id = public.get_user_church_id() OR public.is_super_admin() );

DROP POLICY IF EXISTS "churches_update_admin" ON public.churches;
CREATE POLICY "churches_update_admin" ON public.churches
FOR UPDATE TO authenticated
USING ( id = public.get_user_church_id() AND public.is_admin_or_pastor() )
WITH CHECK ( id = public.get_user_church_id() );

DROP POLICY IF EXISTS "churches_insert_onboarding" ON public.churches;
CREATE POLICY "churches_insert_onboarding" ON public.churches
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "churches_delete_super_admin" ON public.churches;
CREATE POLICY "churches_delete_super_admin" ON public.churches
FOR DELETE TO authenticated
USING ( public.is_super_admin() );


-- ==============================================================================
-- PHASE 3: DATA MODULES
-- ==============================================================================

-- MEMBERS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_isolation_select" ON public.members;
CREATE POLICY "members_isolation_select" ON public.members FOR SELECT TO authenticated
USING ( church_id = public.get_user_church_id() );

DROP POLICY IF EXISTS "members_isolation_insert" ON public.members;
CREATE POLICY "members_isolation_insert" ON public.members FOR INSERT TO authenticated
WITH CHECK ( church_id = public.get_user_church_id() );

DROP POLICY IF EXISTS "members_isolation_update" ON public.members;
CREATE POLICY "members_isolation_update" ON public.members FOR UPDATE TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_leader() );

DROP POLICY IF EXISTS "members_isolation_delete" ON public.members;
CREATE POLICY "members_isolation_delete" ON public.members FOR DELETE TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_pastor() );


-- MINISTRIES
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ministries_isolation_select" ON public.ministries;
CREATE POLICY "ministries_isolation_select" ON public.ministries FOR SELECT TO authenticated
USING ( church_id = public.get_user_church_id() );

DROP POLICY IF EXISTS "ministries_isolation_modify" ON public.ministries;
CREATE POLICY "ministries_isolation_modify" ON public.ministries FOR ALL TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_pastor() );


-- GROUPS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_isolation_select" ON public.groups;
CREATE POLICY "groups_isolation_select" ON public.groups FOR SELECT TO authenticated
USING ( church_id = public.get_user_church_id() );

DROP POLICY IF EXISTS "groups_isolation_modify" ON public.groups;
CREATE POLICY "groups_isolation_modify" ON public.groups FOR ALL TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_leader() );


-- EVENTS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_isolation_select" ON public.events;
CREATE POLICY "events_isolation_select" ON public.events FOR SELECT TO authenticated
USING ( church_id = public.get_user_church_id() );

DROP POLICY IF EXISTS "events_isolation_modify" ON public.events;
CREATE POLICY "events_isolation_modify" ON public.events FOR ALL TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_pastor() );


-- FINANCIALS (TRANSACTIONS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_isolation_select" ON public.transactions;
CREATE POLICY "transactions_isolation_select" ON public.transactions FOR SELECT TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_leader() );

DROP POLICY IF EXISTS "transactions_isolation_modify" ON public.transactions;
CREATE POLICY "transactions_isolation_modify" ON public.transactions FOR ALL TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_pastor() );


-- COST CENTERS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cost_centers_isolation_select" ON public.cost_centers;
CREATE POLICY "cost_centers_isolation_select" ON public.cost_centers FOR SELECT TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_leader() );

DROP POLICY IF EXISTS "cost_centers_isolation_modify" ON public.cost_centers;
CREATE POLICY "cost_centers_isolation_modify" ON public.cost_centers FOR ALL TO authenticated
USING ( church_id = public.get_user_church_id() AND public.is_admin_or_pastor() );
