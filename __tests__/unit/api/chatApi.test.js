import {
  sendMessage,
  getMessages
} from '../../../API/chatApi';

import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

// Mock crypto module to intercept encrypt/decrypt operations
jest.mock('../../../utils/crypto', () => ({
  encryptMessage: jest.fn((text) => `ENCRYPTED_${text}`),
  decryptMessage: jest.fn((text) => text.toString().replace('ENCRYPTED_', '')),
}));

const crypto = require('../../../utils/crypto');

describe('chatApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('encrypts the content before inserting it into database', async () => {
      // Deep mock for interleaved DB calls (profiles -> messages)
      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'prof_2' } })
          };
        }
        if (tableName === 'messages') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'msg1', content: 'ENCRYPTED_Hello World' },
              error: null
            })
          };
        }
        return {
           update: jest.fn().mockReturnThis(),
           eq: jest.fn().mockReturnThis()
        };
      });

      await sendMessage('convo_1', 'auth_user_2', 'Hello World');

      // Verify crypto wrapper was called
      expect(crypto.encryptMessage).toHaveBeenCalledWith('Hello World');
    });
  });

  describe('getMessages', () => {
    it('decrypts the content after pulling from the database', async () => {
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { id: '1', content: 'ENCRYPTED_Secret1' },
            { id: '2', content: 'ENCRYPTED_Secret2' },
          ],
          error: null
        })
      }));

      const messages = await getMessages('convo_1');

      // Verify length
      expect(messages.length).toBe(2);

      // Verify the decryption algorithm triggered
      expect(crypto.decryptMessage).toHaveBeenCalledWith('ENCRYPTED_Secret1');
      expect(crypto.decryptMessage).toHaveBeenCalledWith('ENCRYPTED_Secret2');

      // Verify output
      expect(messages[0].content).toBe('Secret1');
      expect(messages[1].content).toBe('Secret2');
    });
  });
});
