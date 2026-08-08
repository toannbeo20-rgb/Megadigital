require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users } = await supabase.from('users').select('id').limit(1);
  const { data: clients } = await supabase.from('clients').select('id').limit(1);
  
  if (!users || !clients) {
    console.log("Missing users or clients");
    return;
  }

  const { error } = await supabase.from('tasks').insert({
    title: 'Test task',
    assignee_id: users[0].id,
    client_id: clients[0].id,
    deadline: '2026-08-08',
    status: 'ton',
  });
  
  console.log("INSERT RESULT:", error ? error.message : "SUCCESS");
}
check();
