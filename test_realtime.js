const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read supabase.js to get credentials
const supabaseContent = fs.readFileSync('./DataBase/supabase.js', 'utf8');
const urlMatch = supabaseContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = supabaseContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
  console.log("Could not find supabase credentials in supabase.js");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  console.log("1. Fetching a service employee to get a valid ID...");
  const { data: employees, error: empError } = await supabase
    .from('service_employees')
    .select('id, full_name')
    .limit(1);

  if (empError) {
    console.error("Error fetching employees:", empError);
    process.exit(1);
  }
  if (!employees || employees.length === 0) {
    console.error("No service employees found in the DB. Make sure schema and mock data are applied.");
    process.exit(1);
  }

  const employeeId = employees[0].id;
  const employeeName = employees[0].full_name;
  console.log(`Found employee: ${employeeName} with ID: ${employeeId}`);

  console.log("2. Subscribing to app_notifications INSERT events for this employee...");
  let receivedEvent = false;

  const channel = supabase
    .channel(`test-realtime-channel`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notifications',
        filter: `recipient_id=eq.${employeeId}`,
      },
      (payload) => {
        console.log("🔔 REALTIME EVENT RECEIVED! Payload:", payload);
        receivedEvent = true;
      }
    )
    .subscribe((status, err) => {
      console.log(`Subscription status: ${status}`, err ? `Error: ${JSON.stringify(err)}` : '');
      
      if (status === 'SUBSCRIBED') {
        console.log("Subscribed successfully! Now triggering an insert...");
        triggerInsert();
      }
    });

  async function triggerInsert() {
    console.log("3. Inserting a notification into app_notifications table...");
    const { data, error } = await supabase
      .from('app_notifications')
      .insert([
        {
          recipient_id: employeeId,
          title: "בדיקת זמן אמת",
          message: "האם זה עובד?",
          type: "global_announcement",
          related_data: { test: true }
        }
      ])
      .select();

    if (error) {
      console.error("Error inserting notification:", error);
    } else {
      console.log("Notification inserted successfully:", data);
    }

    // Wait 5 seconds to see if realtime message is received
    setTimeout(async () => {
      console.log("4. Cleaning up notification and subscription...");
      
      // Delete the test notification
      if (data && data[0]) {
        await supabase
          .from('app_notifications')
          .delete()
          .eq('id', data[0].id);
        console.log("Test notification deleted.");
      }

      await supabase.removeChannel(channel);

      if (receivedEvent) {
        console.log("\n✅ SUCCESS: Supabase Realtime is working for app_notifications!");
      } else {
        console.log("\n❌ FAILURE: Notification was inserted but no realtime event was received.");
        console.log("This usually means public.app_notifications is NOT added to the supabase_realtime publication.");
        console.log("Run this in your Supabase SQL Editor: alter publication supabase_realtime add table public.app_notifications;");
      }
      process.exit(0);
    }, 5000);
  }
}

run();
