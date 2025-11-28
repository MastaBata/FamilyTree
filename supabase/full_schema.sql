-- ============================================
-- FULL DATABASE SCHEMA FOR FAMILY TREE APP
-- Run this in order on a fresh Supabase project
-- ============================================

-- ============================================
-- PART 1: INITIAL SCHEMA
-- ============================================

-- Пользователи (расширение auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'free', -- free, premium, expired
  subscription_expires_at TIMESTAMPTZ,
  storage_used_bytes BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 2147483648, -- 2 GB
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Деревья
CREATE TABLE public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  share_code TEXT UNIQUE, -- Код для шеринга
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники дерева
CREATE TABLE public.tree_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer', -- owner, admin, editor, viewer
  linked_person_id UUID, -- К какому человеку в дереве привязан (добавляется позже как FK)
  invited_by UUID REFERENCES public.profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tree_id, user_id)
);

-- Люди в дереве
CREATE TABLE public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,

  -- Основная информация
  first_name TEXT NOT NULL,
  last_name TEXT,
  middle_name TEXT,        -- Отчество
  maiden_name TEXT,        -- Девичья фамилия
  gender TEXT,             -- male, female, other

  -- Даты
  birth_date DATE,
  birth_date_approximate BOOLEAN DEFAULT FALSE,
  death_date DATE,
  death_date_approximate BOOLEAN DEFAULT FALSE,
  is_alive BOOLEAN DEFAULT TRUE,

  -- Места
  birth_place TEXT,
  death_place TEXT,
  current_location TEXT,

  -- Дополнительно
  bio TEXT,
  occupation TEXT,
  religion TEXT,

  -- Фото
  avatar_url TEXT,

  -- Верификация
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),

  -- Привязка к аккаунту
  linked_user_id UUID REFERENCES public.profiles(id),

  -- Позиция на canvas
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,

  -- Метаданные
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK constraint for linked_person_id after persons table is created
ALTER TABLE public.tree_members
ADD CONSTRAINT tree_members_linked_person_id_fkey
FOREIGN KEY (linked_person_id) REFERENCES public.persons(id) ON DELETE SET NULL;

-- Связи между людьми
CREATE TABLE public.relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,

  person1_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  person2_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,

  relation_type TEXT NOT NULL, -- parent_child, spouse, sibling, adopted, ex_spouse

  -- Для браков
  marriage_date DATE,
  divorce_date DATE,
  is_current BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(person1_id, person2_id, relation_type)
);

-- Фотографии
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id),

  url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename TEXT,
  file_size_bytes INTEGER,

  title TEXT,
  description TEXT,
  taken_at DATE,

  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Документы
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id),

  url TEXT NOT NULL,
  original_filename TEXT,
  file_type TEXT, -- pdf, image, audio
  file_size_bytes INTEGER,

  title TEXT,
  description TEXT,

  -- Для аудио
  duration_seconds INTEGER,
  transcription TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Дополнительные разделы (папки)
CREATE TABLE public.custom_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Приглашения
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,

  code TEXT,
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  invite_type VARCHAR(20) DEFAULT 'family', -- 'family' = full member, 'friend' = viewer only

  invited_by UUID REFERENCES public.profiles(id),
  invited_email TEXT,
  created_by UUID REFERENCES auth.users(id),

  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMPTZ,

  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Подписки (история платежей)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),

  plan TEXT NOT NULL, -- premium_1y, premium_3y, premium_5y, premium_10y, child, storage_1gb, etc.
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',

  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  payment_provider TEXT, -- stripe, liqpay
  payment_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: EXTENDED PERSON PROFILE
-- ============================================

-- Add new fields to persons table
ALTER TABLE public.persons
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS military_service TEXT,
ADD COLUMN IF NOT EXISTS awards TEXT,
ADD COLUMN IF NOT EXISTS hobbies TEXT,
ADD COLUMN IF NOT EXISTS interesting_facts TEXT,
ADD COLUMN IF NOT EXISTS cause_of_death TEXT,
ADD COLUMN IF NOT EXISTS burial_place TEXT,
ADD COLUMN IF NOT EXISTS burial_place_coords POINT,
ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]';

-- Create table for person contacts with privacy settings
CREATE TABLE IF NOT EXISTS public.person_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'phone', 'email', 'address', 'telegram', 'whatsapp', 'viber', etc.
  value TEXT NOT NULL,
  label TEXT, -- Custom label like "Work phone", "Home address"
  privacy TEXT DEFAULT 'tree_members', -- 'public', 'tree_members', 'close_relatives', 'private'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for custom section files
CREATE TABLE IF NOT EXISTS public.custom_section_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.custom_sections(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT, -- 'image', 'document', 'audio', 'video'
  original_filename TEXT,
  file_size_bytes INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'new_relative', 'access_request', 'birthday', 'memorial', 'subscription_expiring', 'tree_update'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB, -- Additional data (tree_id, person_id, etc.)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 4: REFERRAL SYSTEM
-- ============================================

-- Add referrer tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16) UNIQUE;

