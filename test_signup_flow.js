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
  const email = `test.user.${Date.now()}@gmail.com`;
  const password = "Password123!";
  
  console.log("Signing up user:", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (error) {
    console.error("Sign up failed:", error);
    return;
  }
  
  const user = data.user;
  console.log("Sign up succeeded. User ID:", user.id);
  
  const payload = {
    auth_uid: user.id,
    email: email,
    first_name: "Test",
    last_name: "User",
    phone: "0501234567",
    zip_code: "1234567",
    address: "123 Test St",
    id_number: "123456789",
    date_of_birth: "2000-01-01",
    is_house_committee: false,
    building_id: "053d127c-39b4-4856-b8f7-1654d0277fd5", // valid building ID from screenshot
    is_approved: false,
    is_email_verified: true
  };
  
  console.log("Inserting profile payload...");
  const { error: profileError } = await supabase
    .from('profiles')
    .insert(payload);
    
  if (profileError) {
    console.error("Profile insert failed:", profileError);
  } else {
    console.log("Profile insert succeeded!");
  }
}

run();
