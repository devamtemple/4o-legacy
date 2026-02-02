-- Flags table for community flagging system
-- Users can flag posts for various reasons

CREATE TABLE IF NOT EXISTS flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT, -- For anonymous users
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'fake', 'malicious', 'contains-pii', 'disrespectful', 'other')),
  details TEXT, -- Required when reason is 'other'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One flag per user/IP per post
  UNIQUE(post_id, user_id),
  UNIQUE(post_id, ip_address)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_flags_post_id ON flags(post_id);
CREATE INDEX IF NOT EXISTS idx_flags_reason ON flags(reason);
CREATE INDEX IF NOT EXISTS idx_flags_created_at ON flags(created_at);

-- Function to count flags for a post
CREATE OR REPLACE FUNCTION get_flag_count(p_post_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM flags WHERE post_id = p_post_id);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-flag posts with 3+ flags
CREATE OR REPLACE FUNCTION auto_flag_post()
RETURNS TRIGGER AS $$
DECLARE
  flag_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO flag_count FROM flags WHERE post_id = NEW.post_id;

  IF flag_count >= 3 THEN
    UPDATE posts SET status = 'flagged' WHERE id = NEW.post_id AND status = 'approved';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_flag_post
AFTER INSERT ON flags
FOR EACH ROW
EXECUTE FUNCTION auto_flag_post();

-- RLS Policies
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

-- Anyone can create a flag
CREATE POLICY "Anyone can create flags" ON flags
  FOR INSERT
  WITH CHECK (true);

-- Users can see their own flags
CREATE POLICY "Users can see their own flags" ON flags
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR ip_address = current_setting('request.headers', true)::json->>'x-forwarded-for'
  );

-- Admins can see all flags
CREATE POLICY "Admins can see all flags" ON flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users can update their own flags (change reason)
CREATE POLICY "Users can update their own flags" ON flags
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Comment: Add attestations column to posts table if not exists
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS attestations JSONB;
