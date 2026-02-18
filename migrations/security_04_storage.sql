-- ==============================================================================
-- STORAGE SECURITY HARDENING (THE LAST 5%)
-- Description: Enforces strict path-based isolation for Storage Buckets.
-- ==============================================================================

-- 1. Ensure 'church-assets' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('church-assets', 'church-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop insecure/broad policies
DROP POLICY IF EXISTS "Public View church-assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth Manage church-assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update church-assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete church-assets" ON storage.objects;
DROP POLICY IF EXISTS "Give me access to own folder" ON storage.objects;

-- 3. Create Path-Based Policies

-- A. PUBLIC READ ACCESS (Images need to be visible)
-- We allow public read, but restricted write.
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'church-assets' );

-- B. EVENTS ISOLATION (events/{churchId}/*)
-- Only allow access if the path starts with the user's church_id
CREATE POLICY "Events: Church Isolation for Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'church-assets' 
    AND (storage.foldername(name))[1] = 'events'
    AND (storage.foldername(name))[2] = public.get_user_church_id()::text
);

CREATE POLICY "Events: Church Isolation for Update/Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'church-assets' 
    AND (storage.foldername(name))[1] = 'events'
    AND (storage.foldername(name))[2] = public.get_user_church_id()::text
);

-- C. AVATARS ISOLATION (avatars/{userId}/*)
-- Only allow access if the path starts with 'avatars' and the next segment is the user's ID
CREATE POLICY "Avatars: User Isolation for Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'church-assets' 
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Avatars: User Isolation for Update/Delete"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'church-assets' 
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Avatars: User Isolation for Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'church-assets' 
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
);
