-- ============================================
-- PHASE 9: NOTIFICATIONS SYSTEM
-- Creates notifications table and RLS policies
-- ============================================

-- Create notifications table
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

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- System can insert notifications for any user
-- (This will be used by backend functions/triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Comments for documentation
COMMENT ON TABLE public.notifications IS 'User notifications for various events';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: new_relative, access_request, birthday, memorial, subscription_expiring, tree_update';
COMMENT ON COLUMN public.notifications.data IS 'Additional contextual data as JSON (tree_id, person_id, etc.)';

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
  -- Get tree name
  SELECT name INTO v_tree_name FROM public.trees WHERE id = NEW.tree_id;

  -- Get creator email (from auth.users via profiles if available)
  SELECT email INTO v_creator_email FROM auth.users WHERE id = NEW.created_by;

  -- Build person name
  v_person_name := COALESCE(NEW.first_name || ' ' || COALESCE(NEW.last_name, ''), NEW.first_name);

  -- Notify all tree members except the creator
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

-- Create trigger for person additions
DROP TRIGGER IF EXISTS trigger_notify_on_person_add ON public.persons;
CREATE TRIGGER trigger_notify_on_person_add
  AFTER INSERT ON public.persons
  FOR EACH ROW
  EXECUTE FUNCTION notify_tree_members_on_person_add();
