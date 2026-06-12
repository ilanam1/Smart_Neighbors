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
  console.log("Fetching definition of trigger on_auth_user_created...");
  const { data: def, error: err } = await supabase.rpc('inspect_trigger_def', { trig_name: 'on_auth_user_created' });
  if (err) {
    console.error("RPC Error:", err.message);
  } else {
    console.log("Trigger Definition:");
    console.log(def);
  }
}

run();
