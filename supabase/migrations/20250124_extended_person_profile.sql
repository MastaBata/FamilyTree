-- ============================================
-- PHASE 4: EXTENDED PERSON PROFILE
-- Adds additional fields for richer person profiles
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

-- Enable RLS on new tables
ALTER TABLE public.person_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_section_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for person_contacts
-- Tree members can view contacts based on privacy settings
CREATE POLICY "Tree members can view public contacts"
ON public.person_contacts
FOR SELECT
USING (
  privacy = 'public'
  OR (
    privacy IN ('tree_members', 'close_relatives', 'private')
    AND person_id IN (
      SELECT persons.id
      FROM public.persons
      WHERE persons.tree_id IN (
        SELECT tree_id
        FROM public.tree_members
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Tree members can add contacts to persons in their trees
CREATE POLICY "Tree members can insert contacts"
ON public.person_contacts
FOR INSERT
WITH CHECK (
  person_id IN (
    SELECT persons.id
    FROM public.persons
    WHERE persons.tree_id IN (
      SELECT tree_id
      FROM public.tree_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  )
);

-- Tree members can update contacts
CREATE POLICY "Tree members can update contacts"
ON public.person_contacts
FOR UPDATE
USING (
  person_id IN (
    SELECT persons.id
    FROM public.persons
    WHERE persons.tree_id IN (
      SELECT tree_id
      FROM public.tree_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  )
);

-- Tree members can delete contacts
CREATE POLICY "Tree members can delete contacts"
ON public.person_contacts
FOR DELETE
USING (
  person_id IN (
    SELECT persons.id
    FROM public.persons
    WHERE persons.tree_id IN (
      SELECT tree_id
      FROM public.tree_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  )
);

-- RLS Policies for custom_section_files
-- Same as custom_sections - tree members can view
CREATE POLICY "Tree members can view section files"
ON public.custom_section_files
FOR SELECT
USING (
  section_id IN (
    SELECT cs.id
    FROM public.custom_sections cs
    JOIN public.persons p ON cs.person_id = p.id
    WHERE p.tree_id IN (
      SELECT tree_id
      FROM public.tree_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Tree members with edit rights can manage section files
CREATE POLICY "Tree editors can manage section files"
ON public.custom_section_files
FOR ALL
USING (
  section_id IN (
    SELECT cs.id
    FROM public.custom_sections cs
    JOIN public.persons p ON cs.person_id = p.id
    WHERE p.tree_id IN (
      SELECT tree_id
      FROM public.tree_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  )
);

-- Triggers for updated_at
CREATE TRIGGER person_contacts_updated_at
  BEFORE UPDATE ON public.person_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_person_contacts_person_id ON public.person_contacts(person_id);
CREATE INDEX IF NOT EXISTS idx_person_contacts_type ON public.person_contacts(type);
CREATE INDEX IF NOT EXISTS idx_custom_section_files_section_id ON public.custom_section_files(section_id);

-- Comments for documentation
COMMENT ON TABLE public.person_contacts IS 'Contact information for persons with privacy settings';
COMMENT ON TABLE public.custom_section_files IS 'Files attached to custom sections in person profiles';
COMMENT ON COLUMN public.persons.nickname IS 'Nickname or alternative name';
COMMENT ON COLUMN public.persons.education IS 'Educational background';
COMMENT ON COLUMN public.persons.military_service IS 'Military service information';
COMMENT ON COLUMN public.persons.awards IS 'Awards and honors received';
COMMENT ON COLUMN public.persons.hobbies IS 'Hobbies and interests';
COMMENT ON COLUMN public.persons.interesting_facts IS 'Interesting facts about the person';
COMMENT ON COLUMN public.persons.cause_of_death IS 'Cause of death (if deceased)';
COMMENT ON COLUMN public.persons.burial_place IS 'Place of burial';
COMMENT ON COLUMN public.persons.external_links IS 'External links (Wikipedia, social media, etc.) as JSON array';
