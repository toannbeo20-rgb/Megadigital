require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('tasks').select('client_id').limit(1);
  if (error) {
    console.log("MIGRATION_MISSING", error.message);
  } else {
    console.log("MIGRATION_APPLIED", data);
  }
}
check();
