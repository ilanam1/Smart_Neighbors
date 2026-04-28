import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EmployeeJobRequestsListScreen from '../../../screens/EmployeeJobRequestsListScreen';
import { getEmployeeOpenJobs } from '../../../API/jobRequestsApi';

jest.mock('../../../API/jobRequestsApi', () => ({
  getEmployeeOpenJobs: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
    useIsFocused: () => true
}));

describe('EmployeeJobRequestsListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('loads and renders jobs on focus', async () => {
        getEmployeeOpenJobs.mockResolvedValueOnce([
            {
                id: 'job1', status: 'PENDING', instructions: 'Fix leak', schedule_time: 'Sunday Morning',
                building_id: 'b1', buildings: { name: 'Tower A' }
            },
            {
                id: 'job2', status: 'ACCEPTED', instructions: 'Clean pool', schedule_time: 'Monday 10:00',
                building_id: 'b1', buildings: null
            }
        ]);

        const route = { params: { employeeId: 'emp1' } };
        const { getByText } = render(<EmployeeJobRequestsListScreen route={route} />);

        await waitFor(() => {
            expect(getByText('בקשות שירות פתוחות')).toBeTruthy();
        });

        // Verification of cards
        expect(getByText('Tower A')).toBeTruthy();
        expect(getByText('בניין לא ידוע')).toBeTruthy(); // job2 has null buildings

        expect(getByText('Fix leak')).toBeTruthy();
        expect(getByText('ממתין')).toBeTruthy();

        expect(getByText('Clean pool')).toBeTruthy();
        expect(getByText('בביצוע')).toBeTruthy();

        expect(getEmployeeOpenJobs).toHaveBeenCalledWith('emp1');
    });

    test('renders empty state correctly', async () => {
        getEmployeeOpenJobs.mockResolvedValueOnce([]);

        const route = { params: { employeeId: 'emp1' } };
        const { getByText } = render(<EmployeeJobRequestsListScreen route={route} />);

        await waitFor(() => {
            expect(getByText('אין לך בקשות שירות פתוחות כרגע.')).toBeTruthy();
        });
    });

    test('handles api error gracefully with alert', async () => {
        getEmployeeOpenJobs.mockRejectedValueOnce(new Error('Network fail'));
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        const route = { params: { employeeId: 'emp1' } };
        render(<EmployeeJobRequestsListScreen route={route} />);

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith("שגיאה", "שגיאה בטעינת הבקשות: Network fail");
        });

        alertSpy.mockRestore();
    });

    test('navigates to JobRequest screen on pressing a card with correct fake notification payload', async () => {
        const testJob = {
            id: 'job1', manager_uid: 'man1', report_id: 'rep1', building_id: 'b1',
            status: 'PENDING', instructions: 'Fix leak', schedule_time: 'Sunday Morning',
            buildings: { name: 'Tower A' }
        };
        getEmployeeOpenJobs.mockResolvedValueOnce([testJob]);

        const route = { params: { employeeId: 'emp1' } };
        const { getByText } = render(<EmployeeJobRequestsListScreen route={route} />);

        await waitFor(() => {
            expect(getByText('Fix leak')).toBeTruthy();
        });

        fireEvent.press(getByText('Fix leak'));

        expect(mockNavigate).toHaveBeenCalledWith('EmployeeJobRequest', {
            notification: {
                id: 'job1',
                sender_id: 'man1',
                related_data: {
                    job_id: 'job1',
                    report_id: 'rep1',
                    building_id: 'b1',
                    building_name: 'Tower A',
                    manager_name: 'נציג ועד',
                    instructions: 'Fix leak',
                    schedule_time: 'Sunday Morning',
                    is_handled: false
                }
            }
        });
    });
});
