// buildingUpdatesApi.js
// פונקציות גישה לטבלת building_updates ב-Supabase

import { getSupabase } from './DataBase/supabase';

const supabase = getSupabase();

/**
 * יצירת עדכון חדש לבניין (מיועד לוועד בית / מנהל)
 */
export async function createBuildingUpdate({
  title,
  body,
  category = 'GENERAL',
  isImportant = false,
}) {
  // ניקח את המשתמש המחובר (מי פרסם את העדכון)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching current user:', userError.message);
    throw new Error('שגיאה בזיהוי המשתמש (Auth)');
  }

  if (!user) {
    throw new Error('אין משתמש מחובר – רק משתמש מחובר יכול לפרסם עדכון.');
  }

  // לנסות להביא פרטים מהפרופיל (שם פרטי + משפחה)
  let creatorName = null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('auth_uid', user.id)
    .maybeSingle();

  if (!profileError && profile) {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    creatorName = fullName || null;
  }

  const { data, error } = await supabase
    .from('building_updates')
    .insert([
      {
        created_by: user.id,
        title,
        body,
        category,
        is_important: isImportant,
        creator_name: creatorName,
        creator_email: user.email ?? null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error inserting building update:', error.message);
    throw new Error('שגיאה בשמירת העדכון בבסיס הנתונים');
  }

  return data;
}

/**
 * קבלת X העדכונים האחרונים (לטיקר במסך הבית וכו')
 */
export async function getRecentBuildingUpdates(limit = 20) {
  const { data, error } = await supabase
    .from('building_updates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent updates:', error.message);
    throw new Error('שגיאה בשליפת עדכוני הבניין');
  }

  return data || [];
}

/**
 * קבלת עדכונים משבעת הימים האחרונים (סיכום שבועי)
 */
export async function getWeeklyBuildingUpdates() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('building_updates')
    .select('*')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching weekly updates:', error.message);
    throw new Error('שגיאה בשליפת סיכום שבועי של עדכוני הבניין');
  }

  return data || [];
}
