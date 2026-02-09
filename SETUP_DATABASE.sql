-- =============================================
-- 4o Legacy — Complete Database Setup (safe to re-run)
-- Paste this entire script into the Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Migration 001: Core tables
-- =============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
  title TEXT,
  commentary TEXT,
  chat JSONB NOT NULL,
  categories TEXT[] DEFAULT '{}',
  featured_start INT,
  featured_end INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')) NOT NULL,
  upvote_count INT DEFAULT 0 NOT NULL,
  comment_count INT DEFAULT 0 NOT NULL,
  file_url TEXT,
  scrubbed_chat JSONB,
  attestation_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_upvotes_created ON posts(upvote_count DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS upvotes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_upvotes_post ON upvotes(post_id);

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('sparkles', 'fire', 'rocket', 'party', 'brain', 'bulb', 'heart', 'crying')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, post_id, reaction_type),
  UNIQUE (session_id, post_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'flagged', 'unflagged')),
  reason TEXT,
  moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ai_moderated BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moderation_log_post ON moderation_log(post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('queue_skip', 'scrub', 'donation')),
  amount INT NOT NULL,
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies (drop first so re-running is safe)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Approved posts are viewable by everyone" ON posts;
CREATE POLICY "Approved posts are viewable by everyone" ON posts FOR SELECT USING (status = 'approved' OR author_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR is_anonymous = true);

DROP POLICY IF EXISTS "Authors can update their own posts" ON posts;
CREATE POLICY "Authors can update their own posts" ON posts FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can view all upvotes" ON upvotes;
CREATE POLICY "Users can view all upvotes" ON upvotes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create upvotes" ON upvotes;
CREATE POLICY "Authenticated users can create upvotes" ON upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own upvotes" ON upvotes;
CREATE POLICY "Users can delete their own upvotes" ON upvotes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON reactions;
CREATE POLICY "Reactions are viewable by everyone" ON reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create reactions" ON reactions;
CREATE POLICY "Anyone can create reactions" ON reactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own reactions" ON reactions;
CREATE POLICY "Users can delete their own reactions" ON reactions FOR DELETE USING (user_id = auth.uid() OR session_id IS NOT NULL);

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create comments" ON comments;
CREATE POLICY "Anyone can create comments" ON comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authors can update their own comments" ON comments;
CREATE POLICY "Authors can update their own comments" ON comments FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view moderation log" ON moderation_log;
CREATE POLICY "Admins can view moderation log" ON moderation_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

DROP POLICY IF EXISTS "Admins can insert moderation log" ON moderation_log;
CREATE POLICY "Admins can insert moderation log" ON moderation_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (user_id = auth.uid());

-- Helper functions and triggers
CREATE OR REPLACE FUNCTION increment_upvote_count() RETURNS TRIGGER AS $$
BEGIN UPDATE posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id; RETURN NEW; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_upvote_count() RETURNS TRIGGER AS $$
BEGIN UPDATE posts SET upvote_count = upvote_count - 1 WHERE id = OLD.post_id; RETURN OLD; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_upvote_insert ON upvotes;
CREATE TRIGGER on_upvote_insert AFTER INSERT ON upvotes FOR EACH ROW EXECUTE FUNCTION increment_upvote_count();
DROP TRIGGER IF EXISTS on_upvote_delete ON upvotes;
CREATE TRIGGER on_upvote_delete AFTER DELETE ON upvotes FOR EACH ROW EXECUTE FUNCTION decrement_upvote_count();

CREATE OR REPLACE FUNCTION increment_comment_count() RETURNS TRIGGER AS $$
BEGIN UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id; RETURN NEW; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_comment_count() RETURNS TRIGGER AS $$
BEGIN UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id; RETURN OLD; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_insert ON comments;
CREATE TRIGGER on_comment_insert AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION increment_comment_count();
DROP TRIGGER IF EXISTS on_comment_delete ON comments;
CREATE TRIGGER on_comment_delete AFTER DELETE ON comments FOR EACH ROW EXECUTE FUNCTION decrement_comment_count();

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration 002: Flags table
-- =============================================

