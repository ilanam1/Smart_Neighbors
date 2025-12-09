// disturbancesApi.js
// פונקציות גישה ל-Supabase עבור דיווחי מטרד

import { getSupabase } from './DataBase/supabase';
const supabase = getSupabase();

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
  // 1. הבאת המשתמש המחובר
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching current user:', userError.message);
    throw new Error('שגיאה בזיהוי המשתמש (Auth)');
  }

  if (!user) {
    throw new Error('אין משתמש מחובר – נא להתחבר לפני שליחת דיווח.');
  }

  // 2. הכנסת הדיווח לטבלה
  const { data, error } = await supabase
    .from('disturbance_reports')
    .insert([
      {
        auth_user_id: user.id,
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
 * החזרת כל הדיווחים של המשתמש הנוכחי
 */
export async function getMyDisturbanceReports() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('שגיאה בזיהוי המשתמש (Auth)');
  }

  const { data, error } = await supabase
    .from('disturbance_reports')
    .select('*')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching disturbance reports:', error.message);
    throw new Error('שגיאה בשליפת הדיווחים');
  }

  return data;
}
