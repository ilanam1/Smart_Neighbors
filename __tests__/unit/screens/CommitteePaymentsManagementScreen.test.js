import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CommitteePaymentsManagementScreen from '../../../screens/CommitteePaymentsManagementScreen';
import {
  getBuildingPaymentsForMonth,
  confirmCashPaymentByCommittee,
  markPaymentAsFailed,
} from '../../../API/paymentsApi';

jest.mock('../../../API/paymentsApi', () => ({
  getBuildingPaymentsForMonth: jest.fn(),
  confirmCashPaymentByCommittee: jest.fn(),
  markPaymentAsFailed: jest.fn(),
}));

describe('CommitteePaymentsManagementScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads and renders payments on mount', async () => {
    getBuildingPaymentsForMonth.mockResolvedValueOnce([
      {
        id: 'p1',
        amount: 200,
        payment_method: 'CASH',
        status: 'CASH_REQUESTED',
        month_year: '2026-04',
        tenant_profile: { first_name: 'Jane', last_name: 'Shepard' }
      }
    ]);

    const { getByText } = render(<CommitteePaymentsManagementScreen />);

    // Wait for loading to finish and data to appear
    await waitFor(() => {
      expect(getByText('ניהול תשלומי ועד הבית')).toBeTruthy();
      expect(getByText('Jane Shepard')).toBeTruthy();
    });

    expect(getByText('סכום: 200 ₪')).toBeTruthy();
    expect(getByText('סטטוס: CASH_REQUESTED')).toBeTruthy();
    expect(getBuildingPaymentsForMonth).toHaveBeenCalled();
  });

  test('renders empty state when no payments exist', async () => {
    getBuildingPaymentsForMonth.mockResolvedValueOnce([]);

    const { getByText } = render(<CommitteePaymentsManagementScreen />);

    await waitFor(() => {
      expect(getByText('אין תשלומים להצגה עבור חודש זה')).toBeTruthy();
    });
  });

  test('handleConfirmCash confirms payment and reloads list', async () => {
    getBuildingPaymentsForMonth.mockResolvedValueOnce([
      {
        id: '123',
        amount: 150,
        payment_method: 'CASH',
        status: 'CASH_REQUESTED',
        month_year: '2026-04',
        tenant_profile: null
      }
    ]);

    confirmCashPaymentByCommittee.mockResolvedValueOnce({ success: true });
    getBuildingPaymentsForMonth.mockResolvedValueOnce([]); // reload after confirm

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<CommitteePaymentsManagementScreen />);

    await waitFor(() => {
      expect(getByText('אשר תשלום מזומן')).toBeTruthy();
    });

    fireEvent.press(getByText('אשר תשלום מזומן'));

    await waitFor(() => {
      expect(confirmCashPaymentByCommittee).toHaveBeenCalledWith('123');
      expect(alertSpy).toHaveBeenCalledWith('הצלחה', 'תשלום המזומן אושר בהצלחה');
    });

    expect(getBuildingPaymentsForMonth).toHaveBeenCalledTimes(2);

    alertSpy.mockRestore();
  });

  test('handleMarkFailed marks a payment as failed and reloads', async () => {
    getBuildingPaymentsForMonth.mockResolvedValueOnce([
      {
        id: '456',
        amount: 300,
        payment_method: 'TRANSFER',
        status: 'PENDING',
        month_year: '2026-04',
      }
    ]);

    markPaymentAsFailed.mockResolvedValueOnce({ success: true });
    getBuildingPaymentsForMonth.mockResolvedValueOnce([]); // reload after mark failed
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<CommitteePaymentsManagementScreen />);

    await waitFor(() => {
      expect(getByText('סמן כנכשל')).toBeTruthy();
    });

    fireEvent.press(getByText('סמן כנכשל'));

    await waitFor(() => {
      expect(markPaymentAsFailed).toHaveBeenCalledWith('456');
      expect(alertSpy).toHaveBeenCalledWith('עודכן', 'התשלום סומן כנכשל');
    });

    expect(getBuildingPaymentsForMonth).toHaveBeenCalledTimes(2);

    alertSpy.mockRestore();
  });

  test('handles API errors elegantly', async () => {
    getBuildingPaymentsForMonth.mockRejectedValueOnce(new Error('Network error'));
    
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<CommitteePaymentsManagementScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'Network error');
    });

    alertSpy.mockRestore();
  });

  test('allows changing monthYear input and reloading', async () => {
    getBuildingPaymentsForMonth.mockResolvedValue([]);
    
    const { getByPlaceholderText, getByText } = render(<CommitteePaymentsManagementScreen />);
    
    await waitFor(() => {
      expect(getByText('טען תשלומים')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('2026-04'), '2025-10');
    fireEvent.press(getByText('טען תשלומים'));

    await waitFor(() => {
      expect(getBuildingPaymentsForMonth).toHaveBeenCalledWith('2025-10');
    });
  });
});
