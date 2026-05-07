import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

// מפתחות סודיים נמשכים תמיד ממשתני סביבה כדי לא להחשף בקוד
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // טיפול בבקשות CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency = 'ils', buildingId, tenantUserId, monthYear } = await req.json()

    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    // המרה לאגורות כי סטרייפ מקבל מספרים שלמים בלבד
    const amountInCents = Math.round(amount * 100)

    // יצירת בקשת תשלום מול השרתים של סטרייפ
    // metadata משמש למעקב – לאיזה בניין וחודש שייך התשלום
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      metadata: {
        building_id:     buildingId    || '',
        tenant_user_id:  tenantUserId  || '',
        month_year:      monthYear     || '',
        app:             'smart_neighbors',
      },
    })

    // מחזירים למובייל את המפתח הייחודי להפעלת תהליך התשלום באפליקציה בלי לחשוף מפתחות
    return new Response(
      JSON.stringify({ 
        clientSecret:    paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
