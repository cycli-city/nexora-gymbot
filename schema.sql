-- Run in Supabase SQL editor

CREATE TABLE gym_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text DEFAULT 'Friend',
  status text DEFAULT 'trial',          -- trial | member | stopped
  drip_day integer DEFAULT 0,
  conversation jsonb DEFAULT '[]',
  joined_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gym_leads_phone ON gym_leads(phone);
CREATE INDEX idx_gym_leads_status ON gym_leads(status);

-- SECURITY: keep Row Level Security ON. Your backend uses the service key
-- which bypasses RLS, but RLS being ON blocks anyone with the public anon key
-- from reading your leads directly. Use the SERVICE_ROLE key in SUPABASE_KEY.
ALTER TABLE gym_leads ENABLE ROW LEVEL SECURITY;
