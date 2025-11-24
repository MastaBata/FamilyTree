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
  linked_person_id UUID, -- К какому человеку в дереве привязан
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

-- Связи между людьми
CREATE TABLE public.relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES public.trees(id) ON DELETE CASCADE,

  person1_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  person2_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,

  relation_type TEXT NOT NULL, -- parent_child, spouse, sibling, adopted

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

  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',

  invited_by UUID REFERENCES public.profiles(id),
  invited_email TEXT,

  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMPTZ,

  expires_at TIMESTAMPTZ,
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

-- Row Level Security
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

-- Policies (примеры базовых политик)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Tree members can view tree" ON public.trees
  FOR SELECT USING (
    id IN (SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid())
    OR is_public = TRUE
  );

CREATE POLICY "Tree owners can update tree" ON public.trees
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create trees" ON public.trees
  FOR INSERT WITH CHECK (owner_id = auth.uid());

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

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Индексы для производительности
CREATE INDEX idx_trees_owner_id ON public.trees(owner_id);
CREATE INDEX idx_tree_members_tree_id ON public.tree_members(tree_id);
CREATE INDEX idx_tree_members_user_id ON public.tree_members(user_id);
CREATE INDEX idx_persons_tree_id ON public.persons(tree_id);
CREATE INDEX idx_persons_linked_user_id ON public.persons(linked_user_id);
CREATE INDEX idx_relations_tree_id ON public.relations(tree_id);
CREATE INDEX idx_relations_person1_id ON public.relations(person1_id);
CREATE INDEX idx_relations_person2_id ON public.relations(person2_id);
CREATE INDEX idx_photos_person_id ON public.photos(person_id);
CREATE INDEX idx_documents_person_id ON public.documents(person_id);
CREATE INDEX idx_invitations_code ON public.invitations(code);
CREATE INDEX idx_invitations_tree_id ON public.invitations(tree_id);
