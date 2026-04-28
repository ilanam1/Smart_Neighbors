import {
  createRequest,
  getOpenRequests,
  getPublicRequests,
  updateRequest,
  cancelRequest,
  completeRequest
} from '../../../API/requestsApi';

import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('requestsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // We enhance the default mock's maybeSingle for profiles if needed
    // The default in setup.js already resolves to { data: mockProfile } for profiles table
    // For other tables, it defaults to {}, so we need to override `insert`, `update`, `eq` for requests table
    mockSupabase.from.mockImplementation((tableName) => {
      if (tableName === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ 
            data: { building_id: 'bldg-123', is_blocked: false } 
          })
        };
      }
      
      // For requests table
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(), // Added to support getOpenRequests
        single: jest.fn().mockResolvedValue({
          data: { id: 'req_1', title: 'Leaking pipe' },
          error: null
        })
      };
    });
  });

  describe('createRequest', () => {
    it('creates a new request successfully with current user data', async () => {
      const newRequestData = {
        title: 'Heater broken',
        description: 'No hot water',
        category: 'Plumbing',
        urgency: 'HIGH'
      };

      const result = await createRequest(newRequestData);

      expect(mockSupabase.from).toHaveBeenCalledWith('requests');
      expect(result.title).toBe('Leaking pipe'); // From our mock
    });
    
    it('throws error if user is blocked', async () => {
      // Override profile mock specially for this test
      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ 
              data: { building_id: 'bldg-123', is_blocked: true } 
            })
          };
        }
        return { insert: jest.fn().mockReturnThis() };
      });
      
      await expect(createRequest({ title: 'Test' })).rejects.toThrow('המשתמש חסום זמנית מפעילות במערכת');
    });
  });

  describe('getOpenRequests', () => {
    it('fetches open requests mapped to the users active building', async () => {
      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'profiles') {
          return {
             select: jest.fn().mockReturnThis(),
             eq: jest.fn().mockReturnThis(),
             maybeSingle: jest.fn().mockResolvedValue({ data: { building_id: 'bldg-1', is_blocked: false } })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          // Returns resolved array of requests
          order: jest.fn().mockResolvedValue({ data: [{ id: 'req1' }, { id: 'req2' }], error: null })
        };
      });

      const res = await getOpenRequests();
      expect(res.length).toBe(2);
      expect(res[0].id).toBe('req1');
    });
  });

  describe('updateRequest, cancelRequest, completeRequest', () => {
    it('updates request specifics', async () => {
      const result = await updateRequest('req_1', { urgency: 'LOW' });
      expect(result.id).toBe('req_1');
    });

    it('cancels the specified request logically', async () => {
      const result = await cancelRequest('req_1');
      expect(result.id).toBe('req_1');
    });

    it('marks request completed', async () => {
      const result = await completeRequest('req_1');
      expect(result.id).toBe('req_1');
    });
  });
});
