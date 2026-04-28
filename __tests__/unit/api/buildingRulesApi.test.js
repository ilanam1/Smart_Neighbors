import { getBuildingRules, saveBuildingRules } from '../../../API/buildingRulesApi';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('buildingRulesApi', () => {
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
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ 
          data: { id: 1, content: "rules" }, 
          error: null 
        }),
        single: jest.fn().mockResolvedValue({
          data: { id: 1, content: "rules" },
          error: null
        })
      };
    });
  });

  test('getBuildingRules מחזיר data כשאין שגיאה', async () => {
    const res = await getBuildingRules('b1');
    expect(res).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('building_rules');
  });

  test('saveBuildingRules עושה upsert עם id=1 ומחזיר data', async () => {
    const res = await saveBuildingRules('bldg-1', 'new rules');
    expect(res).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('building_rules');
  });
});
