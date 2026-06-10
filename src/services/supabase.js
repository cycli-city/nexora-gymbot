const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: { persistSession: false },
});

const getOrCreateLead = async (phone, name = null) => {
  const { data } = await supabase
    .from('gym_leads')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (data) return data;

  const { data: created, error } = await supabase
    .from('gym_leads')
    .insert([{
      phone,
      name: name || 'Friend',
      status: 'trial',
      drip_day: 0,
      conversation: [],
    }])
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
    .select('*')
    .order('joined_at', { ascending: false })
    .limit(500);
  return data || [];
};

// ═══ MEMBERSHIP FUNCTIONS ═══

const addMember = async ({ phone, name, plan, membership_start, membership_end }) => {
  // upsert — works whether the lead already exists or not
  const { data, error } = await supabase
    .from('gym_leads')
    .upsert([{
      phone,
      name,
      status: 'member',
      plan,
      membership_start,
      membership_end,
      drip_day: 0,
      reminder_day: 0,
      joined_at: new Date().toISOString(),
    }], { onConflict: 'phone' })
    .select()
    .single();

  if (error) console.error('addMember error:', error.message);
  return data;
};

const addTrial = async ({ phone, name }) => {
  const { data, error } = await supabase
    .from('gym_leads')
    .upsert([{
      phone,
      name,
      status: 'trial',
      drip_day: 0,
      conversation: [],
      joined_at: new Date().toISOString(),
    }], { onConflict: 'phone' })
    .select()
    .single();

  if (error) console.error('addTrial error:', error.message);
  return data;
};

// Get all active members
const getActiveMembers = async () => {
  const { data } = await supabase
    .from('gym_leads')
    .select('*')
    .eq('status', 'member');
  return data || [];
};

const updateReminderDay = async (phone, day) => {
  await supabase.from('gym_leads').update({ reminder_day: day }).eq('phone', phone);
};

const removeLead = async (phone) => {
  await supabase.from('gym_leads').delete().eq('phone', phone);
};

module.exports = {
  getOrCreateLead,
  updateConversation,
  setStatus,
  setName,
  getTrialLeads,
  updateDripDay,
  listLeads,
  addMember,
  addTrial,
  getActiveMembers,
  updateReminderDay,
  removeLead,
};