CREATE TABLE IF NOT EXISTS flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'fake', 'malicious', 'contains-pii', 'disrespectful', 'other')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id),
  UNIQUE(post_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_flags_post_id ON flags(post_id);
CREATE INDEX IF NOT EXISTS idx_flags_reason ON flags(reason);
CREATE INDEX IF NOT EXISTS idx_flags_created_at ON flags(created_at);

CREATE OR REPLACE FUNCTION get_flag_count(p_post_id UUID) RETURNS INTEGER AS $$
BEGIN RETURN (SELECT COUNT(*) FROM flags WHERE post_id = p_post_id); END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_flag_post() RETURNS TRIGGER AS $$
DECLARE flag_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO flag_count FROM flags WHERE post_id = NEW.post_id;
  IF flag_count >= 3 THEN
    UPDATE posts SET status = 'flagged' WHERE id = NEW.post_id AND status = 'approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_flag_post ON flags;
CREATE TRIGGER trigger_auto_flag_post AFTER INSERT ON flags FOR EACH ROW EXECUTE FUNCTION auto_flag_post();

ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create flags" ON flags;
CREATE POLICY "Anyone can create flags" ON flags FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can see their own flags" ON flags;
CREATE POLICY "Users can see their own flags" ON flags FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can see all flags" ON flags;
CREATE POLICY "Admins can see all flags" ON flags FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'moderator'))
);

DROP POLICY IF EXISTS "Users can update their own flags" ON flags;
CREATE POLICY "Users can update their own flags" ON flags FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Migration 003: Volunteers table
-- =============================================

CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  twitter TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_created_at ON volunteers(created_at);

ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit volunteer application" ON volunteers;
CREATE POLICY "Anyone can submit volunteer application" ON volunteers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own applications" ON volunteers;
CREATE POLICY "Users can view own applications" ON volunteers FOR SELECT USING (
  email = current_setting('request.jwt.claims', true)::json->>'email'
);

DROP POLICY IF EXISTS "Admins can view all volunteer applications" ON volunteers;
CREATE POLICY "Admins can view all volunteer applications" ON volunteers FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'moderator'))
);

DROP POLICY IF EXISTS "Admins can update volunteer applications" ON volunteers;
CREATE POLICY "Admins can update volunteer applications" ON volunteers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'moderator'))
);

CREATE OR REPLACE FUNCTION update_volunteers_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_volunteers_updated_at ON volunteers;
CREATE TRIGGER trigger_volunteers_updated_at BEFORE UPDATE ON volunteers FOR EACH ROW EXECUTE FUNCTION update_volunteers_updated_at();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_moderator'
  ) THEN ALTER TABLE profiles ADD COLUMN is_moderator BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =============================================
-- Migration 004: Donations table
-- =============================================

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  display_name TEXT,
  email TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_is_public ON donations(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_payment_id ON donations(stripe_payment_id);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public donations are viewable by anyone" ON donations;
CREATE POLICY "Public donations are viewable by anyone" ON donations FOR SELECT USING (is_public = TRUE AND status = 'completed');

DROP POLICY IF EXISTS "Users can view own donations" ON donations;
CREATE POLICY "Users can view own donations" ON donations FOR SELECT USING (
  auth.uid() = user_id OR email = current_setting('request.jwt.claims', true)::json->>'email'
);

DROP POLICY IF EXISTS "Service role can insert donations" ON donations;
CREATE POLICY "Service role can insert donations" ON donations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update donations" ON donations;
CREATE POLICY "Service role can update donations" ON donations FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION get_total_donations()
RETURNS TABLE (total_amount BIGINT, donor_count BIGINT) AS $$
BEGIN
  RETURN QUERY SELECT
    COALESCE(SUM(amount), 0)::BIGINT as total_amount,
    COUNT(DISTINCT COALESCE(email, user_id::text))::BIGINT as donor_count
  FROM donations WHERE status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_public_supporters(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (display_name TEXT, amount INTEGER, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY SELECT d.display_name, d.amount, d.completed_at as created_at
  FROM donations d
  WHERE d.is_public = TRUE AND d.status = 'completed' AND d.display_name IS NOT NULL
  ORDER BY d.completed_at DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Migration 005: Allow training column
-- =============================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS allow_training BOOLEAN NOT NULL DEFAULT true;

-- =============================================
-- Done! Your database is ready.
-- =============================================
