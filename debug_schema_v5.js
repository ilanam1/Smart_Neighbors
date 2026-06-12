const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseContent = fs.readFileSync('./DataBase/supabase.js', 'utf8');
const urlMatch = supabaseContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = supabaseContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
  console.log("Could not find supabase credentials in supabase.js");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  console.log("Inspecting inspect_auth_users_rpc function source...");
  const { data: source, error: err } = await supabase.rpc('inspect_routine', { proc_name: 'inspect_auth_users_rpc' });
  if (err) {
    console.error("RPC Error:", err.message);
  } else {
    console.log("Trigger Source Code:");
    console.log(source);
  }
}

run();
