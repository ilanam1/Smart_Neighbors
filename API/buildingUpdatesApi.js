// API/buildingUpdatesApi.js
// פונקציות גישה לטבלת building_updates ב-Supabase
// מותאם לעבודה לפי building_id של המשתמש המחובר

import { getSupabase } from '../DataBase/supabase';

const supabase = getSupabase();

/**
 * פונקציית עזר:
 * מביאה את המשתמש המחובר ואת ה-building_id שלו מתוך profiles
 */
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
    .select('first_name, last_name, building_id')
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

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return {
    user,
    profile,
    buildingId: profile.building_id,
    creatorName: fullName || null,
  };
}

/**
 * יצירת עדכון חדש לבניין של המשתמש המחובר
 */
export async function createBuildingUpdate({
  title,
  body,
  category = 'GENERAL',
  isImportant = false,
}) {
  const { user, buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('building_updates')
    .insert([
      {
        created_by: user.id,
        building_id: buildingId,
        title,
        body,
        category,
        is_important: isImportant,
      },
    ])
    .select('*')
    .single();

  if (error) {
    console.error('Error inserting building update:', error.message);
    throw new Error('שגיאה בשמירת עדכון הבניין');
  }

  return data;
}

/**
 * קבלת X העדכונים האחרונים של הבניין של המשתמש המחובר
 */
export async function getRecentBuildingUpdates(limit = 20) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('building_updates')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent building updates:', error.message);
    throw new Error('שגיאה בשליפת עדכוני הבניין');
  }

  return data || [];
}

/**
 * קבלת עדכוני הבניין משבעת הימים האחרונים
 */
export async function getWeeklyBuildingUpdates() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('building_updates')
    .select('*')
    .eq('building_id', buildingId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching weekly building updates:', error.message);
    throw new Error('שגיאה בשליפת עדכוני הבניין השבועיים');
  }

  return data || [];
}