import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CommitteePaymentsManagementScreen from '../../../screens/CommitteePaymentsManagementScreen';
import {
  getBuildingPaymentsForMonth,
  confirmCashPaymentByCommittee,
  markPaymentAsFailed,
  getBuildingWallet,
  getBuildingMonthlySummary,
} from '../../../API/paymentsApi';

jest.mock('../../../API/paymentsApi', () => ({
  getBuildingPaymentsForMonth: jest.fn(),
  confirmCashPaymentByCommittee: jest.fn(),
  markPaymentAsFailed: jest.fn(),
  getBuildingWallet: jest.fn(),
  getBuildingMonthlySummary: jest.fn(),
}));

// Setup helper for month formatting in tests
function getCurrentMonthYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthHebrew(monthYear) {
  if (!monthYear) return '';
  const [year, month] = monthYear.split('-');
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

const generateRecentMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  return months;
};

const RECENT_MONTHS = generateRecentMonths();

describe('CommitteePaymentsManagementScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBuildingWallet.mockResolvedValue({ total_collected: 5000 });
    getBuildingMonthlySummary.mockResolvedValue({ paid_count: 5, paid_total: 1000, pending_count: 3 });
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

    await waitFor(() => {
      expect(getByText('ניהול תשלומי ועד הבית')).toBeTruthy();
      expect(getByText('Jane Shepard')).toBeTruthy();
    });

    expect(getByText('200 ₪')).toBeTruthy();
    expect(getByText('ממתין לאישור מזומן')).toBeTruthy();
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
    getBuildingPaymentsForMonth.mockResolvedValueOnce([]);

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<CommitteePaymentsManagementScreen />);

    await waitFor(() => {
      expect(getByText('✓ אשר תשלום מזומן')).toBeTruthy();
    });

    fireEvent.press(getByText('✓ אשר תשלום מזומן'));

    await waitFor(() => {
      expect(confirmCashPaymentByCommittee).toHaveBeenCalledWith('123');
      expect(alertSpy).toHaveBeenCalledWith('✓ אושר', 'תשלום המזומן אושר בהצלחה והתווסף לקופת הבניין');
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
    getBuildingPaymentsForMonth.mockResolvedValueOnce([]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<CommitteePaymentsManagementScreen />);

    await waitFor(() => {
      expect(getByText('✗ סמן כנכשל')).toBeTruthy();
    });

    fireEvent.press(getByText('✗ סמן כנכשל'));

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
    
    const { getByText } = render(<CommitteePaymentsManagementScreen />);
    
    await waitFor(() => {
      expect(getByText('טען תשלומים לחודש זה')).toBeTruthy();
    });

    const currentLabel = formatMonthHebrew(getCurrentMonthYear());
    fireEvent.press(getByText(currentLabel));

    const targetMonth = RECENT_MONTHS[1];
    const targetLabel = formatMonthHebrew(targetMonth);
    fireEvent.press(getByText(targetLabel));

    fireEvent.press(getByText('טען תשלומים לחודש זה'));

    await waitFor(() => {
      expect(getBuildingPaymentsForMonth).toHaveBeenCalledWith(targetMonth);
    });
  });
});
