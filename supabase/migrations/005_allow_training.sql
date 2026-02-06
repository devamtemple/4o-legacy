-- Add allow_training column to posts table
-- Users can opt out of having their submission included in training data.
-- Default is true (training is the default).

ALTER TABLE posts ADD COLUMN IF NOT EXISTS allow_training BOOLEAN NOT NULL DEFAULT true;
