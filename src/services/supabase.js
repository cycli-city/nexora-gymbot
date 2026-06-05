const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Supabase client uses parameterized queries under the hood — SQL injection safe.
// We never build raw SQL strings anywhere in this codebase.
const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: { persistSession: false },
});

const getOrCreateLead = async (phone) => {
  const { data } = await supabase
    .from('gym_leads')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (data) return data;

  const { data: created, error } = await supabase
    .from('gym_leads')
    .insert([{ phone, name: 'Friend', status: 'trial', drip_day: 0, conversation: [] }])
    .select()
    .single();

  if (error) console.error('Insert error:', error.message);
  return created;
};

const updateConversation = async (phone, conversation) => {
  await supabase
    .from('gym_leads')
    .update({ conversation, last_message_at: new Date().toISOString() })
    .eq('phone', phone);
};

const setStatus = async (phone, status) => {
  await supabase.from('gym_leads').update({ status }).eq('phone', phone);
};

const setName = async (phone, name) => {
  await supabase.from('gym_leads').update({ name }).eq('phone', phone);
};

const getTrialLeads = async () => {
  const { data } = await supabase.from('gym_leads').select('*').eq('status', 'trial');
  return data || [];
};

const updateDripDay = async (phone, day) => {
  await supabase.from('gym_leads').update({ drip_day: day }).eq('phone', phone);
};

const listLeads = async () => {
  const { data } = await supabase
    .from('gym_leads')
    .select('phone, name, status, drip_day, joined_at, last_message_at')
    .order('joined_at', { ascending: false })
    .limit(500);
  return data || [];
};

module.exports = {
  getOrCreateLead,
  updateConversation,
  setStatus,
  setName,
  getTrialLeads,
  updateDripDay,
  listLeads,
};
