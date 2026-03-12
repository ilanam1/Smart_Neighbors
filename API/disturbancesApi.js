// disturbancesApi.js
// פונקציות גישה ל-Supabase עבור דיווחי מטרד
// מותאם לעבודה לפי building_id של המשתמש המחובר

import { getSupabase } from '../DataBase/supabase';
const supabase = getSupabase();

async function getCurrentUserWithBuilding() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching current user:', userError.message);
    throw new Error('שגיאה בזיהוי המשתמש המחובר');
  }

  if (!user) {
    throw new Error('אין משתמש מחובר');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('building_id')
    .eq('auth_uid', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching profile:', profileError.message);
    throw new Error('שגיאה בשליפת פרטי הפרופיל');
  }

  if (!profile) {
    throw new Error('לא נמצא פרופיל למשתמש המחובר');
  }

  if (!profile.building_id) {
    throw new Error('למשתמש המחובר עדיין לא משויך בניין');
  }

  return {
    user,
    buildingId: profile.building_id,
  };
}

/**
 * יצירת דיווח מטרד חדש
 */
export async function createDisturbanceReport({
  type,
  severity,
  description,
  occurredAt,
  location = null,
}) {
  const { user, buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('disturbance_reports')
    .insert([
      {
        auth_user_id: user.id,
        building_id: buildingId,
        type,
        severity,
        description,
        occurred_at: occurredAt,
        location,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error inserting disturbance report:', error.message);
    throw new Error('שגיאה בשמירת הדיווח בבסיס הנתונים');
  }

  return data;
}

/**
 * החזרת כל הדיווחים של המשתמש הנוכחי מהבניין שלו
 */
export async function getMyDisturbanceReports() {
  const { user, buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('disturbance_reports')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching disturbance reports:', error.message);
    throw new Error('שגיאה בשליפת הדיווחים');
  }

  return data || [];
}

/**
 * כל דיווחי המטרדים הפתוחים/הקיימים של הבניין
 * מיועד למסך ועד הבית
 */
export async function getBuildingDisturbanceReports() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('disturbance_reports')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching building disturbance reports:', error.message);
    throw new Error('שגיאה בשליפת דיווחי המטרדים של הבניין');
  }

  return data || [];
}