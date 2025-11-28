-- Temporarily disable RLS on tree_members until we find a proper solution
-- This allows the app to work, but tree_members data is not protected by RLS

-- Drop all existing policies on tree_members
DROP POLICY IF EXISTS "Users can view tree members" ON tree_members;
DROP POLICY IF EXISTS "Users can view members of their trees" ON tree_members;
DROP POLICY IF EXISTS "Admins can manage tree members" ON tree_members;
DROP POLICY IF EXISTS "tree_members_select" ON tree_members;
DROP POLICY IF EXISTS "tree_members_insert" ON tree_members;
DROP POLICY IF EXISTS "tree_members_update" ON tree_members;
DROP POLICY IF EXISTS "tree_members_delete" ON tree_members;

-- Drop old functions and tables from previous attempts
DROP TRIGGER IF EXISTS tree_members_sync_trigger ON tree_members;
DROP FUNCTION IF EXISTS sync_tree_membership_lookup();
DROP TABLE IF EXISTS tree_membership_lookup;
DROP FUNCTION IF EXISTS public.is_tree_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_tree_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_tree_owner(UUID, UUID);
DROP FUNCTION IF EXISTS public.check_tree_membership(UUID, UUID);
DROP FUNCTION IF EXISTS public.check_tree_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_tree_ids(UUID);
DROP FUNCTION IF EXISTS public.get_user_admin_tree_ids(UUID);

-- Disable RLS on tree_members
ALTER TABLE tree_members DISABLE ROW LEVEL SECURITY;
