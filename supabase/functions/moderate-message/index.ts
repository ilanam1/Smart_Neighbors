import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HF_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// מודל רב־לשוני לזיהוי הודעות פוגעניות
const MODEL_ID = "textdetox/xlmr-large-toxicity-classifier";

// ספים ראשוניים
// אפשר לכוונן בהמשך לפי בדיקות שלכם
const WARN_THRESHOLD = 0.60;
const BLOCK_THRESHOLD = 0.88;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 1000);
}

// שכבת גיבוי מקומית בעברית למקרה ש-Hugging Face נופל
function localHebrewFallback(text: string) {
  const cleanText = text.toLowerCase().trim().replace(/\s+/g, " ");

  const warningPatterns = [
    "בלתי נסבל",
    "לא סובל אותך",
    "נמאס ממך",
    "דוחה",
    "מגעיל",
    "רעיל",
    "כולם סובלים ממך",
    "אתה הבעיה",
    "תפסיק להפריע",
    "לא מתחשב",
    "חסר כבוד",
    "חסרת כבוד",
  ];

  const blockingPatterns = [
    "לך מפה",
    "תעוף מפה",
    "אף אחד לא רוצה אותך",
    "כולם שונאים אותך",
    "אתה הורס את הבניין",
    "את הורסת את הבניין",
  ];

  let score = 0;
  const matches: string[] = [];

  for (const pattern of warningPatterns) {
    if (cleanText.includes(pattern)) {
      score += 0.25;
      matches.push(pattern);
    }
  }

  for (const pattern of blockingPatterns) {
    if (cleanText.includes(pattern)) {
      score += 0.45;
      matches.push(pattern);
    }
  }

  score = Math.min(score, 1);

  if (score >= BLOCK_THRESHOLD) {
    return {
      allowed: false,
      shouldWarn: true,
      shouldBlock: true,
      toxicityScore: score,
      label: "local_blocked_toxic_language",
      action: "block",
      reason: "ההודעה זוהתה כפוגענית לפי מנגנון גיבוי מקומי",
      source: "local_fallback",
      matches,
    };
  }

  if (score >= WARN_THRESHOLD || matches.length >= 2) {
    return {
      allowed: true,
      shouldWarn: true,
      shouldBlock: false,
      toxicityScore: Math.max(score, WARN_THRESHOLD),
      label: "local_warning_toxic_language",
      action: "warn",
      reason: "ההודעה עשויה להיות פוגענית לפי מנגנון גיבוי מקומי",
      source: "local_fallback",
      matches,
    };
  }

  return {
    allowed: true,
    shouldWarn: false,
    shouldBlock: false,
    toxicityScore: score,
    label: "safe",
    action: "allow",
    reason: "ההודעה תקינה",
    source: "local_fallback",
    matches,
  };
}

function extractToxicityScore(result: unknown): { score: number; label: string } {
  const data: any = result;

  let predictions: any[] = [];

  if (Array.isArray(data) && Array.isArray(data[0])) {
    predictions = data[0];
  } else if (Array.isArray(data)) {
    predictions = data;
  }

  if (!predictions.length) {
    return {
      score: 0,
      label: "unknown",
    };
  }

  const toxicPrediction =
    predictions.find((p) =>
      String(p.label || "").toLowerCase().includes("toxic")
    ) ||
    predictions.find((p) =>
      String(p.label || "").toLowerCase().includes("label_1")
    );

  const neutralPrediction =
    predictions.find((p) =>
      String(p.label || "").toLowerCase().includes("neutral")
    ) ||
    predictions.find((p) =>
      String(p.label || "").toLowerCase().includes("label_0")
    );

  if (toxicPrediction) {
    return {
      score: Number(toxicPrediction.score || 0),
      label: String(toxicPrediction.label || "toxic"),
    };
  }

  // אם משום מה לא נמצאה תווית toxic, ניקח את ההסתברות ההפוכה של neutral
  if (neutralPrediction) {
    return {
      score: 1 - Number(neutralPrediction.score || 0),
      label: "toxic_from_neutral_inverse",
    };
  }

  return {
    score: 0,
    label: "unknown",
  };
}

function buildDecision(score: number, label: string, source = "huggingface") {
  if (score >= BLOCK_THRESHOLD) {
    return {
      allowed: false,
      shouldWarn: true,
      shouldBlock: true,
      toxicityScore: score,
      label,
      action: "block",
      reason: "ההודעה זוהתה כפוגענית ברמת ודאות גבוהה",
      source,
    };
  }

  if (score >= WARN_THRESHOLD) {
    return {
      allowed: true,
      shouldWarn: true,
      shouldBlock: false,
      toxicityScore: score,
      label,
      action: "warn",
      reason: "ההודעה עשויה להיות פוגענית",
      source,
    };
  }

  return {
    allowed: true,
    shouldWarn: false,
    shouldBlock: false,
    toxicityScore: score,
    label,
    action: "allow",
    reason: "ההודעה תקינה",
    source,
  };
}

