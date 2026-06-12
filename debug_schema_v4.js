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
  console.log("Checking triggers on auth.users...");
  const { data: triggers, error: err } = await supabase.rpc('inspect_auth_triggers');
  if (err) {
    console.error("RPC Error:", err.message);
  } else {
    console.log("Active Triggers on auth.users:");
    console.table(triggers);
  }
}

run();
