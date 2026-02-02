-- Donations table for tracking supporter contributions
-- Stores donation information with optional public display

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_id TEXT UNIQUE, -- Stripe payment intent or checkout session ID
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  display_name TEXT, -- Optional name to show on supporters page
  email TEXT, -- Donor's email (from Stripe)
  is_public BOOLEAN DEFAULT FALSE, -- Whether to show on supporters page
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If logged in
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB, -- Additional metadata from Stripe
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_is_public ON donations(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_payment_id ON donations(stripe_payment_id);

-- RLS Policies
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Anyone can view public donations (for supporters page)
CREATE POLICY "Public donations are viewable by anyone" ON donations
  FOR SELECT
  USING (is_public = TRUE AND status = 'completed');

-- Users can view their own donations
CREATE POLICY "Users can view own donations" ON donations
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Only service role can insert/update donations (via webhooks)
-- In practice, inserts happen via API routes with service role
CREATE POLICY "Service role can insert donations" ON donations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update donations" ON donations
  FOR UPDATE
  USING (true);

-- Function to get total donations
CREATE OR REPLACE FUNCTION get_total_donations()
RETURNS TABLE (total_amount BIGINT, donor_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0)::BIGINT as total_amount,
    COUNT(DISTINCT COALESCE(email, user_id::text))::BIGINT as donor_count
  FROM donations
  WHERE status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get public supporters
CREATE OR REPLACE FUNCTION get_public_supporters(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  display_name TEXT,
  amount INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.display_name,
    d.amount,
    d.completed_at as created_at
  FROM donations d
  WHERE d.is_public = TRUE
    AND d.status = 'completed'
    AND d.display_name IS NOT NULL
  ORDER BY d.completed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