async function saveModerationEvent({
  conversationId,
  senderProfileId,
  text,
  decision,
}: {
  conversationId: string | null;
  senderProfileId: string | null;
  text: string;
  decision: any;
}) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.log("Skipping moderation event save: missing Supabase env");
      return;
    }

    if (!conversationId || !senderProfileId) {
      console.log("Skipping moderation event save: missing IDs");
      return;
    }

    // שומרים רק אירועים חריגים, לא כל הודעה תקינה
    if (decision.action === "allow") {
      return;
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabaseAdmin
      .from("message_moderation")
      .insert({
        message_id: null,
        conversation_id: conversationId,
        sender_id: senderProfileId,
        original_text_preview: text.slice(0, 120),
        toxicity_score: decision.toxicityScore ?? 0,
        label: decision.label ?? null,
        action_taken: decision.action ?? "none",
        reason: decision.reason ?? null,
      });

    if (error) {
      console.log("Failed saving moderation event:", JSON.stringify(error));
    }
  } catch (error) {
    console.log("Unexpected saveModerationEvent error:", String(error));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders(),
    });
  }

  try {
    const body = await req.json();

    const text = body?.text;
    const conversationId = body?.conversationId ?? null;
    const senderProfileId = body?.senderProfileId ?? null;
    const saveEvent = body?.saveEvent ?? true;

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({
          error: "Missing text field",
          exampleBody: {
            text: "שלום, מתי יש ישיבת ועד?",
            conversationId: null,
            senderProfileId: null,
            saveEvent: false,
          },
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const cleanText = normalizeText(text);

    let decision: any = null;
    let rawHuggingFaceResult: any = null;

    // אם אין מפתח Hugging Face, משתמשים בגיבוי המקומי
    if (!HF_API_KEY) {
      decision = localHebrewFallback(cleanText);

      if (saveEvent) {
        await saveModerationEvent({
          conversationId,
          senderProfileId,
          text: cleanText,
          decision,
        });
      }

      return new Response(
        JSON.stringify({
          ...decision,
          debug: {
            model: "local_hebrew_fallback",
            note: "HUGGINGFACE_API_KEY is missing",
          },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json",
          },
        }
      );
    }

    try {
      const hfResponse = await fetch(
        `https://router.huggingface.co/hf-inference/models/${MODEL_ID}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: cleanText,
          }),
        }
      );

      const raw = await hfResponse.text();

      if (!hfResponse.ok) {
        console.log("HF failed:", hfResponse.status, raw);

        // אם Hugging Face נופל, לא מפילים את האפליקציה.
        // משתמשים בגיבוי המקומי.
        decision = localHebrewFallback(cleanText);

        if (saveEvent) {
          await saveModerationEvent({
            conversationId,
            senderProfileId,
            text: cleanText,
            decision,
          });
        }

        return new Response(
          JSON.stringify({
            ...decision,
            debug: {
              model: MODEL_ID,
              huggingFaceFailed: true,
              hfStatus: hfResponse.status,
              hfRaw: raw,
              fallbackUsed: true,
            },
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders(),
              "Content-Type": "application/json",
            },
          }
        );
      }

      rawHuggingFaceResult = JSON.parse(raw);

      const { score, label } = extractToxicityScore(rawHuggingFaceResult);
      decision = buildDecision(score, label, "huggingface");

      if (saveEvent) {
        await saveModerationEvent({
          conversationId,
          senderProfileId,
          text: cleanText,
          decision,
        });
      }

      return new Response(
        JSON.stringify({
          ...decision,
          debug: {
            model: MODEL_ID,
            rawHuggingFaceResult,
          },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json",
          },
        }
      );
    } catch (hfError) {
      console.log("HF unexpected error:", String(hfError));

      decision = localHebrewFallback(cleanText);

      if (saveEvent) {
        await saveModerationEvent({
          conversationId,
          senderProfileId,
          text: cleanText,
          decision,
        });
      }

      return new Response(
        JSON.stringify({
          ...decision,
          debug: {
            model: MODEL_ID,
            huggingFaceUnexpectedError: String(hfError),
            fallbackUsed: true,
          },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unexpected server error",
        details: String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json",
        },
      }
    );
  }
});