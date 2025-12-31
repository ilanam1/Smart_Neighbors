// buildingRulesApi.js
// API לניהול נהלי שימוש כלליים במערכת

import { getSupabase } from "../DataBase/supabase";

/**
 * שליפת הנהלים האחרונים שנשמרו.
 * מחזיר שורה אחת (או null אם עדיין לא נשמר כלום).
 */
export async function getBuildingRules() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("building_rules")
    .select("id, content, updated_at, updated_by")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("getBuildingRules error:", error);
    throw error;
  }

  return data; // יכול להיות null
}

/**
 * שמירת הנהלים (יצירה/עדכון).
 * שומרים הכל על שורה אחת עם id = 1.
 */
export async function saveBuildingRules({ content, userId }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("building_rules")
    .upsert(
      {
        id: 1,          // תמיד אותה שורה
        content,
        updated_by: userId,
      },
      { onConflict: "id" }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("saveBuildingRules error:", error);
    throw error;
  }

  return data;
}
