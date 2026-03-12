// disturbanceAssignmentsApi.js
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

export async function getAssignmentsForReport(reportId) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from("disturbance_assignments")
    .select(`
      id,
      report_id,
      provider_id,
      status,
      created_at,
      updated_at,
      last_update_note,
      building_id,
      service_providers ( id, name, phone, category )
    `)
    .eq("report_id", reportId)
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assignments:", error.message);
    throw new Error("שגיאה בשליפת השיוכים לספקים");
  }

  return data || [];
}

export async function createAssignment({ reportId, providerId, note }) {
  const { user, buildingId } = await getCurrentUserWithBuilding();

  // ודא שהדיווח שייך לאותו בניין
  const { data: report, error: reportError } = await supabase
    .from("disturbance_reports")
    .select("id, building_id")
    .eq("id", reportId)
    .eq("building_id", buildingId)
    .maybeSingle();

  if (reportError) {
    console.error("Error checking report:", reportError.message);
    throw new Error("שגיאה בבדיקת הדיווח");
  }

  if (!report) {
    throw new Error("הדיווח לא נמצא או לא שייך לבניין שלך");
  }

  // ודא שהספק שייך לאותו בניין
  const { data: provider, error: providerError } = await supabase
    .from("service_providers")
    .select("id, building_id")
    .eq("id", providerId)
    .eq("building_id", buildingId)
    .maybeSingle();

  if (providerError) {
    console.error("Error checking provider:", providerError.message);
    throw new Error("שגיאה בבדיקת הספק");
  }

  if (!provider) {
    throw new Error("הספק לא נמצא או לא שייך לבניין שלך");
  }

  const { data, error } = await supabase
    .from("disturbance_assignments")
    .insert([
      {
        report_id: reportId,
        provider_id: providerId,
        building_id: buildingId,
        status: "REQUESTED",
        created_by: user.id,
        last_update_note: note || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating assignment:", error.message);
    throw new Error("שגיאה ביצירת שיוך לספק");
  }

  return data;
}

export async function updateAssignmentStatus(assignmentId, { status, note }) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const patch = {
    status,
    last_update_note: note || null,
  };

  const { data, error } = await supabase
    .from("disturbance_assignments")
    .update(patch)
    .eq("id", assignmentId)
    .eq("building_id", buildingId)
    .select()
    .single();

  if (error) {
    console.error("Error updating assignment:", error.message);
    throw new Error("שגיאה בעדכון סטטוס הטיפול");
  }

  return data;
}