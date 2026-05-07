// API/stripeApi.js
import { getSupabase } from '../DataBase/supabase';

/**
 * קריאה לפונקציית השרת ליצירת כוונת חיוב מול Stripe
 * מחזירה את ה-clientSecret שנדרש להפעלת טופס כרטיס האשראי
 * @param {number} amount - סכום בשקלים
 * @param {string} currency - מטבע (ברירת מחדל: 'ils')
 * @param {object} meta - מטא-דאטה נוסף: { buildingId, tenantUserId, monthYear }
 */
export async function createPaymentIntent(amount, currency = 'ils', meta = {}) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: {
      amount,
      currency,
      buildingId:    meta.buildingId    || null,
      tenantUserId:  meta.tenantUserId  || null,
      monthYear:     meta.monthYear     || null,
    },
  });

  if (error) {
    console.error('Error invoking create-payment-intent:', error);
    throw new Error('שגיאה ביצירת נתוני התשלום בשרת (Stripe)');
  }

  if (data?.error) {
    console.error('Stripe edge function error:', data.error);
    throw new Error(`שגיאת שרת סליקה: ${data.error}`);
  }

  return {
    clientSecret:    data.clientSecret,
    paymentIntentId: data.paymentIntentId,
  };
}
