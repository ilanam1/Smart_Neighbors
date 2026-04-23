import { getSupabase } from "../DataBase/supabase";

const supabase = getSupabase();

async function getCurrentUserWithProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
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
    throw new Error("שגיאה בשליפת פרטי הפרופיל");
  }

  if (!profile?.building_id) {
    throw new Error("למשתמש המחובר עדיין לא משויך בניין");
  }

  return {
    user,
    buildingId: profile.building_id,
    isCommittee: !!profile.is_house_committee,
  };
}

export async function createBuildingEvent({
  title,
  description,
  location,
  startAt,
  endAt,
  eventType = "GENERAL",
}) {
  const { user, buildingId, isCommittee } = await getCurrentUserWithProfile();

  if (!isCommittee) {
    throw new Error("רק ועד הבית יכול ליצור אירועים");
  }

  const { data, error } = await supabase
    .from("building_events")
    .insert([
      {
        building_id: buildingId,
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        start_at: startAt,
        end_at: endAt || null,
        created_by: user.id,
        event_type: eventType,
        visibility: "ALL_RESIDENTS",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating building event:", error.message);
    throw new Error("שגיאה ביצירת אירוע");
  }

  return data;
}

export async function getBuildingEvents() {
  const { buildingId } = await getCurrentUserWithProfile();

  const { data, error } = await supabase
    .from("building_events")
    .select("*")
    .eq("building_id", buildingId)
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Error fetching building events:", error.message);
    throw new Error("שגיאה בשליפת אירועי הבניין");
  }

  return data || [];
}

export async function deleteBuildingEvent(eventId) {
  const { isCommittee } = await getCurrentUserWithProfile();

  if (!isCommittee) {
    throw new Error("רק ועד הבית יכול למחוק אירועים");
  }

  const { error } = await supabase
    .from("building_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("Error deleting building event:", error.message);
    throw new Error("שגיאה במחיקת האירוע");
  }

  return true;
}

export async function getCurrentUserCommitteeStatus() {
  const { isCommittee } = await getCurrentUserWithProfile();
  return isCommittee;
}