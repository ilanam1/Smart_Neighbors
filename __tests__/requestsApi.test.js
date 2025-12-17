// __tests__/requestsApi.test.js
import { createRequest, getOpenRequests, cancelRequest } from '../requestsApi';

// נִלעג (mock) את מודול Supabase
jest.mock('../DataBase/supabase', () => {
  const auth = { getUser: jest.fn() };
  const from = jest.fn();

  const supabase = { auth, from };

  return {
    getSupabase: () => supabase,
  };
});

const { getSupabase } = require('../DataBase/supabase');
const supabase = getSupabase();

describe('requestsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createRequest – יוצר בקשה כשהמשתמש מחובר', async () => {
    // 1. משתמש מחובר
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // 2. שרשרת from().insert().select().single()
    const insertMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({
      data: { id: 1, title: 'Test', status: 'OPEN' },
      error: null,
    });

    supabase.from.mockReturnValue({
      insert: insertMock,
      select: selectMock,
      single: singleMock,
    });

    const result = await createRequest({
      title: 'Test',
      description: 'Test desc',
      category: 'OTHER',
      urgency: 'LOW',
    });

    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('requests');
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Test',
        category: 'OTHER',
        urgency: 'LOW',
        auth_user_id: 'user-123',
      }),
    ]);
    expect(result).toEqual({ id: 1, title: 'Test', status: 'OPEN' });
  });

  test('createRequest – זורק שגיאה כשאין משתמש מחובר', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(
      createRequest({
        title: 'X',
        description: 'Y',
        category: 'OTHER',
        urgency: 'LOW',
      })
    ).rejects.toThrow('אין משתמש מחובר');
  });

  test('getOpenRequests – מחזיר רשימה של בקשות פתוחות', async () => {
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockResolvedValue({
      data: [{ id: 1, status: 'OPEN' }],
      error: null,
    });

    supabase.from.mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    });

    const data = await getOpenRequests();

    expect(supabase.from).toHaveBeenCalledWith('requests');
    expect(eqMock).toHaveBeenCalledWith('status', 'OPEN');
    expect(data).toEqual([{ id: 1, status: 'OPEN' }]);
  });

  test('cancelRequest – משנה סטטוס ל-CANCELLED', async () => {
    const updateMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({
      data: { id: 1, status: 'CANCELLED' },
      error: null,
    });

    supabase.from.mockReturnValue({
      update: updateMock,
      eq: eqMock,
      select: selectMock,
      single: singleMock,
    });

    const data = await cancelRequest(1);

    expect(supabase.from).toHaveBeenCalledWith('requests');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED' })
    );
    expect(eqMock).toHaveBeenCalledWith('id', 1);
    expect(data.status).toBe('CANCELLED');
  });
});
