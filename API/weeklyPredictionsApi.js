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
    .select("building_id, is_house_committee")
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
    isCommittee: !!profile.is_house_committee,
  };
}

export async function getWeeklyDisturbancePredictions() {
  const { buildingId, isCommittee } = await getCurrentUserWithBuilding();

  if (!isCommittee) {
    throw new Error("רק ועד הבית יכול לצפות בתחזית השבועית");
  }

  const { data, error } = await supabase
    .from("weekly_disturbance_predictions")
    .select("*")
    .eq("building_id", buildingId)
    .order("target_week_start", { ascending: false })
    .order("probability", { ascending: false });

  if (error) {
    console.error("Error fetching weekly predictions:", error.message);
    throw new Error("שגיאה בשליפת התחזית השבועית");
  }

  if (!data || !data.length) {
    return [];
  }

  const latestWeek = data[0].target_week_start;
  return data.filter((item) => item.target_week_start === latestWeek);
}