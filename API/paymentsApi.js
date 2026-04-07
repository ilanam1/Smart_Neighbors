// paymentsApi.js
// API מלא לניהול מיסי ועד בית - דיירים + ועד בית

import { getSupabase } from '../DataBase/supabase';

import {
  notifyCommitteeAboutCashPaymentRequest,
  notifyCommitteeAboutLinkPaymentCompleted,
} from './notificationsApi';

function getCurrentMonthYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function generateReceiptCode() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `HF-${Date.now()}-${random}`;
}

/**
 * שליפת משתמש מחובר + פרופיל
 */
export async function getCurrentUserProfile() {
  const supabase = getSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Error fetching auth user:', authError);
    throw new Error('שגיאה בזיהוי המשתמש המחובר');
  }

  if (!user) {
    throw new Error('אין משתמש מחובר');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      auth_uid,
      first_name,
      last_name,
      building_id,
      is_house_committee,
      committee_payment_link
    `)
    .eq('auth_uid', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching current profile:', profileError);
    throw new Error('שגיאה בשליפת פרופיל המשתמש');
  }

  return { user, profile };
}

/**
 * מביא חברי ועד של הבניין של המשתמש
 */
export async function getCommitteeMembersByBuilding() {
  const supabase = getSupabase();
  const { profile } = await getCurrentUserProfile();

  if (!profile.building_id) {
    throw new Error('למשתמש אין בניין משויך');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      auth_uid,
      first_name,
      last_name,
      committee_payment_link,
      is_house_committee,
      building_id
    `)
    .eq('building_id', profile.building_id)
    .eq('is_house_committee', true);

  if (error) {
    console.error('Error fetching committee members by building:', error);
    throw new Error('שגיאה בשליפת חברי ועד הבית');
  }

  return data || [];
}

/**
 * מביא את החיוב החודשי של הבניין עבור חודש מסוים
 */
export async function getCurrentBuildingCharge(monthYear = getCurrentMonthYear()) {
  const supabase = getSupabase();
  const { profile } = await getCurrentUserProfile();

  if (!profile.building_id) {
    throw new Error('למשתמש אין בניין משויך');
  }

  const { data, error } = await supabase
    .from('house_fee_charges')
    .select('*')
    .eq('building_id', profile.building_id)
    .eq('month_year', monthYear)
    .maybeSingle();

  if (error) {
    console.error('Error fetching building charge:', error);
    throw new Error('שגיאה בשליפת החיוב החודשי');
  }

  return data;
}

/**
 * ועד בית - יצירה/עדכון סכום חודשי לבניין
 */
