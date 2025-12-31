// paymentsApi.js
// פונקציות עבודה עם תשלומי ועד הבית

import { getSupabase } from '../DataBase/supabase';

export async function getCommitteeMembers() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .select('auth_uid, first_name, last_name, committee_payment_link, is_house_committee')
    .eq('is_house_committee', true)
    .not('committee_payment_link', 'is', null);

  console.log('committee data = ', data);
  console.log('committee error = ', error);

  if (error) {
    console.error('Error fetching committee members:', error);
    throw new Error('שגיאה בשליפת חברי הוועד');
  }

  return data || [];
}


/**
 * יצירת רשומת תשלום חדשה בטבלת house_fee_payments
 */
export async function createHouseFeePayment({
  committeeAuthUserId,
  amount,
  monthYear,
}) {
  const supabase = getSupabase();

  // מביאים את המשתמש המחובר
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching current user for payment:', userError);
    throw new Error('שגיאה בזיהוי המשתמש המחובר');
  }

  if (!user) {
    throw new Error('אין משתמש מחובר – התחבר לפני תשלום מיסי ועד.');
  }

  const { data, error } = await supabase
    .from('house_fee_payments')
    .insert([
      {
        tenant_auth_user_id: user.id,
        committee_auth_user_id: committeeAuthUserId,
        amount,
        month_year: monthYear,
        status: 'INITIATED',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating house fee payment:', error);
    throw new Error('שגיאה ביצירת רשומת התשלום');
  }

  return data;
}

/**
 * סימון תשלום כבוצע (אופציונלי, לשימוש אחרי שחוזרים מהתשלום)
 */
export async function markPaymentAsPaid(paymentId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('house_fee_payments')
    .update({ status: 'PAID' })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error marking payment as PAID:', error);
    throw new Error('שגיאה בעדכון סטטוס התשלום');
  }

  return data;
}
