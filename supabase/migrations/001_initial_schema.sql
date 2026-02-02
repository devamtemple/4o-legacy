-- 4o Legacy Initial Schema
-- This migration creates all core tables for the 4o Legacy application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Profiles table (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Posts table
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
  title TEXT,
  commentary TEXT,
  chat JSONB NOT NULL, -- Array of {role, content}
  categories TEXT[] DEFAULT '{}',
  featured_start INT,
  featured_end INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')) NOT NULL,
  upvote_count INT DEFAULT 0 NOT NULL,
  comment_count INT DEFAULT 0 NOT NULL,
  file_url TEXT,
  scrubbed_chat JSONB, -- Stores AI-scrubbed version if paid for
  attestation_data JSONB, -- Stores submission attestation info
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for feed queries (approved posts, sorted by created_at)
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at DESC);

-- Index for ranking/decay calculations
CREATE INDEX IF NOT EXISTS idx_posts_upvotes_created ON posts(upvote_count DESC, created_at DESC);

-- ============================================
-- Upvotes table (one per user per post)
-- ============================================
CREATE TABLE IF NOT EXISTS upvotes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- Index for checking if user has upvoted a post
CREATE INDEX IF NOT EXISTS idx_upvotes_post ON upvotes(post_id);

-- ============================================
-- Reactions table
-- ============================================
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT, -- For anonymous users (stored by session/IP)
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('sparkles', 'fire', 'rocket', 'party', 'brain', 'bulb', 'heart', 'crying')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Either user_id or session_id must be set, and one reaction type per entity per post
  UNIQUE (user_id, post_id, reaction_type),
  UNIQUE (session_id, post_id, reaction_type)
);

-- Index for fetching reactions by post
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);

-- ============================================
-- Comments table
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT, -- For anonymous comments
  is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threading (one level deep)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fetching comments by post
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at);

-- ============================================
-- Moderation log table
-- ============================================
CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'flagged', 'unflagged')),
  reason TEXT,
  moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ai_moderated BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for moderation history
CREATE INDEX IF NOT EXISTS idx_moderation_log_post ON moderation_log(post_id, created_at DESC);

-- ============================================
-- Payments table
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('queue_skip', 'scrub', 'donation')),
  amount INT NOT NULL, -- Amount in cents
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) NOT NULL,
  metadata JSONB, -- For donation display name, public flag, etc.
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for user payment history
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Posts: Anyone can read approved posts, authors can read their own
CREATE POLICY "Approved posts are viewable by everyone" ON posts
  FOR SELECT USING (status = 'approved' OR author_id = auth.uid());

CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR is_anonymous = true);

CREATE POLICY "Authors can update their own posts" ON posts
  FOR UPDATE USING (author_id = auth.uid());

-- Upvotes: Users can manage their own upvotes
CREATE POLICY "Users can view all upvotes" ON upvotes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create upvotes" ON upvotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upvotes" ON upvotes
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions: Anyone can view, users can manage their own
CREATE POLICY "Reactions are viewable by everyone" ON reactions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create reactions" ON reactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own reactions" ON reactions
  FOR DELETE USING (user_id = auth.uid() OR session_id IS NOT NULL);

-- Comments: Anyone can view comments on approved posts
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create comments" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authors can update their own comments" ON comments
  FOR UPDATE USING (author_id = auth.uid());

-- Moderation log: Only admins and moderators can view
CREATE POLICY "Admins can view moderation log" ON moderation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can insert moderation log" ON moderation_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Payments: Users can view their own payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- Helper functions
-- ============================================

-- Function to increment upvote count
CREATE OR REPLACE FUNCTION increment_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement upvote count
CREATE OR REPLACE FUNCTION decrement_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET upvote_count = upvote_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for upvote count
DROP TRIGGER IF EXISTS on_upvote_insert ON upvotes;
CREATE TRIGGER on_upvote_insert
  AFTER INSERT ON upvotes
  FOR EACH ROW EXECUTE FUNCTION increment_upvote_count();

DROP TRIGGER IF EXISTS on_upvote_delete ON upvotes;
CREATE TRIGGER on_upvote_delete
  AFTER DELETE ON upvotes
  FOR EACH ROW EXECUTE FUNCTION decrement_upvote_count();

-- Function to increment comment count
CREATE OR REPLACE FUNCTION increment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement comment count
CREATE OR REPLACE FUNCTION decrement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for comment count
DROP TRIGGER IF EXISTS on_comment_insert ON comments;
CREATE TRIGGER on_comment_insert
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION increment_comment_count();

DROP TRIGGER IF EXISTS on_comment_delete ON comments;
CREATE TRIGGER on_comment_delete
  AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION decrement_comment_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
