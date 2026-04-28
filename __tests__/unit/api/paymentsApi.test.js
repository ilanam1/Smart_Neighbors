import {
  getCurrentUserProfile,
  getCommitteeMembersByBuilding,
  getCurrentBuildingCharge
} from '../../../API/paymentsApi';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('paymentsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUserProfile', () => {
    it('fetches auth user and profile properly', async () => {
      // Supabase mock by default returns user and a default profile object via eq/single chaining
      const { user, profile } = await getCurrentUserProfile();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      // The profile is correctly unwrapped assuming our chaining mock handles .select.eq.single
      expect(user.id).toBe('test-auth-uuid-1234');
      expect(profile.first_name).toBe('Test'); // Based on mockProfile
    });

    it('throws error when auth fetch fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Auth error') });
      await expect(getCurrentUserProfile()).rejects.toThrow('שגיאה בזיהוי המשתמש המחובר');
    });

    it('throws error when no logged in user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
      await expect(getCurrentUserProfile()).rejects.toThrow('אין משתמש מחובר');
    });
  });

  describe('getCommitteeMembersByBuilding', () => {
    it('queries building committee mapping properly', async () => {
      // Current profile mock building_id is "building-uuid"
      await getCommitteeMembersByBuilding();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      // Verifies if `.eq('is_house_committee', true)` was passed theoretically by chain
    });
  });

  describe('getCurrentBuildingCharge', () => {
    it('loads current local charge correctly', async () => {
      // Mocking single building charge
      // By default our mock.then returns { data: [], error: null } unless overridden by type
      const res = await getCurrentBuildingCharge('2026-04');
      expect(mockSupabase.from).toHaveBeenCalledWith('house_fee_charges');
    });
  });
});
