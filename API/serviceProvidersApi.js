// serviceProvidersApi.js
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

export async function listProviders({ onlyActive = true } = {}) {
  const { buildingId } = await getCurrentUserWithBuilding();

  let q = supabase
    .from("service_providers")
    .select("*")
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false });

  if (onlyActive) {
    q = q.eq("is_active", true);
  }

  const { data, error } = await q;

  if (error) {
    console.error("Error listing providers:", error.message);
    throw new Error("שגיאה בשליפת הספקים");
  }

  return data || [];
}

export async function createProvider({ name, phone, email, category, notes }) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from("service_providers")
    .insert([
      {
        building_id: buildingId,
        name,
        phone,
        email,
        category,
        notes,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating provider:", error.message);
    throw new Error("שגיאה ביצירת ספק");
  }

  return data;
}

export async function updateProvider(id, patch) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from("service_providers")
    .update(patch)
    .eq("id", id)
    .eq("building_id", buildingId)
    .select()
    .single();

  if (error) {
    console.error("Error updating provider:", error.message);
    throw new Error("שגיאה בעדכון ספק");
  }

  return data;
}

export async function deleteProvider(id) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { error } = await supabase
    .from("service_providers")
    .delete()
    .eq("id", id)
    .eq("building_id", buildingId);

  if (error) {
    console.error("Error deleting provider:", error.message);
    throw new Error("שגיאה במחיקת ספק");
  }

  return true;
}