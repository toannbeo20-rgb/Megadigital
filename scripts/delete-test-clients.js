require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dummyClientIds = [
  'c1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'c4444444-4444-4444-4444-444444444444',
  'c5555555-5555-5555-5555-555555555555',
  'c6666666-6666-6666-6666-666666666666'
];

async function main() {
  console.log("Deleting dummy clients...");
  
  const { data, error } = await supabase
    .from('clients')
    .delete()
    .in('id', dummyClientIds);

  if (error) {
    console.error("Error deleting clients:", error);
  } else {
    console.log("Successfully deleted dummy clients. Due to CASCADE, their jobs and tasks are also deleted.");
  }
}

main();
