// API/stripeApi.js
import { getSupabase } from '../DataBase/supabase';

/**
 * קריאה לפונקציית השרת ליצירת כוונת חיוב מול Stripe
 * מחזירה את ה-clientSecret שנדרש להפעלת טופס כרטיס האשראי
 */
export async function createPaymentIntent(amount, currency = 'ils') {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { amount, currency },
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
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId
  };
}
