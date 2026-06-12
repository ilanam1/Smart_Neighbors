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
  console.log("Checking if inspect_profiles_constraints RPC exists...");
  const { data, error } = await supabase.rpc('inspect_profiles_constraints');
  if (error) {
    console.error("RPC Error (it probably does not exist yet):", error.message);
    console.log("\nPlease run the SQL snippet in Supabase first to create the diagnostic RPC.");
  } else {
    console.log("Diagnostic Results (profiles table constraints):");
    console.table(data);
  }
}

run();
