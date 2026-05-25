import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const body = await req.json();

    const userId = body.user_id;
    const token = body.token;
    const platform = body.platform || "android";
    const role = body.role || "user";

    if (!userId || !token) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or token" }),
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          role,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,token",
        }
      );

    if (error) {
      console.error("Error saving push token:", error.message);

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Push token saved successfully",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("save-push-token error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Unknown error",
      }),
      { status: 500 }
    );
  }
});