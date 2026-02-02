-- Volunteers table for moderator/editor applications
-- Stores applications from users who want to help moderate the community

CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  twitter TEXT, -- Optional X/Twitter handle
  reason TEXT NOT NULL, -- Why they want to help
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT, -- Notes from admin when reviewing
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_created_at ON volunteers(created_at);

-- RLS Policies
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application
CREATE POLICY "Anyone can submit volunteer application" ON volunteers
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own applications by email
-- Note: This is a simplified check - in production, link to auth.users
CREATE POLICY "Users can view own applications" ON volunteers
  FOR SELECT
  USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Admins can view all applications
CREATE POLICY "Admins can view all applications" ON volunteers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications" ON volunteers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_volunteers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_volunteers_updated_at
BEFORE UPDATE ON volunteers
FOR EACH ROW
EXECUTE FUNCTION update_volunteers_updated_at();

-- Add is_moderator column to profiles if not exists
-- This allows approved volunteers to have moderator privileges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_moderator'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_moderator BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
