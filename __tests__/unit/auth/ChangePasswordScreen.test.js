import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChangePasswordScreen from '../../../screens/ChangePasswordScreen';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';
import { Alert } from 'react-native';

jest.useFakeTimers();

// Mock Alert to prevent it from crashing tests and to verify it was called
jest.spyOn(Alert, 'alert');

describe('ChangePasswordScreen', () => {
  const mockNavigation = {
    reset: jest.fn(),
    goBack: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    const { getByPlaceholderText, getByText } = render(<ChangePasswordScreen navigation={mockNavigation} />);
    
    expect(getByText('הקצאת סיסמה חדשה')).toBeTruthy();
    expect(getByPlaceholderText('הזן סיסמה חדשה')).toBeTruthy();
    expect(getByPlaceholderText('הזן שוב סיסמה חדשה')).toBeTruthy();
    expect(getByText('שנה סיסמה')).toBeTruthy();
  });

  it('validates empty inputs', async () => {
    const { getByText } = render(<ChangePasswordScreen navigation={mockNavigation} />);
    
    fireEvent.press(getByText('שנה סיסמה'));

    await waitFor(() => {
      expect(getByText('נא למלא את כל השדות.')).toBeTruthy();
    });
  });

  it('validates mismatched passwords', async () => {
    const { getByPlaceholderText, getByText } = render(<ChangePasswordScreen navigation={mockNavigation} />);
    
    fireEvent.changeText(getByPlaceholderText('הזן סיסמה חדשה'), 'Password123');
    fireEvent.changeText(getByPlaceholderText('הזן שוב סיסמה חדשה'), 'Password456');
    fireEvent.press(getByText('שנה סיסמה'));

    await waitFor(() => {
      expect(getByText('הסיסמה החדשה ואימות הסיסמה אינם תואמים.')).toBeTruthy();
    });
  });

  it('validates short passwords', async () => {
    const { getByPlaceholderText, getByText } = render(<ChangePasswordScreen navigation={mockNavigation} />);
    
    fireEvent.changeText(getByPlaceholderText('הזן סיסמה חדשה'), 'short');
    fireEvent.changeText(getByPlaceholderText('הזן שוב סיסמה חדשה'), 'short');
    fireEvent.press(getByText('שנה סיסמה'));

    await waitFor(() => {
      expect(getByText('הסיסמה החדשה חייבת להכיל לפחות 8 תווים.')).toBeTruthy();
    });
  });

  it('successfully updates password and redirects', async () => {
    const { getByPlaceholderText, getByText } = render(<ChangePasswordScreen navigation={mockNavigation} />);
    
    fireEvent.changeText(getByPlaceholderText('הזן סיסמה חדשה'), 'ValidPassword123!');
    fireEvent.changeText(getByPlaceholderText('הזן שוב סיסמה חדשה'), 'ValidPassword123!');
    fireEvent.press(getByText('שנה סיסמה'));

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'ValidPassword123!' });
      expect(Alert.alert).toHaveBeenCalledWith("הצלחה", "הסיסמה שונתה בהצלחה!", expect.any(Array));
    });
  });
});
