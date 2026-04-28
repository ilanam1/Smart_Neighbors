import {
  getBuildingEquipment,
  createEquipmentItem,
  getRecommendedBuildingEquipmentByCategory
} from '../../../API/buildingEquipmentApi';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('buildingEquipmentApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBuildingEquipment', () => {
    it('fetches building equipment successfully', async () => {
      mockSupabase.from.mockImplementationOnce(() => ({
         select: jest.fn().mockReturnThis(),
         eq: jest.fn().mockReturnThis(),
         order: jest.fn().mockResolvedValue({
            data: [{ id: 'eq1', title: 'Drill' }],
            error: null
         })
      }));

      const results = await getBuildingEquipment('bldg-1');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Drill');
    });
  });

  describe('createEquipmentItem', () => {
    it('creates an item and defaults availability to true', async () => {
       mockSupabase.from.mockImplementationOnce(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
             data: { id: 'eq2', is_available: true },
             error: null
          })
       }));

       const newItem = await createEquipmentItem({
          buildingId: 'b1', ownerId: 'u1', categoryId: 'c1', title: 'Ladder'
       });

       expect(newItem.is_available).toBe(true);
    });
  });

  describe('getRecommendedBuildingEquipmentByCategory', () => {
    it('scores equipment appropriately using recommendation algorithm', async () => {
       // Mock the equipment fetch
       mockSupabase.from.mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
             data: [
                { id: 'eq1', owner_id: 'owner1', is_available: true },
                { id: 'eq2', owner_id: 'owner2', is_available: false } // Not available
             ],
             error: null
          })
       }));

       // Mock the owner stats fetch (getOwnerStatsMap)
       mockSupabase.from.mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
             data: [
                { owner_id: 'owner1', status: 'returned' },
                { owner_id: 'owner1', status: 'approved' },
                { owner_id: 'owner2', status: 'rejected' }
             ],
             error: null
          })
       }));

       const recommendations = await getRecommendedBuildingEquipmentByCategory('b1', 'c1');
       
       // Algorithm adds recommendation flags based on score:
       // owner1: 1 return (+3), 1 approval (+2) = 5
       expect(recommendations[0].owner_id).toBe('owner1');
       expect(recommendations[0].isFastBorrowRecommended).toBe(true);
       expect(recommendations[0].ownerScore).toBe(5);
       
       // owner2 should be sorted later due to not available, score -1
       expect(recommendations[1].owner_id).toBe('owner2');
       expect(recommendations[1].isFastBorrowRecommended).toBe(false);
       expect(recommendations[1].ownerScore).toBe(-1);
    });
  });
});
