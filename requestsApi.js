// requestsApi.js
// פונקציות גישה ל-Supabase עבור טבלת requests

import { getSupabase } from './DataBase/supabase';

const supabase = getSupabase();

/**
 * יצירת בקשה חדשה עבור המשתמש המחובר
 * @param {Object} payload
 * @param {string} payload.title        - כותרת הבקשה
 * @param {string} payload.description  - תיאור מפורט
 * @param {string} payload.category     - קטגוריה: 'ITEM_LOAN' | 'PHYSICAL_HELP' | 'INFO' | 'OTHER'
 * @param {string} payload.urgency      - דחיפות: 'LOW' | 'MEDIUM' | 'HIGH'
 * @param {string | null} payload.expiresAt - תאריך תפוגה בפורמט ISO (אופציונלי)
 * @param {boolean} payload.isCommitteeOnly - האם הבקשה מיועדת רק לוועד הבית
 */
export async function createRequest({
  title,
  description,
  category,
  urgency,
  expiresAt = null,
  isCommitteeOnly = false,
}) {
  // 1. להביא את המשתמש המחובר מה-Auth של Supabase
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching current user:', userError.message);
    throw new Error('שגיאה בזיהוי המשתמש (Auth)');
  }

  if (!user) {
    throw new Error('אין משתמש מחובר – נדרש להתחבר לפני יצירת בקשה.');
  }

  // 2. שליחת הבקשה לטבלת requests
  const { data, error } = await supabase
    .from('requests')
    .insert([
      {
        auth_user_id: user.id,
        title,
        description,
        category,
        urgency,
        expires_at: expiresAt, // יכול להיות null
        is_committee_only: isCommitteeOnly,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error inserting request:', error.message);
    throw new Error('שגיאה בשמירת הבקשה בבסיס הנתונים');
  }

  return data; // מחזיר את הבקשה שנוצרה
}

/**
 * קבלת רשימת בקשות פתוחות (לשימוש כללי או ע"י ועד הבית)
 */
export async function getOpenRequests() {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching open requests:', error.message);
    throw new Error('שגיאה בשליפת הבקשות');
  }

  return data;
}

/**
 * קבלת רשימת בקשות שפתוחות לכל הדיירים (לא רק לוועד)
 */
export async function getPublicRequests() {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'OPEN')
    .eq('is_committee_only', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching public requests:', error.message);
    throw new Error('שגיאה בשליפת הבקשות הפתוחות לדיירים');
  }

  return data;
}

/**
 * עריכת בקשה קיימת (שייכת למשתמש המחובר)
 */
export async function updateRequest(
  id,
  { title, description, category, urgency, expiresAt, isCommitteeOnly }
) {
  const updateFields = {};

  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (category !== undefined) updateFields.category = category;
  if (urgency !== undefined) updateFields.urgency = urgency;
  if (expiresAt !== undefined) updateFields.expires_at = expiresAt;
  if (isCommitteeOnly !== undefined)
    updateFields.is_committee_only = isCommitteeOnly;

  const { data, error } = await supabase
    .from('requests')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating request:', error.message);
    throw new Error('שגיאה בעריכת הבקשה');
  }

  return data;
}

/**
 * ביטול בקשה (שינוי הסטטוס ל-CANCELLED + סגירה)
 */
export async function cancelRequest(id) {
  const { data, error } = await supabase
    .from('requests')
    .update({
      status: 'CANCELLED',
      closed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error cancelling request:', error.message);
    throw new Error('שגיאה בביטול הבקשה');
  }

  return data;
}
