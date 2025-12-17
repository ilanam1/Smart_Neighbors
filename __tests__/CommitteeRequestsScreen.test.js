import React from 'react';
import { render } from '@testing-library/react-native';
import CommitteeRequestsScreen from '../screens/CommitteeRequestsScreen';

jest.mock('../DataBase/supabase', () => {
  const from = jest.fn();
  const supabase = { from };
  return { getSupabase: () => supabase };
});

const { getSupabase } = require('../DataBase/supabase');
const supabase = getSupabase();

describe('CommitteeRequestsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('מציג הודעת "אין עדיין בקשות מהדיירים." כשהרשימה ריקה', async () => {
    const selectMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });

    supabase.from.mockReturnValue({
      select: selectMock,
      order: orderMock,
    });

    const { findByText } = render(<CommitteeRequestsScreen />);

    // findByText מחכה אוטומטית (עם act) עד שהטקסט יופיע
    const emptyTextNode = await findByText(/אין עדיין בקשות מהדיירים\./i);
    expect(emptyTextNode).toBeTruthy();
  });

  test('מציג כרטיסים כשיש בקשות', async () => {
    const selectMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        { id: 1, title: 'עזרה בסחיבה', description: 'צריך עזרה עם ספה' },
      ],
      error: null,
    });

    supabase.from.mockReturnValue({
      select: selectMock,
      order: orderMock,
    });

    const { findByText, queryByText } = render(<CommitteeRequestsScreen />);

    // בהתחלה (בזמן טעינה) *לא* צריך לראות את טקסט ה"אין בקשות"
    expect(queryByText(/אין עדיין בקשות מהדיירים\./i)).toBeNull();

    // אחרי שהנתונים נטענים – אמור להופיע כרטיס עם הכותרת
    const titleNode = await findByText('עזרה בסחיבה');
    const bodyNode = await findByText('צריך עזרה עם ספה');

    expect(titleNode).toBeTruthy();
    expect(bodyNode).toBeTruthy();
  });
});
