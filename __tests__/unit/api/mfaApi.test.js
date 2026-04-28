import {
  enrollMfa,
  challengeMfa,
  verifyMfa,
  listMfaFactors,
  unenrollMfa,
  getAssuranceLevel
} from '../../../API/mfaApi';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('mfaApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Add missing mock functions specifically for these tests dynamically
    mockSupabase.auth.mfa.enroll = jest.fn();
    mockSupabase.auth.mfa.unenroll = jest.fn();
  });

  it('enrollMfa calls supabase mfa enroll with totp', async () => {
    mockSupabase.auth.mfa.enroll.mockResolvedValueOnce({ data: { id: 'factor_1' }, error: null });
    const res = await enrollMfa();
    expect(mockSupabase.auth.mfa.enroll).toHaveBeenCalledWith({ factorType: 'totp' });
    expect(res.id).toBe('factor_1');
  });

  it('challengeMfa generates a challenge for given factor', async () => {
    mockSupabase.auth.mfa.challenge.mockResolvedValueOnce({ data: { id: 'challenge_1' }, error: null });
    const res = await challengeMfa('factor_1');
    expect(mockSupabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'factor_1' });
    expect(res.id).toBe('challenge_1');
  });

  it('verifyMfa calls API with factor, challenge, and code', async () => {
    mockSupabase.auth.mfa.verify.mockResolvedValueOnce({ data: { success: true }, error: null });
    const res = await verifyMfa('factor_1', 'challenge_1', '123456');
    expect(mockSupabase.auth.mfa.verify).toHaveBeenCalledWith({ factorId: 'factor_1', challengeId: 'challenge_1', code: '123456' });
    expect(res.success).toBe(true);
  });

  it('listMfaFactors retrieves factors', async () => {
    mockSupabase.auth.mfa.listFactors.mockResolvedValueOnce({ data: { totp: [{ id: 'f1' }] }, error: null });
    const res = await listMfaFactors();
    expect(mockSupabase.auth.mfa.listFactors).toHaveBeenCalled();
    expect(res.totp.length).toBe(1);
  });

  it('unenrollMfa removes the factor', async () => {
    mockSupabase.auth.mfa.unenroll.mockResolvedValueOnce({ data: { success: true }, error: null });
    const res = await unenrollMfa('factor_1');
    expect(mockSupabase.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'factor_1' });
    expect(res.success).toBe(true);
  });

  it('getAssuranceLevel correctly pulls AAL stats', async () => {
    mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    const res = await getAssuranceLevel();
    expect(mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel).toHaveBeenCalled();
    expect(res.currentLevel).toBe('aal1');
    expect(res.nextLevel).toBe('aal2');
  });

  it('throws standard error if supabase returns one', async () => {
    mockSupabase.auth.mfa.enroll.mockResolvedValueOnce({ data: null, error: new Error('Enrollment failed') });
    await expect(enrollMfa()).rejects.toThrow('Enrollment failed');
  });
});
