-- ==============================================================================
-- SECURITY OVERHAUL - PHASE 3: DATA MODULES
-- Description: Protects CRM, Finance, Ministries, etc.
-- ==============================================================================

-- >>> MEMBERS (CRM) <<<
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_isolation_select" ON public.members;
CREATE POLICY "members_isolation_select" ON public.members
FOR SELECT TO authenticated
USING ( church_id = auth.get_user_church_id() );

DROP POLICY IF EXISTS "members_isolation_insert" ON public.members;
CREATE POLICY "members_isolation_insert" ON public.members
FOR INSERT TO authenticated
WITH CHECK ( church_id = auth.get_user_church_id() );

DROP POLICY IF EXISTS "members_isolation_update" ON public.members;
CREATE POLICY "members_isolation_update" ON public.members
FOR UPDATE TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_leader() );

DROP POLICY IF EXISTS "members_isolation_delete" ON public.members;
CREATE POLICY "members_isolation_delete" ON public.members
FOR DELETE TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_pastor() );


-- >>> MINISTRIES <<<
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ministries_isolation_select" ON public.ministries;
CREATE POLICY "ministries_isolation_select" ON public.ministries
FOR SELECT TO authenticated
USING ( church_id = auth.get_user_church_id() );

DROP POLICY IF EXISTS "ministries_isolation_modify" ON public.ministries;
CREATE POLICY "ministries_isolation_modify" ON public.ministries
FOR ALL TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_pastor() );


-- >>> GROUPS <<<
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_isolation_select" ON public.groups;
CREATE POLICY "groups_isolation_select" ON public.groups
FOR SELECT TO authenticated
USING ( church_id = auth.get_user_church_id() );

DROP POLICY IF EXISTS "groups_isolation_modify" ON public.groups;
CREATE POLICY "groups_isolation_modify" ON public.groups
FOR ALL TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_leader() );


-- >>> EVENTS <<<
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_isolation_select" ON public.events;
CREATE POLICY "events_isolation_select" ON public.events
FOR SELECT TO authenticated
USING ( church_id = auth.get_user_church_id() ); -- Note: If public events needed, change this to TRUE

DROP POLICY IF EXISTS "events_isolation_modify" ON public.events;
CREATE POLICY "events_isolation_modify" ON public.events
FOR ALL TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_pastor() );


-- >>> FINANCIALS (TRANSACTIONS) <<<
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_isolation_select" ON public.transactions;
CREATE POLICY "transactions_isolation_select" ON public.transactions
FOR SELECT TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_leader() );

DROP POLICY IF EXISTS "transactions_isolation_modify" ON public.transactions;
CREATE POLICY "transactions_isolation_modify" ON public.transactions
FOR ALL TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_pastor() );


-- >>> COST CENTERS <<<
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_centers_isolation_select" ON public.cost_centers;
CREATE POLICY "cost_centers_isolation_select" ON public.cost_centers
FOR SELECT TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_leader() );

DROP POLICY IF EXISTS "cost_centers_isolation_modify" ON public.cost_centers;
CREATE POLICY "cost_centers_isolation_modify" ON public.cost_centers
FOR ALL TO authenticated
USING ( church_id = auth.get_user_church_id() AND public.is_admin_or_pastor() );
