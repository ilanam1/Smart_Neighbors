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
  console.log("Checking profiles constraints (v3)...");
  const { data: constraints, error: err1 } = await supabase.rpc('inspect_profiles_constraints_v3');
  if (err1) {
    console.error("inspect_profiles_constraints_v3 RPC Error:", err1.message);
  } else {
    console.log("Profiles Table Foreign Keys (v3):");
    console.table(constraints);
  }

  console.log("\nChecking if public.users table exists...");
  const { data: usersExists, error: err2 } = await supabase.rpc('check_table_exists', { tbl_name: 'users' });
  if (err2) {
    console.error("check_table_exists RPC Error:", err2.message);
  } else {
    console.log("public.users table exists:", usersExists);
  }
}

run();
