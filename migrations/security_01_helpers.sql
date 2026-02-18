-- ==============================================================================
-- SECURITY OVERHAUL - PHASE 1: HELPERS & FUNCTIONS
-- Description: Centralized authorization logic to prevent implementation errors.
-- ==============================================================================

-- 1. Helper to get the current user's church_id safely
-- usage: select auth.get_user_church_id();
CREATE OR REPLACE FUNCTION auth.get_user_church_id()
RETURNS UUID AS $$
DECLARE
  v_church_id UUID;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get church_id from public.users (SECURITY DEFINER allows bypassing RLS on users table)
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

-- 3. Helper to check if user has Leader privileges (Admins + Leaders)
CREATE OR REPLACE FUNCTION public.is_admin_or_leader()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro') -- Added 'financeiro' as they often need read access
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Helper to check if user is Super Admin (Platform Owner)
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
