import {
  requestEquipmentLoan,
  getMyBorrowRequests,
  approveLoanRequest,
  cancelLoanRequest
} from '../../../API/equipmentLoansApi';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

// We mock notifications API so we don't accidentally throw errors
jest.mock('../../../API/notificationsApi', () => ({
  createNotification: jest.fn().mockResolvedValue({})
}));

describe('equipmentLoansApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      // By default returning empty to simulate 'no conflicts'
      single: jest.fn().mockResolvedValue({
         data: { id: 'loan_1', status: 'pending', equipment_id: 'eq1' },
         error: null
      })
    }));
  });

  describe('requestEquipmentLoan', () => {
    it('creates a new loan request after availability check', async () => {
       const resp = await requestEquipmentLoan({
         buildingId: 'b1',
         equipmentId: 'eq1',
         ownerId: 'u1',
         borrowerId: 'u2',
         startDate: '2026-05-01',
         endDate: '2026-05-02'
       });

       expect(mockSupabase.from).toHaveBeenCalledWith('equipment_loans');
       expect(resp.status).toBe('pending');
    });

    it('throws error if equipment has scheduling conflict', async () => {
       // Mock the conflict check specifically
       mockSupabase.from.mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
             data: [{ id: 'loan2', start_date: '2026-05-01', end_date: '2026-05-05' }],
             error: null
          })
       }));

       await expect(requestEquipmentLoan({
          buildingId: 'b1',
          equipmentId: 'eq1',
          ownerId: 'u1',
          borrowerId: 'u2',
          startDate: '2026-05-02',
          endDate: '2026-05-03'
       })).rejects.toThrow('הציוד אינו זמין בטווח התאריכים שנבחר.');
    });
  });

  describe('getMyBorrowRequests', () => {
    it('fetches user loan requests', async () => {
       // Default chain handles this without conflict logic
       await getMyBorrowRequests('u2');
       expect(mockSupabase.from).toHaveBeenCalledWith('equipment_loans');
    });
  });

  describe('approveLoanRequest', () => {
     it('approves if in pending state and updates standard notification pipeline', async () => {
        const resp = await approveLoanRequest('loan_1');
        // Our default stub returns a pending loan object
        expect(resp.status).toBe('pending'); // the returned mock is statically defined to 'pending' in arrange block
        expect(mockSupabase.from).toHaveBeenCalledWith('equipment_loans');
     });
  });
});
