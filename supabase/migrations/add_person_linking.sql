-- Add linked_person_id to tree_members to link user accounts to persons in tree
ALTER TABLE tree_members
ADD COLUMN IF NOT EXISTS linked_person_id UUID REFERENCES persons(id) ON DELETE SET NULL;

-- Create invitations table for inviting people to register as specific persons
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id)
);

-- Index for fast lookup by invite code
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invite_code);

-- RLS policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Anyone can read invitation by code (for registration)
CREATE POLICY "Anyone can read invitation by code" ON invitations
  FOR SELECT USING (true);

-- Only tree owner/admin can create invitations
CREATE POLICY "Tree admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tree_members
      WHERE tree_members.tree_id = invitations.tree_id
      AND tree_members.user_id = auth.uid()
      AND tree_members.role IN ('owner', 'admin')
    )
  );

-- Only creator can update/delete
CREATE POLICY "Creator can manage invitations" ON invitations
  FOR ALL USING (created_by = auth.uid());
