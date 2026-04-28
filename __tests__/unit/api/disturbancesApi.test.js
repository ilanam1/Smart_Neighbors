import {
  createDisturbanceReport,
  getMyDisturbanceReports,
  getBuildingDisturbanceReports
} from '../../../API/disturbancesApi';

import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('disturbancesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase.from.mockImplementation((tableName) => {
      if (tableName === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ 
            data: { building_id: 'bldg-1', is_blocked: false } 
          })
        };
      }
      
      // For disturbance_reports
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 'dist1' }, { id: 'dist2' }],
          error: null
        }),
        single: jest.fn().mockResolvedValue({
          data: { id: 'dist1', severity: 'HIGH' },
          error: null
        })
      };
    });
  });

  describe('createDisturbanceReport', () => {
    it('creates a disturbance mapped to user building', async () => {
      const resp = await createDisturbanceReport({
        type: 'NOISE',
        severity: 'HIGH',
        description: 'Loud music',
        occurredAt: '2026-04-28'
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('disturbance_reports');
      expect(resp.severity).toBe('HIGH');
    });
  });

  describe('getMyDisturbanceReports', () => {
    it('fetches personal disturbance reports strictly', async () => {
      const reports = await getMyDisturbanceReports();
      expect(mockSupabase.from).toHaveBeenCalledWith('disturbance_reports');
      expect(reports.length).toBe(2);
    });
  });

  describe('getBuildingDisturbanceReports', () => {
    it('fetches all building reports for committee view', async () => {
      const reports = await getBuildingDisturbanceReports();
      expect(mockSupabase.from).toHaveBeenCalledWith('disturbance_reports');
      expect(reports.length).toBe(2);
    });
  });
});
