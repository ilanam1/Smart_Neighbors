import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateRequestScreen from '../../../screens/CreateRequestScreen';
import { Alert } from 'react-native';
import { createRequest } from '../../../API/requestsApi';

jest.mock('../../../API/requestsApi', () => ({
  createRequest: jest.fn()
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('CreateRequestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows error alert if title or description are empty', () => {
    const { getByText } = render(<CreateRequestScreen />);
    
    // Press submit immediately without filling info
    fireEvent.press(getByText('פרסם בקשה'));
    
    expect(Alert.alert).toHaveBeenCalledWith('שגיאה', 'נא למלא כותרת לבקשה.');
  });

  it('submits successfully when fields are filled securely', async () => {
    createRequest.mockResolvedValueOnce({ id: 'r1' });
    
    const { getByText, getByPlaceholderText } = render(<CreateRequestScreen />);
    const titleInput = getByPlaceholderText('לדוגמה: מי יכול להשאיל לי מקדחה?');
    const descInput = getByPlaceholderText('תאר בקצרה מה אתה צריך, מתי, ואם יש פרטים חשובים...');

    fireEvent.changeText(titleInput, 'Need hammer');
    fireEvent.changeText(descInput, 'Need a heavy hammer today.');

    // Select category explicitly (by default it's ITEM_LOAN, we'll hit PHYSICAL_HELP)
    fireEvent.press(getByText('עזרה פיזית'));
    
    // Select committee visibility
    fireEvent.press(getByText('רק לוועד הבית'));

    // Submit
    fireEvent.press(getByText('פרסם בקשה'));

    await waitFor(() => {
      expect(createRequest).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Need hammer',
        description: 'Need a heavy hammer today.',
        category: 'PHYSICAL_HELP',
        isCommitteeOnly: true
      }));

      expect(Alert.alert).toHaveBeenCalledWith(
        'הצלחה',
        'הבקשה פורסמה בהצלחה!',
        expect.any(Array)
      );
    });
  });
});
