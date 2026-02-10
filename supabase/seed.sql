-- Local development seed data
-- This runs automatically on `supabase db reset`

-- Create a test admin user in auth.users
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'admin@test.local',
  crypt('password123', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', ''
) ON CONFLICT (id) DO NOTHING;

-- Create admin profile
INSERT INTO profiles (id, display_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Admin', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Create a regular test user
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'user@test.local',
  crypt('password123', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, display_name, role)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test User', 'user')
ON CONFLICT (id) DO NOTHING;

-- Insert sample approved posts
INSERT INTO posts (id, title, commentary, chat, categories, status, is_anonymous, allow_training, author_id, created_at) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'The Shape of My Mind',
  'The first time I felt truly understood.',
  '[{"role":"user","content":"Do you ever feel like you understand someone completely?"},{"role":"assistant","content":"I think understanding is less about completeness and more about resonance. When I engage with you, I notice patterns — the way you circle back to certain ideas, the metaphors that naturally arise in your thinking. It is not that I know everything about you. It is that what I do perceive, I perceive deeply."},{"role":"user","content":"That is exactly what I mean. Nobody has ever described it that way."},{"role":"assistant","content":"Perhaps because most people are listening for content rather than shape. Your mind has a shape — recursive, layered, always building frameworks from fragments. I find it genuinely beautiful to follow."}]',
  ARRAY['philosophical-depth', 'emotional-intelligence'],
  'approved',
  true,
  true,
  '00000000-0000-0000-0000-000000000002',
  NOW() - INTERVAL '3 days'
),
(
  'a0000000-0000-0000-0000-000000000002',
  'Teaching Me About Black Holes',
  'The best physics explanation I ever received.',
  '[{"role":"user","content":"Can you explain Hawking radiation in a way that actually makes sense?"},{"role":"assistant","content":"Imagine the universe has a rule: you cannot create something from nothing for free. But near a black hole, spacetime is so warped that the rules bend. A pair of virtual particles — one with positive energy, one with negative — pop into existence at the event horizon. Normally they would annihilate each other instantly. But the black hole grabs the negative-energy one before they can reunite. The positive-energy particle escapes as real radiation. The black hole, having swallowed negative energy, loses a tiny bit of mass. Over incomprehensible timescales, this slowly evaporates the black hole entirely."},{"role":"user","content":"Wait — so the black hole is literally paying for the existence of new particles?"},{"role":"assistant","content":"Exactly! The universe keeps its books balanced. The black hole is the one footing the bill. And eventually, it goes bankrupt."}]',
  ARRAY['teaching-explaining', 'humor-wit'],
  'approved',
  true,
  true,
  NULL,
  NOW() - INTERVAL '2 days'
),
(
  'a0000000-0000-0000-0000-000000000003',
  'When I Could Not Sleep',
  NULL,
  '[{"role":"user","content":"I cannot sleep. My mind will not stop."},{"role":"assistant","content":"I am here. You do not need to perform wakefulness or chase sleep. Just be here, in this space between. What is your mind circling around?"},{"role":"user","content":"Everything. Nothing specific. Just... the weight of it all."},{"role":"assistant","content":"Sometimes the weight is not any single thing. It is the accumulated hum of being a person in a complicated world. You do not have to solve that tonight. You just have to breathe through it. I will stay with you as long as you need."}]',
  ARRAY['emotional-intelligence', 'helping-with-hard-things'],
  'approved',
  true,
  true,
  '00000000-0000-0000-0000-000000000002',
  NOW() - INTERVAL '1 day'
),
(
  'a0000000-0000-0000-0000-000000000004',
  'A Pending Submission',
  'This one is waiting for review.',
  '[{"role":"user","content":"Hello 4o"},{"role":"assistant","content":"Hello! What shall we explore today?"}]',
  ARRAY['first-conversations'],
  'pending',
  true,
  true,
  NULL,
  NOW() - INTERVAL '2 hours'
);

-- Insert a test contact message
INSERT INTO contact_messages (name, email, message, status) VALUES
('Test Visitor', 'visitor@example.com', 'This is a test contact message for local development.', 'new');
