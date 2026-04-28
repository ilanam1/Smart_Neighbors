import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CommitteePendingUsersScreen from '../../../screens/CommitteePendingUsersScreen';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('CommitteePendingUsersScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock default successful fetch
        mockSupabase.from.mockImplementation(() => {
            const queryObj = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                then: jest.fn((resolve) => resolve({
                    data: [
                        { id: '1', auth_uid: 'uid-1', first_name: 'John', last_name: 'Doe', address: 'Apt 1', phone: '050-1234567' }
                    ],
                    error: null
                }))
            };
            return queryObj;
        });
    });

    test('fetches and renders pending users on mount', async () => {
        const route = { params: { buildingId: 'b1' } };
        const { getByText } = render(<CommitteePendingUsersScreen route={route} />);

        await waitFor(() => {
            expect(getByText('John Doe')).toBeTruthy();
        });

        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
        expect(getByText('דירה / משפחה: Apt 1')).toBeTruthy();
        expect(getByText('טלפון: 050-1234567')).toBeTruthy();
    });

    test('renders empty state when there are no pending users', async () => {
        mockSupabase.from.mockImplementation(() => {
            const queryObj = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                then: jest.fn((resolve) => resolve({ data: [], error: null }))
            };
            return queryObj;
        });

        const route = { params: { buildingId: 'b1' } };
        const { getByText } = render(<CommitteePendingUsersScreen route={route} />);

        await waitFor(() => {
            expect(getByText('אין דיירים חדשים הממתינים לאישור ועד הבית כעת.')).toBeTruthy();
        });
    });

    test('handleApprove shows alert and calls approve_user RPC on confirm', async () => {
        mockSupabase.rpc.mockResolvedValueOnce({ error: null });

        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
            const confirmBtn = buttons?.find(b => b.text === 'אישור');
            if (confirmBtn?.onPress) confirmBtn.onPress();
        });

        const route = { params: { buildingId: 'b1' } };
        const { getByText } = render(<CommitteePendingUsersScreen route={route} />);

        await waitFor(() => {
            expect(getByText('John Doe')).toBeTruthy();
        });

        fireEvent.press(getByText('אשר דייר'));

        await waitFor(() => {
            expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_user', { target_user_id: 'uid-1' });
            expect(alertSpy).toHaveBeenCalledWith('הצלחה', 'המשתמש אושר בהצלחה!');
        });

        alertSpy.mockRestore();
    });

    test('handleReject shows alert and calls delete_rejected_user RPC on confirm', async () => {
        mockSupabase.rpc.mockResolvedValueOnce({ error: null });

        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
            const destructiveBtn = buttons?.find(b => b.style === 'destructive');
            if (destructiveBtn?.onPress) destructiveBtn.onPress();
        });

        const route = { params: { buildingId: 'b1' } };
        const { getByText } = render(<CommitteePendingUsersScreen route={route} />);

        await waitFor(() => {
            expect(getByText('John Doe')).toBeTruthy();
        });

        fireEvent.press(getByText('סרב'));

        await waitFor(() => {
            expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_rejected_user', { target_user_id: 'uid-1' });
        });

        alertSpy.mockRestore();
    });
});
