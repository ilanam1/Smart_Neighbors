import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ChatListScreen from '../../../screens/ChatListScreen';
import { getUserConversations, getBuildingGroupChat } from '../../../API/chatApi';

jest.mock('../../../API/chatApi', () => ({
  getUserConversations: jest.fn(),
  getBuildingGroupChat: jest.fn(),
}));

// useFocusEffect wraps a callback with useCallback, then calls it on focus.
// We mock it to use React.useEffect so it runs after mount (preventing
// "fetchChats is not a function" error that occurs when calling cb() synchronously).
jest.mock('@react-navigation/native', () => {
    const actualReact = require('react');
    return {
        useFocusEffect: (cb) => {
            actualReact.useEffect(() => {
                cb();
            }, []);
        },
    };
});

describe('ChatListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads and renders conversations including group and private chats', async () => {
    const mockUser = { id: 'user1', building_id: 'b1' };

    getBuildingGroupChat.mockResolvedValueOnce({});
    getUserConversations.mockResolvedValueOnce([
        { id: 'chat-group', is_group: true, updated_at: '2026-04-20T10:00:00Z' },
        {
            id: 'chat-private',
            is_group: false,
            updated_at: '2026-04-21T10:00:00Z',
            conversation_participants: [
                { profile_id: 'user1' },
                { profile_id: 'user2', profiles: { first_name: 'John', last_name: 'Doe' } }
            ]
        }
    ]);

    const { getByText } = render(<ChatListScreen route={{ params: { user: mockUser } }} navigation={{}} />);

    await waitFor(() => {
        expect(getByText('קבוצת הבניין')).toBeTruthy();
    });

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('שיחה פרטית')).toBeTruthy();
    expect(getBuildingGroupChat).toHaveBeenCalledWith('b1', 'user1');
    expect(getUserConversations).toHaveBeenCalledWith('user1');
  });

  test('renders empty state when no conversations exist', async () => {
    const mockUser = { id: 'user1', building_id: 'b1' };

    getBuildingGroupChat.mockResolvedValueOnce({});
    getUserConversations.mockResolvedValueOnce([]);

    const { getByText } = render(<ChatListScreen route={{ params: { user: mockUser } }} navigation={{}} />);

    await waitFor(() => {
        expect(getByText('לא נמצאו שיחות.')).toBeTruthy();
    });
  });

  test('navigates to ChatRoom on card press', async () => {
    const mockUser = { id: 'user1', building_id: 'b1' };
    const mockNavigate = jest.fn();

    getBuildingGroupChat.mockResolvedValueOnce({});
    getUserConversations.mockResolvedValueOnce([
        { id: 'chat-group-id', is_group: true, updated_at: '2026-04-20T10:00:00Z' }
    ]);

    const { getByText } = render(<ChatListScreen route={{ params: { user: mockUser } }} navigation={{ navigate: mockNavigate }} />);

    await waitFor(() => {
        expect(getByText('קבוצת הבניין')).toBeTruthy();
    });

    fireEvent.press(getByText('קבוצת הבניין'));

    expect(mockNavigate).toHaveBeenCalledWith('ChatRoom', {
        conversationId: 'chat-group-id',
        chatName: 'קבוצת הבניין',
        isGroup: true,
        user: mockUser
    });
  });

  test('navigates to SelectUserForChat on FAB press', async () => {
    const mockUser = { id: 'user1' };
    const mockNavigate = jest.fn();

    getBuildingGroupChat.mockResolvedValue({});
    getUserConversations.mockResolvedValue([]);

    const { getByText } = render(<ChatListScreen route={{ params: { user: mockUser } }} navigation={{ navigate: mockNavigate }} />);

    await waitFor(() => {
        expect(getByText('+')).toBeTruthy();
    });

    fireEvent.press(getByText('+'));

    expect(mockNavigate).toHaveBeenCalledWith('SelectUserForChat', { user: mockUser });
  });
});
