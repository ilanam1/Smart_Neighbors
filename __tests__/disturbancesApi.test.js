import {
  createDisturbanceReport,
  getMyDisturbanceReports,
} from '../disturbancesApi';

jest.mock('../DataBase/supabase', () => {
  const auth = { getUser: jest.fn() };
  const from = jest.fn();
  const supabase = { auth, from };
  return { getSupabase: () => supabase };
});

const { getSupabase } = require('../DataBase/supabase');
const supabase = getSupabase();

describe('disturbancesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createDisturbanceReport – יוצר דיווח כשהמשתמש מחובר', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const insertMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({
      data: { id: 10, type: 'NOISE' },
      error: null,
    });

    supabase.from.mockReturnValue({
      insert: insertMock,
      select: selectMock,
      single: singleMock,
    });

    const data = await createDisturbanceReport({
      type: 'NOISE',
      severity: 'HIGH',
      description: 'Very loud',
      occurredAt: '2025-01-01T10:00:00Z',
      location: 'Lobby',
    });

    expect(supabase.from).toHaveBeenCalledWith('disturbance_reports');
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        auth_user_id: 'user-123',
        type: 'NOISE',
      }),
    ]);
    expect(data.id).toBe(10);
  });

  test('getMyDisturbanceReports – מחזיר דיווחים של המשתמש', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }],
      error: null,
    });

    supabase.from.mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    });

    const data = await getMyDisturbanceReports();

    expect(eqMock).toHaveBeenCalledWith('auth_user_id', 'user-123');
    expect(data.length).toBe(2);
  });
});
