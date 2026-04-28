import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PayFeesScreen from '../../../screens/PayFeesScreen';
import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

// Mock dependencies
jest.mock('../../../API/paymentsApi', () => ({
  getCommitteeMembersByBuilding: jest.fn(),
  getCurrentBuildingCharge: jest.fn(),
  getMyPaymentForMonth: jest.fn(),
  createCashPaymentRequest: jest.fn(),
}));

jest.mock('../../../API/stripeApi', () => ({
  createPaymentIntent: jest.fn(),
}));

// We already mock useStripe in setup.js, but we can override it here if needed
const { getCommitteeMembersByBuilding, getCurrentBuildingCharge, getMyPaymentForMonth, createCashPaymentRequest } = require('../../../API/paymentsApi');
const { createPaymentIntent } = require('../../../API/stripeApi');
const mockInitPaymentSheet = jest.fn().mockResolvedValue({ error: null });
const mockPresentPaymentSheet = jest.fn().mockResolvedValue({ error: null });

jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    initPaymentSheet: mockInitPaymentSheet,
    presentPaymentSheet: mockPresentPaymentSheet,
  }),
}));

describe('PayFeesScreen (Stripe Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
  });

  it('renders loading states and then charge properly', async () => {
    getCommitteeMembersByBuilding.mockResolvedValueOnce([{ auth_uid: 'comm1', first_name: 'Com' }]);
    getCurrentBuildingCharge.mockResolvedValueOnce({ id: 'charge1', amount: 50 });
    getMyPaymentForMonth.mockResolvedValueOnce(null);

    const { getByText } = render(<PayFeesScreen />);

    await waitFor(() => {
      // Screen fetches charge of 50
      expect(getByText('50 ₪')).toBeTruthy();
      expect(getByText('תשלום מאובטח באשראי (Stripe)')).toBeTruthy();
    });
  });

  it('invokes Stripe payment intent process when clicking Secure Payment', async () => {
    getCommitteeMembersByBuilding.mockResolvedValueOnce([{ auth_uid: 'comm1', first_name: 'Com', last_name: 'Mittee' }]);
    getCurrentBuildingCharge.mockResolvedValueOnce({ id: 'charge1', amount: 300 });
    getMyPaymentForMonth.mockResolvedValueOnce(null);

    // Mock stripe api backend response
    createPaymentIntent.mockResolvedValueOnce({ clientSecret: 'sec_test_123', paymentIntentId: 'pi_test_123' });

    const { getByText } = render(<PayFeesScreen />);

    await waitFor(() => expect(getByText('300 ₪')).toBeTruthy());

    // Press the Stripe button
    fireEvent.press(getByText('תשלום מאובטח באשראי (Stripe)'));

    await waitFor(() => {
      // First, it creates an intent in the backend
      expect(createPaymentIntent).toHaveBeenCalledWith(300);
      
      // Then it initializes payment sheet locally
      expect(mockInitPaymentSheet).toHaveBeenCalledWith(expect.objectContaining({
        paymentIntentClientSecret: 'sec_test_123'
      }));

      // Then it presents the sheet
      expect(mockPresentPaymentSheet).toHaveBeenCalled();
    });
  });
});
