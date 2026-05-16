// requestsApi.js
// פונקציות גישה ל-Supabase עבור טבלת requests
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
    .select('building_id, is_blocked')
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

  if (profile.is_blocked) {
    throw new Error('המשתמש חסום זמנית מפעילות במערכת');
  }

  return {
    user,
    buildingId: profile.building_id,
  };
}

/**
 * מוסיף לכל בקשה את שם המבקש מתוך טבלת profiles.
 * בגלל שהבקשה שומרת auth_user_id, אנחנו מחפשים profiles.auth_uid.
 */
async function attachRequesterNames(requests) {
  if (!requests || requests.length === 0) {
    return [];
  }

  const authUserIds = [
    ...new Set(
      requests
        .map((request) => request.auth_user_id)
        .filter(Boolean)
    ),
  ];

  if (authUserIds.length === 0) {
    return requests.map((request) => ({
      ...request,
      requester_name: 'דייר לא ידוע',
    }));
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('auth_uid, first_name, last_name, email, phone')
    .in('auth_uid', authUserIds);

  if (error) {
    console.error('Error fetching requester profiles:', error.message);

    return requests.map((request) => ({
      ...request,
      requester_name: 'דייר לא ידוע',
    }));
  }

  const profileByAuthUid = {};

  (profiles || []).forEach((profile) => {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';

    const fullName = `${firstName} ${lastName}`.trim();

    profileByAuthUid[profile.auth_uid] = {
      ...profile,
      requester_name:
        fullName ||
        profile.email ||
        profile.phone ||
        'דייר לא ידוע',
    };
  });

  return requests.map((request) => {
    const requesterProfile = profileByAuthUid[request.auth_user_id];

    return {
      ...request,
      requester_profile: requesterProfile || null,
      requester_name: requesterProfile?.requester_name || 'דייר לא ידוע',
    };
  });
}

/**
 * יצירת בקשה חדשה עבור המשתמש המחובר
 */
export async function createRequest({
  title,
  description,
  category,
  urgency,
  expiresAt = null,
  isCommitteeOnly = false,
}) {
  const { user, buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('requests')
    .insert([
      {
        auth_user_id: user.id,
        building_id: buildingId,
        title,
        description,
        category,
        urgency,
        expires_at: expiresAt,
        is_committee_only: isCommitteeOnly,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error inserting request:', error.message);
    throw new Error('שגיאה בשמירת הבקשה בבסיס הנתונים');
  }

  return data;
}

/**
 * קבלת בקשות פתוחות שמיועדות לוועד הבית בלבד.
 * תיקון לפי הדרישה:
 * בקשות לכל הדיירים לא צריכות להופיע גם במסך ועד הבית.
 */
export async function getOpenRequests() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('building_id', buildingId)
    .eq('status', 'OPEN')
    .eq('is_committee_only', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching open committee requests:', error.message);
    throw new Error('שגיאה בשליפת הבקשות לוועד הבית');
  }

  return attachRequesterNames(data || []);
}

/**
 * קבלת בקשות פתוחות לצפייה של דיירים רגילים.
 * כלומר: רק של הבניין שלהם ורק כאלה שלא מיועדות לוועד בלבד.
 */
export async function getPublicRequests() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('building_id', buildingId)
    .eq('status', 'OPEN')
    .eq('is_committee_only', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching public requests:', error.message);
    throw new Error('שגיאה בשליפת הבקשות הפתוחות לדיירים');
  }

  return attachRequesterNames(data || []);
}

/**
 * עריכת בקשה קיימת
 * מותנה בכך שהבקשה שייכת לבניין של המשתמש המחובר
 */
export async function updateRequest(
  id,
  { title, description, category, urgency, expiresAt, isCommitteeOnly }
) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const updateFields = {};

  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (category !== undefined) updateFields.category = category;
  if (urgency !== undefined) updateFields.urgency = urgency;
  if (expiresAt !== undefined) updateFields.expires_at = expiresAt;
  if (isCommitteeOnly !== undefined) {
    updateFields.is_committee_only = isCommitteeOnly;
  }

  const { data, error } = await supabase
    .from('requests')
    .update(updateFields)
    .eq('id', id)
    .eq('building_id', buildingId)
    .select()
    .single();

  if (error) {
    console.error('Error updating request:', error.message);
    throw new Error('שגיאה בעריכת הבקשה');
  }

  return data;
}

/**
 * ביטול בקשה
 * משנה סטטוס ל-CANCELLED רק אם הבקשה שייכת לבניין של המשתמש
 */
export async function cancelRequest(id) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('requests')
    .update({
      status: 'CANCELLED',
      closed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('building_id', buildingId)
    .select()
    .single();

  if (error) {
    console.error('Error cancelling request:', error.message);
    throw new Error('שגיאה בביטול הבקשה');
  }

  return data;
}

/**
 * סימון בקשה כטופלה
 * עובד גם עבור ועד הבית וגם עבור בקשות ציבוריות בין דיירים.
 */
export async function completeRequest(id) {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('requests')
    .update({
      status: 'COMPLETED',
      closed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('building_id', buildingId)
    .eq('status', 'OPEN')
    .select()
    .single();

  if (error) {
    console.error('Error completing request:', error.message);
    throw new Error('שגיאה בסימון הבקשה כטופלה');
  }

  return data;
}

/**
 * קבלת כל הבקשות של הבניין של המשתמש המחובר.
 * מיועד למסך סטטיסטיקות / ניתוחים עבור ועד הבית.
 */
export async function getAllBuildingRequests() {
  const { buildingId } = await getCurrentUserWithBuilding();

  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all building requests:', error.message);
    throw new Error('שגיאה בשליפת כל הבקשות של הבניין');
  }

  return attachRequesterNames(data || []);
}