import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9";

serve(async (req) => {
  try {
    const payload = await req.json();

    console.log("Incoming payload:", JSON.stringify(payload));

    const record = payload.record || payload;

    if (!record) {
      return new Response(
        JSON.stringify({ error: "Missing notification record" }),
        { status: 400 }
      );
    }

    const recipientId = record.recipient_id;
    const title = record.title || "Smart Neighbors";
    const message = record.message || "";
    const type = record.type || "general";
    const notificationId = record.id || "";

    if (!recipientId) {
      return new Response(
        JSON.stringify({ error: "Missing recipient_id" }),
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const firebaseServiceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { status: 500 }
      );
    }

    if (!firebaseProjectId || !firebaseServiceAccountRaw) {
      return new Response(
        JSON.stringify({ error: "Missing Firebase environment variables" }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", recipientId);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError.message);

      return new Response(
        JSON.stringify({ error: tokensError.message }),
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for user:", recipientId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "No push tokens for this user",
        }),
        { status: 200 }
      );
    }

    const firebaseServiceAccount = JSON.parse(firebaseServiceAccountRaw);

    const auth = new GoogleAuth({
      credentials: firebaseServiceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });

    const accessToken = await auth.getAccessToken();

    const results = [];

    for (const row of tokens) {
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: {
                title,
                body: message,
              },
              data: {
                notification_id: String(notificationId),
                type: String(type),
                title: String(title),
                body: String(message),
              },
              android: {
                priority: "HIGH",
                notification: {
                  sound: "default",
                  channel_id: "smart_neighbors_default",
                },
              },
            },
          }),
        }
      );

      const responseText = await fcmResponse.text();

      results.push({
        token: row.token,
        status: fcmResponse.status,
        response: responseText,
      });

      if (!fcmResponse.ok) {
        console.error("Firebase send error:", responseText);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipient_id: recipientId,
        sent_to_tokens: tokens.length,
        results,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("send-push-notification error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Unknown error",
      }),
      { status: 500 }
    );
  }
});