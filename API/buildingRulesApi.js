// buildingRulesApi.js
// API לניהול חוקי בניין לפי building_id של המשתמש המחובר

import { getSupabase } from "../DataBase/supabase";

const supabase = getSupabase();

async function getCurrentUserWithBuilding() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error fetching current user:", userError.message);
    throw new Error("שגיאה בזיהוי המשתמש המחובר");
  }

  if (!user) {
    throw new Error("אין משתמש מחובר");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("auth_uid", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile:", profileError.message);
    throw new Error("שגיאה בשליפת פרטי הפרופיל");
  }

  if (!profile) {
    throw new Error("לא נמצא פרופיל למשתמש המחובר");
  }

  if (!profile.building_id) {
    throw new Error("למשתמש המחובר עדיין לא משויך בניין");
  }

  return {
    user,
    buildingId: profile.building_id,
  };
}

/**
 * שליפת חוקי הבניין של המשתמש המחובר
 * מחזיר שורה אחת או null
 */
export async function getBuildingRules() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from("building_rules")
    .select("id, content, updated_at, updated_by, building_id")
    .eq("building_id", buildingId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("getBuildingRules error:", error);
    throw new Error("שגיאה בשליפת חוקי הבניין");
  }

  return data || null;
}

/**
 * שמירת חוקי הבניין של המשתמש המחובר
 * אם כבר קיימת רשומה לבניין הזה – מעדכן
 * אחרת – יוצר חדשה
 */
export async function saveBuildingRules({ content }) {
  const { user, buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from("building_rules")
    .upsert(
      {
        building_id: buildingId,
        content,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "building_id" }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("saveBuildingRules error:", error);
    throw new Error("שגיאה בשמירת חוקי הבניין");
  }

  return data;
}