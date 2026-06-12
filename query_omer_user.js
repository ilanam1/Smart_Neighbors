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
  const email = 'omerdaniel00@gmail.com';
  console.log(`Checking if user ${email} exists in auth.users...`);
  
  const { data, error } = await supabase.rpc('inspect_auth_users_rpc', { target_email: email });
  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    console.log("User data in auth.users:");
    console.table(data);
  }
}

run();
