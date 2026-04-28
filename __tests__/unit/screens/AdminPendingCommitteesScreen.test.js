import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AdminPendingCommitteesScreen from '../../../screens/AdminPendingCommitteesScreen';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

describe('AdminPendingCommitteesScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSupabase.rpc.mockImplementation((rpcName) => {
            if (rpcName === 'get_all_profiles_as_admin') {
                return Promise.resolve({
                    data: [
                        { id: '1', auth_uid: 'auth1', first_name: 'Boss', last_name: 'Man', is_house_committee: true, is_approved: false, building_id: 'b1' },
                        { id: '2', auth_uid: 'auth2', first_name: 'Already', last_name: 'Approved', is_house_committee: true, is_approved: true, building_id: 'b1' }
                    ],
                    error: null
                });
            }
            return Promise.resolve({ error: null });
        });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'buildings') {
                return {
                    select: jest.fn().mockResolvedValue({
                        data: [{ id: 'b1', name: 'Tower A' }],
                        error: null
                    })
                };
            }
            return {
                select: jest.fn().mockReturnThis(),
            };
        });
    });

    test('fetches and renders pending committee users on mount', async () => {
        const route = { params: { adminUser: { admin_number: '123', password: 'pas' } } };
        const { getByText } = render(<AdminPendingCommitteesScreen route={route} />);

        await waitFor(() => {
            expect(getByText('Boss Man')).toBeTruthy();
        });

        // Building name should be joined
        expect(getByText('Tower A')).toBeTruthy();

        // Already approved user shouldn't show
        expect(() => getByText('Already Approved')).toThrow();
        
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_all_profiles_as_admin', {
            admin_req_number: '123',
            admin_req_password: 'pas'
        });
    });

    test('renders empty state when no pending committees or no admin', async () => {
        const route = { params: {} }; // no adminUser passed
        const { getByText } = render(<AdminPendingCommitteesScreen route={route} />);

        await waitFor(() => {
            expect(getByText('אין ועדי בית הממתינים לאישור מנהל כעת.')).toBeTruthy();
        });
    });

    test('handleApprove shows alert and calls approve_user RPC', async () => {
        const route = { params: { adminUser: { admin_number: '123', password: 'pas' } } };
        
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
            const confirmBtn = buttons?.find(b => b.text === 'אישור');
            if (confirmBtn?.onPress) confirmBtn.onPress();
        });

        const { getByText } = render(<AdminPendingCommitteesScreen route={route} />);

        await waitFor(() => {
            expect(getByText('אשר ועד')).toBeTruthy();
        });

        fireEvent.press(getByText('אשר ועד'));

        await waitFor(() => {
            expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_user', { target_user_id: 'auth1' });
            expect(alertSpy).toHaveBeenCalledWith('הצלחה', 'המשתמש אושר בהצלחה!');
        });

        alertSpy.mockRestore();
    });

    test('handleReject shows alert and calls delete_rejected_user RPC', async () => {
        const route = { params: { adminUser: { admin_number: '123', password: 'pas' } } };
        
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
            const deleteBtn = buttons?.find(b => b.style === 'destructive');
            if (deleteBtn?.onPress) deleteBtn.onPress();
        });

        const { getByText } = render(<AdminPendingCommitteesScreen route={route} />);

        await waitFor(() => {
            expect(getByText('סרב ומחק')).toBeTruthy();
        });

        fireEvent.press(getByText('סרב ומחק'));

        await waitFor(() => {
            expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_rejected_user', { target_user_id: 'auth1' });
            expect(alertSpy).toHaveBeenCalledWith('הצלחה', 'המשתמש נמחק מהמערכת.');
        });

        alertSpy.mockRestore();
    });
});
