# FamilyTree — Промпт для разработки

## Описание проекта

Создай веб-приложение **FamilyTree** — генеалогическое приложение для создания семейных деревьев с коллаборативным редактированием.

**Ключевая идея:** Вся семья строит дерево вместе. Один человек начинает, приглашает родственников по ссылке, и они вместе добавляют информацию.

---

## Технический стек

### Frontend
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**
- **Tailwind CSS** для стилей
- **React Flow** для визуализации дерева (или D3.js как альтернатива)
- **Zustand** для state management
- **React Hook Form + Zod** для форм и валидации

### Backend
- **Supabase** — база данных PostgreSQL + аутентификация + realtime
- **Supabase Storage** — временное хранилище для локальной разработки (позже заменим на Cloudflare R2)

### Дополнительно
- **Lucide React** — иконки
- **date-fns** — работа с датами
- **sharp** — оптимизация изображений (на сервере)

---

## Структура проекта

```
familytree/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── tree/
│   │   │   ├── [treeId]/
│   │   │   │   ├── page.tsx          # Просмотр/редактирование дерева
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx      # Настройки дерева
│   │   │   │   └── person/
│   │   │   │       └── [personId]/
│   │   │   │           └── page.tsx  # Профиль человека
│   │   │   └── new/
│   │   │       └── page.tsx          # Создание нового дерева
│   │   ├── settings/
│   │   │   └── page.tsx              # Настройки аккаунта
│   │   ├── subscription/
│   │   │   └── page.tsx              # Управление подпиской
│   │   └── layout.tsx
│   ├── invite/
│   │   └── [code]/
│   │       └── page.tsx              # Страница приглашения
│   ├── layout.tsx
│   ├── page.tsx                      # Landing page
│   └── globals.css
├── components/
│   ├── ui/                           # Базовые UI компоненты
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── Dropdown.tsx
│   │   └── Toast.tsx
│   ├── tree/                         # Компоненты дерева
│   │   ├── TreeCanvas.tsx            # Основной canvas с React Flow
│   │   ├── PersonNode.tsx            # Нода человека в дереве
│   │   ├── ConnectionEdge.tsx        # Линия связи
│   │   ├── TreeToolbar.tsx           # Панель инструментов
│   │   ├── TreeMinimap.tsx           # Мини-карта
│   │   └── TreeControls.tsx          # Зум, навигация
│   ├── person/                       # Компоненты профиля человека
│   │   ├── PersonForm.tsx            # Форма добавления/редактирования
│   │   ├── PersonCard.tsx            # Карточка человека
│   │   ├── PersonPhotos.tsx          # Галерея фото
│   │   ├── PersonDocuments.tsx       # Документы
│   │   ├── PersonTimeline.tsx        # Таймлайн событий
│   │   └── ConnectionSelector.tsx    # Выбор связи (родитель, супруг и т.д.)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthProvider.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── shared/
│       ├── FileUpload.tsx
│       ├── ImageCropper.tsx
│       ├── DatePicker.tsx
│       ├── PlacePicker.tsx           # Выбор места (город, страна)
│       └── ShareModal.tsx            # Модал шеринга
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Клиент Supabase
│   │   ├── server.ts                 # Серверный клиент
│   │   └── middleware.ts             # Middleware для auth
│   ├── store/
│   │   ├── useTreeStore.ts           # Стор дерева
│   │   ├── useAuthStore.ts           # Стор авторизации
│   │   └── useUIStore.ts             # UI состояние
│   ├── hooks/
│   │   ├── useTree.ts                # Хук работы с деревом
│   │   ├── usePerson.ts              # Хук работы с человеком
│   │   ├── useAuth.ts                # Хук авторизации
│   │   └── useSubscription.ts        # Хук подписки
│   ├── utils/
│   │   ├── dates.ts                  # Утилиты дат
│   │   ├── relations.ts              # Расчёт родственных связей
│   │   ├── tree-layout.ts            # Алгоритм расположения нод
│   │   └── validation.ts             # Схемы валидации Zod
│   └── types/
│       ├── database.ts               # Типы из Supabase
│       ├── tree.ts                   # Типы дерева
│       └── person.ts                 # Типы человека
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Начальная схема БД
├── public/
│   ├── images/
│   └── icons/
├── .env.local.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## Схема базы данных (Supabase PostgreSQL)

```sql
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
  birth_place_coords POINT,
  death_place TEXT,
  current_location TEXT,
  current_location_coords POINT,
  
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

