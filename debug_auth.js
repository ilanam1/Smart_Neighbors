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
  const randomEmail = `tester.${Date.now()}@gmail.com`;
  const password = "Password123!";
  
  console.log(`\n--- Running Signup Test for: ${randomEmail} ---`);
  
  // 1. Try to sign up via Supabase auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: randomEmail,
    password: password
  });
  
  if (authError) {
    console.error("1. Auth Sign Up FAILED:", authError.message);
    return;
  }
  
  const user = authData?.user;
  console.log("1. Auth Sign Up SUCCESS. User ID:", user?.id);
  
  // 2. Query check to see if the user exists in auth.users
  console.log("2. Querying auth.users via RPC...");
  const { data: authRows, error: errRpc } = await supabase.rpc('inspect_auth_users_rpc', { target_email: randomEmail });
  if (errRpc) {
    console.error("2. RPC Error (inspect_auth_users_rpc may not be created yet):", errRpc.message);
  } else {
    console.log("2. Rows found in auth.users for this email:");
    console.table(authRows);
  }

  if (user) {
    // 3. Try to insert directly into public.profiles
    console.log("3. Attempting to insert into public.profiles...");
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        auth_uid: user.id,
        email: randomEmail,
        first_name: "Test",
        last_name: "User",
        phone: "0500000000",
        zip_code: "1234567",
        address: "Test Address",
        id_number: "123456789",
        date_of_birth: "2000-01-01",
        is_house_committee: false,
        is_approved: false
      });
      
    if (profileError) {
      console.error("3. Insert into profiles FAILED:", profileError);
    } else {
      console.log("3. Insert into profiles SUCCESS:", profileData);
    }
  }
}

run();
