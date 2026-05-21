const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// We will read supabase.js to get the credentials
const supabaseContent = fs.readFileSync('./DataBase/supabase.js', 'utf8');

const urlMatch = supabaseContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = supabaseContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
  console.log("Could not find supabase credentials in supabase.js");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  console.log("Testing direct table access (eq)...");
  const { data: rawAdmin, error: rawError } = await supabase
    .from('admins')
    .select('*')
    .eq('admin_number', 'admin123')
    .single();
  
  console.log("Raw admin from table:", rawAdmin ? { ...rawAdmin, password: rawAdmin.password.substring(0, 10) + "..." } : null);
  console.log("Raw error:", rawError);

  console.log("\nTesting login_admin RPC...");
  const { data: rpcAdmin, error: rpcError } = await supabase
    .rpc('login_admin', {
      p_admin_number: 'admin123',
      p_password: 'password123'
    })
    .single();
  
  console.log("RPC admin:", rpcAdmin ? "SUCCESS" : null);
  console.log("RPC error:", rpcError);
}

run();
