import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../../screens/LoginScreen';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

// Setup basic jest functions
jest.useFakeTimers();

describe('LoginScreen (AuthScreen mode=signin)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form properly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    expect(getByText('ברוך שובך')).toBeTruthy();
    expect(getByPlaceholderText('אימייל / מזהה משתמש')).toBeTruthy();
    expect(getByPlaceholderText('סיסמה')).toBeTruthy();
    expect(getByText('התחברות')).toBeTruthy();
  });

  it('shows error when email is empty', async () => {
    const { getByText } = render(<LoginScreen />);
    
    // Press logic triggers handleAuth
    fireEvent.press(getByText('התחברות'));

    await waitFor(() => {
      expect(getByText('Please enter an email or admin number')).toBeTruthy();
    });
  });

  it('shows error when password is empty', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('אימייל / מזהה משתמש'), 'test@system.com');
    fireEvent.press(getByText('התחברות'));

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('calls Supabase signin on valid input and triggers onSignIn on success', async () => {
    const onSignInMock = jest.fn();
    const { getByPlaceholderText, getByText } = render(<LoginScreen onSignIn={onSignInMock} />);
    
    // Fill credentials
    fireEvent.changeText(getByPlaceholderText('אימייל / מזהה משתמש'), 'valid@email.com');
    fireEvent.changeText(getByPlaceholderText('סיסמה'), 'ValidPassword123!');
    
    fireEvent.press(getByText('התחברות'));

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'valid@email.com',
        password: 'ValidPassword123!'
      });
      // The mock returns data successfully, logic proceeds to verify profiles/MFA and calls onSignIn
      expect(onSignInMock).toHaveBeenCalled();
    });
  });

  it('shows generic supabase error if authentication fails', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' }
    });

    const { getByPlaceholderText, getByText, queryByText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('אימייל / מזהה משתמש'), 'wrong@email.com');
    fireEvent.changeText(getByPlaceholderText('סיסמה'), 'WrongPass');
    fireEvent.press(getByText('התחברות'));

    await waitFor(() => {
      expect(queryByText('Invalid login credentials')).toBeTruthy();
    });
  });
});
