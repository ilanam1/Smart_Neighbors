import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ChatRoomScreen from '../../../screens/ChatRoomScreen';
import { getMessages, sendMessage, editMessage, toggleMessageReaction } from '../../../API/chatApi';
import { mockSupabase } from '../../__mocks__/@supabase/supabase-js';

jest.mock('../../../API/chatApi', () => ({
  getMessages: jest.fn(),
  sendMessage: jest.fn(),
  editMessage: jest.fn(),
  toggleMessageReaction: jest.fn()
}));

// Do NOT mock FlatList - the forwardRef mock breaks unmounting.
// Instead we mock SVG components that crash in test environment.
jest.mock('react-native-svg', () => {
    const React = require('react');
    const MockSvg = ({ children }) => React.createElement('View', null, children);
    const MockEl = ({ children }) => React.createElement('View', null, children);
    return {
        __esModule: true,
        default: MockSvg,
        Svg: MockSvg,
        Defs: MockEl,
        RadialGradient: MockEl,
        Stop: MockEl,
        Rect: MockEl,
        Circle: MockEl,
        Path: MockEl,
        G: MockEl,
    };
});

describe('ChatRoomScreen', () => {
  const mockUser = { id: 'u1', auth_uid: 'auth-u1' };
  const routeProps = {
      params: { conversationId: 'c1', chatName: 'Test Chat', isGroup: true, user: mockUser }
  };
  const navigationProps = { setOptions: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.channel = jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis()
    });
    mockSupabase.removeChannel = jest.fn();
  });

  test('loads and renders messages on mount', async () => {
    getMessages.mockResolvedValueOnce([
        {
            id: 'm1', content: 'Hello everyone', created_at: '2026-04-20T10:00:00Z',
            profiles: { auth_uid: 'other-user', first_name: 'John', last_name: 'Doe' },
            reactions: {}
        },
        {
            id: 'm2', content: 'Hi there', created_at: '2026-04-20T10:01:00Z',
            profiles: { auth_uid: 'auth-u1' },
            reactions: { 'auth-u2': '👍' }
        }
    ]);

    const { getByText, getByPlaceholderText } = render(
        <ChatRoomScreen route={routeProps} navigation={navigationProps} />
    );

    expect(navigationProps.setOptions).toHaveBeenCalledWith({ title: 'Test Chat' });
    expect(mockSupabase.channel).toHaveBeenCalledWith('messages:conversation_id=eq.c1');

    await waitFor(() => {
        expect(getByText('Hello everyone')).toBeTruthy();
        expect(getByText('Hi there')).toBeTruthy();
    });

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByPlaceholderText('הקלד הודעה...')).toBeTruthy();
  });

  test('handles sending a message', async () => {
    getMessages.mockResolvedValue([]);
    sendMessage.mockResolvedValueOnce({ id: 'new-msg' });

    const { getByPlaceholderText, getByText } = render(
        <ChatRoomScreen route={routeProps} navigation={navigationProps} />
    );

    await waitFor(() => {
        expect(getByPlaceholderText('הקלד הודעה...')).toBeTruthy();
    });

    const input = getByPlaceholderText('הקלד הודעה...');
    fireEvent.changeText(input, 'This is a new message');
    fireEvent.press(getByText('שלח'));

    await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('c1', 'u1', 'This is a new message');
    });

    expect(getMessages).toHaveBeenCalledTimes(2);
  });

  test('long press on my message initiates edit flow', async () => {
    getMessages.mockResolvedValueOnce([
        {
            id: 'm1', content: 'My typo message', created_at: '2026-04-20T10:00:00Z',
            profiles: { auth_uid: 'auth-u1' },
            reactions: {}
        }
    ]);

    const { getByText, getByDisplayValue } = render(
        <ChatRoomScreen route={routeProps} navigation={navigationProps} />
    );

    await waitFor(() => {
        expect(getByText('My typo message')).toBeTruthy();
    });

    fireEvent(getByText('My typo message'), 'longPress');

    await waitFor(() => {
        expect(getByText('עורך הודעה...')).toBeTruthy();
    });

    expect(getByDisplayValue('My typo message')).toBeTruthy();
  });

  test('long press on other message opens emoji picker', async () => {
    getMessages.mockResolvedValueOnce([
        {
            id: 'm1', content: 'Other message', created_at: '2026-04-20T10:00:00Z',
            profiles: { auth_uid: 'other', first_name: 'Bob' },
            reactions: {}
        }
    ]);

    const { getByText } = render(
        <ChatRoomScreen route={routeProps} navigation={navigationProps} />
    );

    await waitFor(() => {
        expect(getByText('Other message')).toBeTruthy();
    });

    fireEvent(getByText('Other message'), 'longPress');

    await waitFor(() => {
        expect(getByText('👍')).toBeTruthy();
    });

    toggleMessageReaction.mockResolvedValueOnce(true);
    fireEvent.press(getByText('👍'));

    await waitFor(() => {
        expect(toggleMessageReaction).toHaveBeenCalledWith('m1', '👍', 'u1');
    });
  });
});
