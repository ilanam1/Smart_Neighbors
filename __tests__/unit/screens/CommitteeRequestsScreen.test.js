import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import CommitteeRequestsScreen from '../../../screens/CommitteeRequestsScreen';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('CommitteeRequestsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });



  test('מציג כרטיסים כשיש בקשות', async () => {
    mockSupabase.from.mockImplementation((tableName) => {
      if (tableName === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ 
            data: { building_id: 'b1', is_blocked: false } 
          })
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 1, title: 'עזרה בסחיבה', description: 'צריך עזרה עם ספה' }],
          error: null,
        })
      };
    });

    const { findByText, queryByText } = render(<CommitteeRequestsScreen />);

    const titleNode = await findByText('עזרה בסחיבה');
    const bodyNode = await findByText('צריך עזרה עם ספה');

    expect(titleNode).toBeTruthy();
    expect(bodyNode).toBeTruthy();
  });
});
