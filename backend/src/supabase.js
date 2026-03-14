const { createClient } = require('@supabase/supabase-js');

let client;

function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('supabase_env_missing');
  }
  // Service role key is required for server-side access to all tables.
  client = createClient(url, key, {
    auth: { persistSession: false }
  });
  return client;
}

module.exports = { getSupabase };
