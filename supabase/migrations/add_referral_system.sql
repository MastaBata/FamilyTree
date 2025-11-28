-- Referral system for tracking who invited whom

-- Add referrer tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16) UNIQUE;

-- Create referral codes for existing users
UPDATE profiles
SET referral_code = substr(md5(random()::text), 1, 8)
WHERE referral_code IS NULL;

-- Make referral_code NOT NULL with default for new users
ALTER TABLE profiles ALTER COLUMN referral_code SET DEFAULT substr(md5(random()::text), 1, 8);

-- Table to track referral stats and rewards (optional, for future gamification)
CREATE TABLE IF NOT EXISTS referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  friends_invited INTEGER DEFAULT 0,
  family_members_invited INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own stats
CREATE POLICY "Users can view own referral stats" ON referral_stats
  FOR SELECT USING (user_id = auth.uid());

-- System can update stats (via trigger)
CREATE POLICY "System can manage referral stats" ON referral_stats
  FOR ALL USING (true) WITH CHECK (true);

-- Add referred_by to tree_members to track who invited to specific tree
ALTER TABLE tree_members ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- Update invitations table to track if it was a friend invite (viewer only)
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invite_type VARCHAR(20) DEFAULT 'family';
-- invite_type: 'family' = full member linked to person, 'friend' = viewer only

-- Function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a new user registers with a referrer
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT' AND NEW.referred_by IS NOT NULL THEN
    INSERT INTO referral_stats (user_id, friends_invited, total_referrals)
    VALUES (NEW.referred_by, 1, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      friends_invited = referral_stats.friends_invited + 1,
      total_referrals = referral_stats.total_referrals + 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profile creation (friend referrals)
DROP TRIGGER IF EXISTS on_profile_referral ON profiles;
CREATE TRIGGER on_profile_referral
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_stats();

-- Function to track family member invitations
CREATE OR REPLACE FUNCTION track_family_invitation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When invitation is used (used_at is set)
  IF TG_OP = 'UPDATE' AND OLD.used_at IS NULL AND NEW.used_at IS NOT NULL THEN
    INSERT INTO referral_stats (user_id, family_members_invited, total_referrals)
    VALUES (NEW.created_by, 1, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      family_members_invited = referral_stats.family_members_invited + 1,
      total_referrals = referral_stats.total_referrals + 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invitation usage
DROP TRIGGER IF EXISTS on_invitation_used ON invitations;
CREATE TRIGGER on_invitation_used
  AFTER UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION track_family_invitation();

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