-- Make referral_code NOT NULL with default for new users
ALTER TABLE profiles ALTER COLUMN referral_code SET DEFAULT substr(md5(random()::text), 1, 8);

-- Table to track referral stats
CREATE TABLE IF NOT EXISTS referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  friends_invited INTEGER DEFAULT 0,
  family_members_invited INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 5: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_section_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 6: RLS POLICIES
-- ============================================

-- ========== PROFILES ==========
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ========== TREES ==========
-- IMPORTANT: This policy references tree_members - works because it's not ON tree_members
CREATE POLICY "Tree members can view tree" ON public.trees
  FOR SELECT USING (
    id IN (SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid())
    OR is_public = TRUE
  );

CREATE POLICY "Tree owners can update tree" ON public.trees
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create trees" ON public.trees
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- ========== TREE_MEMBERS ==========
-- THIS IS THE PROBLEMATIC TABLE - policies on tree_members that reference tree_members cause recursion
-- Solution: Use SECURITY DEFINER functions that bypass RLS

-- First, create helper functions
CREATE OR REPLACE FUNCTION public.get_user_tree_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(array_agg(tree_id), ARRAY[]::UUID[])
  FROM tree_members
  WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_admin_tree_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(array_agg(tree_id), ARRAY[]::UUID[])
  FROM tree_members
  WHERE user_id = p_user_id AND role IN ('owner', 'admin');
$$;

-- Policies using array containment (no subquery on tree_members!)
CREATE POLICY "tree_members_select" ON tree_members
  FOR SELECT
  USING (
    tree_id = ANY(public.get_user_tree_ids(auth.uid()))
  );

CREATE POLICY "tree_members_insert" ON tree_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR tree_id = ANY(public.get_user_admin_tree_ids(auth.uid()))
  );

CREATE POLICY "tree_members_update" ON tree_members
  FOR UPDATE
  USING (
    tree_id = ANY(public.get_user_admin_tree_ids(auth.uid()))
  );

CREATE POLICY "tree_members_delete" ON tree_members
  FOR DELETE
  USING (
    (tree_id = ANY(public.get_user_admin_tree_ids(auth.uid())) AND role != 'owner')
    OR (user_id = auth.uid() AND role != 'owner')
  );

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_user_tree_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_admin_tree_ids(UUID) TO authenticated;

