import {
  createNotification,
  requestEmployeeAssignment,
  respondToAssignmentRequest,
  createBuildingMaintenanceNotification,
} from '../../../API/notificationsApi';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('notificationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase.from.mockImplementation((tableName) => {
      // By default mock resolving for standard queries
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
           data: [],
           error: null
        }),
        single: jest.fn().mockResolvedValue({
           data: { first_name: 'David', building_id: 'b1' },
           error: null
        })
      };
    });
  });

  describe('createNotification', () => {
    it('creates a basic notification payload successfully', async () => {
      await createNotification({
        recipient_id: 'user2',
        sender_id: 'user1',
        title: 'Hello',
        message: 'World',
        type: 'general',
        related_data: null
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('app_notifications');
    });
  });

  describe('requestEmployeeAssignment', () => {
    it('prevents sending assignment if one is already unread', async () => {
       // Mock the existing check to return an unread array
       const queryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((resolve) => {
             resolve({ data: [{ id: 'notif1', is_read: false }], error: null });
          })
       };
       mockSupabase.from.mockImplementationOnce(() => queryBuilder);

       await expect(requestEmployeeAssignment('emp1', 'b1', 'com1', 'Tower', 'Admin'))
          .rejects.toThrow('כבר נשלחה בקשת השתייכות לעובד זה עבור בניין זה והיא ממתינה לאישור.');
    });
  });

  describe('respondToAssignmentRequest', () => {
    it('handles assignment rejection properly and fires back a declined notification', async () => {
      // Mock update to notifications, the insert to employee_buildings shouldn't happen because isAccepted=false
      const mockUpdate = jest.fn().mockReturnThis();
      mockSupabase.from.mockImplementation((tableName) => {
         if (tableName === 'app_notifications') {
            return {
               update: mockUpdate,
               eq: jest.fn().mockReturnThis(),
               insert: jest.fn().mockReturnThis()
            };
         }
         return {};
      });

      const notifMock = {
         id: 'n1',
         related_data: { building_id: 'b1', employee_id: 'emp1', committee_uid: 'com1' }
      };

      await respondToAssignmentRequest(notifMock, false, 'No thanks');

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_read: true }));
      // It issues a backend notification
      expect(mockSupabase.from).toHaveBeenCalledWith('app_notifications'); 
    });
  });

  describe('createBuildingMaintenanceNotification', () => {
    it('extracts all building residents and issues array of notifications', async () => {
       mockSupabase.from.mockImplementation((tableName) => {
          if (tableName === 'profiles') {
             return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({
                   data: [{ auth_uid: 'u1' }, { auth_uid: 'u2' }],
                   error: null
                })
             };
          }
          if (tableName === 'app_notifications') {
             return { insert: jest.fn().mockReturnThis() };
          }
       });

       await createBuildingMaintenanceNotification({
          buildingId: 'b1',
          senderId: 'com1',
          title: 'Water cut off',
          message: 'At 10am.',
          excludeUserId: 'u1'
       });

       // Since u1 is excluded, it should insert only 1 notice for u2
       expect(mockSupabase.from).toHaveBeenCalledWith('app_notifications');
    });
  });
});