CREATE POLICY "Tree members can view tree" ON public.trees
  FOR SELECT USING (
    id IN (SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid())
    OR is_public = TRUE
  );

CREATE POLICY "Tree members can view persons" ON public.persons
  FOR SELECT USING (
    tree_id IN (SELECT tree_id FROM public.tree_members WHERE user_id = auth.uid())
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
```

---

## Функционал для MVP

### 1. Аутентификация
- Регистрация по email + пароль
- Вход
- Восстановление пароля
- Выход

### 2. Создание дерева
- Форма создания (название, описание)
- Автоматическое добавление создателя как владельца

### 3. Добавление человека
- Форма с полями:
  - Имя, фамилия, отчество (обязательно только имя)
  - Пол
  - Дата рождения (с опцией "примерно")
  - Место рождения
  - Жив/умер + дата смерти
  - Фото (загрузка)
  - Биография
- Сохранение в БД

### 4. Связи между людьми
- При добавлении человека — выбор связи:
  - Родитель → Ребёнок
  - Супруг ↔ Супруг
- Автоматическое определение братьев/сестёр по общим родителям

### 5. Визуализация дерева
- Canvas с React Flow
- Ноды — карточки людей (фото, имя, годы жизни)
- Линии связей (разные стили для родителей и супругов)
- Drag & drop для перемещения
- Зум и pan
- Клик на ноду → открытие профиля

### 6. Профиль человека
- Просмотр всей информации
- Редактирование (для тех кто имеет права)
- Галерея фото
- Список связей

### 7. Шеринг
- Генерация ссылки-приглашения
- Страница приглашения
- Выбор роли при приглашении

### 8. Настройки аккаунта
- Изменение имени, аватара
- Просмотр использованного места

---

## Инструкции по запуску

### 1. Инициализация проекта

```bash
npx create-next-app@latest familytree --typescript --tailwind --eslint --app --src-dir=false
cd familytree
```

### 2. Установка зависимостей

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install reactflow
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install lucide-react
npm install date-fns
npm install clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-avatar
```

### 3. Настройка Supabase

1. Создай проект на https://supabase.com
2. Скопируй URL и anon key
3. Создай `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

4. Выполни SQL миграции в Supabase SQL Editor

### 4. Запуск

```bash
npm run dev
```

---

## Дизайн

### Цветовая схема
- Primary: зелёный (#2E7D32, #4CAF50, #81C784)
- Background: светло-серый (#F5F5F5)
- Cards: белый
- Text: тёмно-серый (#212121)
- Accent: голубой для связей (#2196F3)

### Стиль
- Чистый, минималистичный
- Много воздуха
- Скруглённые углы (rounded-lg, rounded-xl)
- Лёгкие тени (shadow-sm, shadow-md)
- Плавные анимации

### Адаптивность
- Mobile-first
- Дерево на мобильном — вертикальный скролл или упрощённый список

---

## Важные моменты

1. **Начни с аутентификации** — без неё ничего не работает
2. **Потом схема БД** — создай все таблицы в Supabase
3. **Потом базовый CRUD** — создание дерева, добавление людей
4. **Потом визуализация** — React Flow
5. **В конце шеринг** — когда основное работает

## Что НЕ делать в MVP

- Оплата (потом)
- Загрузка документов и аудио (потом)
- Карта родственников (потом)
- Поиск по архивам (потом)
- Транскрипция аудио (потом)
- Уведомления (потом)

---

## Начни с этого

1. Создай проект Next.js
2. Настрой Supabase клиент
3. Сделай страницу логина/регистрации
4. Сделай страницу создания дерева
5. Сделай страницу дерева с возможностью добавить первого человека
6. Добавь React Flow для визуализации

Поехали!