-- ========== PERSONS ==========
CREATE POLICY "Tree members can view persons" ON public.persons
  FOR SELECT USING (
    tree_id IN (SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Tree editors can create persons" ON public.persons
  FOR INSERT WITH CHECK (
    tree_id IN (
      SELECT tree_id FROM public.tree_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Tree editors can update persons" ON public.persons
  FOR UPDATE USING (
    tree_id IN (
      SELECT tree_id FROM public.tree_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Tree editors can delete persons" ON public.persons
  FOR DELETE USING (
    tree_id IN (
      SELECT tree_id FROM public.tree_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- ========== RELATIONS ==========
CREATE POLICY "Tree members can view relations" ON public.relations
  FOR SELECT USING (
    tree_id IN (SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Tree editors can manage relations" ON public.relations
  FOR ALL USING (
    tree_id IN (
      SELECT tree_id FROM public.tree_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- ========== PHOTOS ==========
CREATE POLICY "Tree members can view photos" ON public.photos
  FOR SELECT USING (
    person_id IN (
      SELECT id FROM public.persons WHERE tree_id IN (
        SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tree editors can manage photos" ON public.photos
  FOR ALL USING (
    person_id IN (
      SELECT id FROM public.persons WHERE tree_id IN (
        SELECT tree_id FROM public.tree_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- ========== DOCUMENTS ==========
CREATE POLICY "Tree members can view documents" ON public.documents
  FOR SELECT USING (
    person_id IN (
      SELECT id FROM public.persons WHERE tree_id IN (
        SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tree editors can manage documents" ON public.documents
  FOR ALL USING (
    person_id IN (
      SELECT id FROM public.persons WHERE tree_id IN (
        SELECT tree_id FROM public.tree_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- ========== CUSTOM_SECTIONS ==========
CREATE POLICY "Tree members can view sections" ON public.custom_sections
  FOR SELECT USING (
    person_id IN (
      SELECT id FROM public.persons WHERE tree_id IN (
        SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tree editors can manage sections" ON public.custom_sections
  FOR ALL USING (
    person_id IN (
      SELECT id FROM public.persons WHERE tree_id IN (
        SELECT tree_id FROM public.tree_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- ========== INVITATIONS ==========
CREATE POLICY "Anyone can read invitation by code" ON invitations
  FOR SELECT USING (true);

CREATE POLICY "Tree admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tree_members
      WHERE tree_members.tree_id = invitations.tree_id
      AND tree_members.user_id = auth.uid()
      AND tree_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Creator can manage invitations" ON invitations
  FOR ALL USING (created_by = auth.uid());

-- ========== PERSON_CONTACTS ==========
CREATE POLICY "Tree members can view public contacts" ON public.person_contacts
  FOR SELECT USING (
    privacy = 'public'
    OR (
      privacy IN ('tree_members', 'close_relatives', 'private')
      AND person_id IN (
        SELECT persons.id FROM public.persons
        WHERE persons.tree_id IN (
          SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Tree members can insert contacts" ON public.person_contacts
  FOR INSERT WITH CHECK (
    person_id IN (
      SELECT persons.id FROM public.persons
      WHERE persons.tree_id IN (
        SELECT tree_id FROM public.tree_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Tree members can update contacts" ON public.person_contacts
  FOR UPDATE USING (
    person_id IN (
      SELECT persons.id FROM public.persons
      WHERE persons.tree_id IN (
        SELECT tree_id FROM public.tree_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Tree members can delete contacts" ON public.person_contacts
  FOR DELETE USING (
    person_id IN (
      SELECT persons.id FROM public.persons
      WHERE persons.tree_id IN (
        SELECT tree_id FROM public.tree_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- ========== CUSTOM_SECTION_FILES ==========
CREATE POLICY "Tree members can view section files" ON public.custom_section_files
  FOR SELECT USING (
    section_id IN (
      SELECT cs.id FROM public.custom_sections cs
      JOIN public.persons p ON cs.person_id = p.id
      WHERE p.tree_id IN (
        SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tree editors can manage section files" ON public.custom_section_files
  FOR ALL USING (
    section_id IN (
      SELECT cs.id FROM public.custom_sections cs
      JOIN public.persons p ON cs.person_id = p.id
      WHERE p.tree_id IN (
        SELECT tree_id FROM public.tree_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- ========== NOTIFICATIONS ==========
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- ========== REFERRAL_STATS ==========
CREATE POLICY "Users can view own referral stats" ON referral_stats
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage referral stats" ON referral_stats
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- PART 7: TRIGGERS AND FUNCTIONS
-- ============================================

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trees_updated_at BEFORE UPDATE ON public.trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER persons_updated_at BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER custom_sections_updated_at BEFORE UPDATE ON public.custom_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER person_contacts_updated_at BEFORE UPDATE ON public.person_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    substr(md5(random()::text), 1, 8)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to notify tree members when someone adds a person
CREATE OR REPLACE FUNCTION notify_tree_members_on_person_add()
RETURNS TRIGGER AS $$
DECLARE
  v_tree_name TEXT;
  v_creator_email TEXT;
  v_person_name TEXT;
  v_member_record RECORD;
BEGIN
  SELECT name INTO v_tree_name FROM public.trees WHERE id = NEW.tree_id;
  SELECT email INTO v_creator_email FROM auth.users WHERE id = NEW.created_by;
  v_person_name := COALESCE(NEW.first_name || ' ' || COALESCE(NEW.last_name, ''), NEW.first_name);

  FOR v_member_record IN
    SELECT user_id FROM public.tree_members
    WHERE tree_id = NEW.tree_id AND user_id != NEW.created_by
  LOOP
    PERFORM create_notification(
      v_member_record.user_id,
      'new_relative',
      'Новый родственник добавлен',
      v_creator_email || ' добавил(а) ' || v_person_name || ' в дерево "' || v_tree_name || '"',
      jsonb_build_object('tree_id', NEW.tree_id, 'person_id', NEW.id)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_person_add
  AFTER INSERT ON public.persons
  FOR EACH ROW
  EXECUTE FUNCTION notify_tree_members_on_person_add();

-- Function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

CREATE TRIGGER on_invitation_used
  AFTER UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION track_family_invitation();

-- ============================================
-- PART 8: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trees_owner_id ON public.trees(owner_id);
CREATE INDEX IF NOT EXISTS idx_tree_members_tree_id ON public.tree_members(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_members_user_id ON public.tree_members(user_id);
CREATE INDEX IF NOT EXISTS idx_persons_tree_id ON public.persons(tree_id);
CREATE INDEX IF NOT EXISTS idx_persons_linked_user_id ON public.persons(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_relations_tree_id ON public.relations(tree_id);
CREATE INDEX IF NOT EXISTS idx_relations_person1_id ON public.relations(person1_id);
CREATE INDEX IF NOT EXISTS idx_relations_person2_id ON public.relations(person2_id);
CREATE INDEX IF NOT EXISTS idx_photos_person_id ON public.photos(person_id);
CREATE INDEX IF NOT EXISTS idx_documents_person_id ON public.documents(person_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_invite_code ON public.invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_tree_id ON public.invitations(tree_id);
CREATE INDEX IF NOT EXISTS idx_person_contacts_person_id ON public.person_contacts(person_id);
CREATE INDEX IF NOT EXISTS idx_person_contacts_type ON public.person_contacts(type);
CREATE INDEX IF NOT EXISTS idx_custom_section_files_section_id ON public.custom_section_files(section_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- ============================================
-- PART 9: STORAGE (run separately if needed)
-- ============================================

-- Create storage bucket for photos
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('photos', 'photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies would go here

-- ============================================
-- END OF SCHEMA
-- ============================================
