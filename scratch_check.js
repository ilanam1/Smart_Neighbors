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

async function check() {
  console.log("Sending global notification via RPC...");
  const { data: res, error: rpcError } = await supabase.rpc('send_global_notification_as_admin', {
    p_sender_id: '424fe8a2-9876-45a6-b684-90cfd5861690',
    p_title: '🛠️ בדיקה גלובלית',
    p_message: 'הודעת בדיקה לכלל הדיירים'
  });

  if (rpcError) {
    console.error("RPC error:", rpcError);
  } else {
    console.log("RPC Result:", res);
  }

  console.log("\n--- RECENT NOTIFICATIONS ---");
  const { data: notifs, error: nError } = await supabase.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(5);
  if (nError) console.error("Notifications error:", nError);
  else console.log(`Recent notifications:`, notifs);
}

check();