export async function upsertBuildingCharge({ monthYear, amount, notes = '' }) {
  const supabase = getSupabase();
  const { user, profile } = await getCurrentUserProfile();

  if (!profile.is_house_committee) {
    throw new Error('רק ועד בית יכול לעדכן את הסכום החודשי');
  }

  if (!profile.building_id) {
    throw new Error('לוועד הבית אין building_id משויך');
  }

  if (!monthYear) {
    throw new Error('יש לבחור חודש');
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error('יש להזין סכום תקין גדול מ-0');
  }

  const payload = {
    building_id: profile.building_id,
    month_year: monthYear,
    amount: Number(amount),
    notes: notes?.trim() || null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('house_fee_charges')
    .upsert([payload], {
      onConflict: 'building_id,month_year',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting building charge:', error);
    throw new Error('שגיאה בעדכון הסכום החודשי');
  }

  return data;
}

/**
 * ועד בית - מביא היסטוריית חיובים לבניין
 */
export async function getBuildingChargesHistory(limit = 12) {
  const supabase = getSupabase();
  const { profile } = await getCurrentUserProfile();

  if (!profile.is_house_committee) {
    throw new Error('רק ועד בית יכול לצפות בהיסטוריית חיובים');
  }

  const { data, error } = await supabase
    .from('house_fee_charges')
    .select('*')
    .eq('building_id', profile.building_id)
    .order('month_year', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching charges history:', error);
    throw new Error('שגיאה בשליפת היסטוריית החיובים');
  }

  return data || [];
}

/**
 * בדיקה אם כבר יש תשלום של הדייר עבור אותו חודש
 */
export async function getMyPaymentForMonth(monthYear = getCurrentMonthYear()) {
  const supabase = getSupabase();
  const { user, profile } = await getCurrentUserProfile();

  const { data, error } = await supabase
    .from('house_fee_payments')
    .select('*')
    .eq('tenant_auth_user_id', user.id)
    .eq('building_id', profile.building_id)
    .eq('month_year', monthYear)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching my payment for month:', error);
    throw new Error('שגיאה בשליפת מצב התשלום');
  }

  return data;
}

/**
 * דייר - יצירת בקשת תשלום במזומן
 */
export async function createCashPaymentRequest({
  committeeAuthUserId,
  amount,
  monthYear,
  chargeId,
}) {
  const supabase = getSupabase();
  const { user, profile } = await getCurrentUserProfile();

  const existingPayment = await getMyPaymentForMonth(monthYear);
  if (
    existingPayment &&
    ['INITIATED', 'LINK_OPENED', 'CASH_REQUESTED', 'PAID'].includes(existingPayment.status)
  ) {
    throw new Error('כבר קיימת בקשת תשלום עבור חודש זה');
  }

  const { data, error } = await supabase
    .from('house_fee_payments')
    .insert([
      {
        tenant_auth_user_id: user.id,
        committee_auth_user_id: committeeAuthUserId,
        building_id: profile.building_id,
        charge_id: chargeId || null,
        amount: Number(amount),
        month_year: monthYear,
        payment_method: 'CASH',
        status: 'CASH_REQUESTED',
        cash_requested_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating cash payment request:', error);
    throw new Error('שגיאה ביצירת בקשת תשלום במזומן');
  }

  // יצירת התראה לוועד הבית
  try {
    const tenantName =
      `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'דייר';

    await notifyCommitteeAboutCashPaymentRequest({
      committeeUserId: committeeAuthUserId,
      tenantUserId: user.id,
      tenantName,
      monthYear,
      amount: Number(amount),
      paymentId: data.id,
    });
  } catch (notificationError) {
    console.error('Error creating cash payment notification:', notificationError);
  }

  return data;
}

/**
 * דייר - יצירת בקשת תשלום דרך לינק
 */
export async function createLinkPaymentRequest({
  committeeAuthUserId,
  amount,
  monthYear,
  chargeId,
  externalPaymentLink,
}) {
  const supabase = getSupabase();
  const { user, profile } = await getCurrentUserProfile();

  const existingPayment = await getMyPaymentForMonth(monthYear);
  if (existingPayment && ['INITIATED', 'LINK_OPENED', 'CASH_REQUESTED', 'PAID'].includes(existingPayment.status)) {
    throw new Error('כבר קיימת בקשת תשלום עבור חודש זה');
  }

  const { data, error } = await supabase
    .from('house_fee_payments')
    .insert([
      {
        tenant_auth_user_id: user.id,
        committee_auth_user_id: committeeAuthUserId,
        building_id: profile.building_id,
        charge_id: chargeId || null,
        amount: Number(amount),
        month_year: monthYear,
        payment_method: 'LINK',
        status: 'INITIATED',
        external_payment_link: externalPaymentLink || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating link payment request:', error);
    throw new Error('שגיאה ביצירת בקשת תשלום דרך לינק');
  }

  return data;
}

/**
 * דייר - אישור ידני לאחר חזרה מהלינק
 */
export async function confirmLinkPaymentAsPaid(paymentId) {
  const supabase = getSupabase();
  const receiptCode = generateReceiptCode();

  const { user, profile } = await getCurrentUserProfile();

  const { data, error } = await supabase
    .from('house_fee_payments')
    .update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
      receipt_code: receiptCode,
    })
    .eq('id', paymentId)
    .eq('payment_method', 'LINK')
    .select()
    .single();

  if (error) {
    console.error('Error confirming link payment as paid:', error);
    throw new Error('שגיאה באישור התשלום');
  }

  // יצירת התראה לוועד הבית
  try {
    const tenantName =
      `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'דייר';

    await notifyCommitteeAboutLinkPaymentCompleted({
      committeeUserId: data.committee_auth_user_id,
      tenantUserId: user.id,
      tenantName,
      monthYear: data.month_year,
      amount: Number(data.amount),
      paymentId: data.id,
      receiptCode: data.receipt_code,
    });
  } catch (notificationError) {
    console.error('Error creating link payment completed notification:', notificationError);
  }

  return data;
}

/**
 * ועד בית - שליפת כל התשלומים של הבניין לפי חודש
 */
export async function getBuildingPaymentsForMonth(monthYear = getCurrentMonthYear()) {
  const supabase = getSupabase();
  const { profile } = await getCurrentUserProfile();

  if (!profile.is_house_committee) {
    throw new Error('רק ועד בית יכול לצפות בתשלומי הבניין');
  }

  // 1. שליפת התשלומים של הבניין
  const { data: payments, error: paymentsError } = await supabase
    .from('house_fee_payments')
    .select('*')
    .eq('building_id', profile.building_id)
    .eq('month_year', monthYear)
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching building payments for month:', paymentsError);
    throw new Error('שגיאה בשליפת התשלומים של הבניין');
  }

  if (!payments || payments.length === 0) {
    return [];
  }

  // 2. שליפת כל ה-auth_uid של הדיירים
  const tenantIds = [...new Set(payments.map(p => p.tenant_auth_user_id).filter(Boolean))];

  const { data: tenantProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('auth_uid, first_name, last_name, building_id')
    .in('auth_uid', tenantIds);

  if (profilesError) {
    console.error('Error fetching tenant profiles:', profilesError);
    throw new Error('שגיאה בשליפת פרופילי הדיירים');
  }

  // 3. מיפוי מהיר לפי auth_uid
  const profileMap = {};
  for (const tenantProfile of tenantProfiles || []) {
    profileMap[tenantProfile.auth_uid] = tenantProfile;
  }

  // 4. מיזוג התשלומים עם פרופיל הדייר
  const mergedPayments = payments.map(payment => ({
    ...payment,
    tenant_profile: profileMap[payment.tenant_auth_user_id] || null,
  }));

  return mergedPayments;
}

/**
 * ועד בית - אישור תשלום מזומן
 */
export async function confirmCashPaymentByCommittee(paymentId) {
  const supabase = getSupabase();
  const { user, profile } = await getCurrentUserProfile();

  if (!profile.is_house_committee) {
    throw new Error('רק ועד בית יכול לאשר תשלום מזומן');
  }

  const receiptCode = generateReceiptCode();

  const { data, error } = await supabase
    .from('house_fee_payments')
    .update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
      receipt_code: receiptCode,
      confirmed_by_committee_auth_user_id: user.id,
    })
    .eq('id', paymentId)
    .eq('building_id', profile.building_id)
    .eq('payment_method', 'CASH')
    .select()
    .single();

  if (error) {
    console.error('Error confirming cash payment:', error);
    throw new Error('שגיאה באישור תשלום המזומן');
  }

  return data;
}

/**
 * ועד בית - סימון תשלום כנכשל / בוטל
 */
export async function markPaymentAsFailed(paymentId) {
  const supabase = getSupabase();
  const { profile } = await getCurrentUserProfile();

  if (!profile.is_house_committee) {
    throw new Error('רק ועד בית יכול לעדכן תשלום לנכשל');
  }

  const { data, error } = await supabase
    .from('house_fee_payments')
    .update({
      status: 'FAILED',
    })
    .eq('id', paymentId)
    .eq('building_id', profile.building_id)
    .select()
    .single();

  if (error) {
    console.error('Error marking payment as failed:', error);
    throw new Error('שגיאה בעדכון התשלום');
  }

  return data;
}