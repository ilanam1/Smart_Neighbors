import { createPaymentIntent } from '../../../API/stripeApi';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('stripeApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls create-payment-intent edge function with correct parameters', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { clientSecret: 'secret_123', paymentIntentId: 'pi_123' },
      error: null
    });

    const result = await createPaymentIntent(500, 'usd');
    
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
      body: { amount: 500, currency: 'usd' }
    });
    
    expect(result.clientSecret).toBe('secret_123');
    expect(result.paymentIntentId).toBe('pi_123');
  });

  it('throws an error if Supabase functions API fails', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Network error' }
    });

    await expect(createPaymentIntent(100)).rejects.toThrow('שגיאה ביצירת נתוני התשלום בשרת (Stripe)');
  });

  it('throws an error if edge function returns internal Stripe error payload', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { error: 'Insufficient funds on test card' },
      error: null
    });

    await expect(createPaymentIntent(100)).rejects.toThrow('שגיאת שרת סליקה: Insufficient funds on test card');
  });
});
