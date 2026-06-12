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
  console.log("Checking profiles data integrity...");
  const { data, error } = await supabase.rpc('diagnose_profiles_data');
  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    console.log("Profiles Data Diagnosis:");
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
