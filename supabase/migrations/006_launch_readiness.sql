-- Launch readiness: add columns for privacy, dedications, content warnings,
-- AI moderation results, and display name overrides.
-- Note: scrubbed_chat JSONB already exists from 001_initial_schema.sql.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS dedication TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_warnings TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_moderation_result JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS display_name_override TEXT;

-- Index for feed queries (exclude private posts)
CREATE INDEX IF NOT EXISTS idx_posts_private ON posts (is_private) WHERE is_private = FALSE;

-- Index for admin queue (pending + flagged posts needing review)
CREATE INDEX IF NOT EXISTS idx_posts_moderation ON posts (status, ai_confidence) WHERE status IN ('pending', 'flagged');
