import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { getMessages, sendMessage } from '../API/chatApi';
import { getSupabase } from '../DataBase/supabase';

export default function ChatRoomScreen({ navigation, route }) {
    const { conversationId, chatName, user } = route.params;
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();

    useEffect(() => {
        navigation.setOptions({ title: chatName });
        fetchMessages();
        
        // Subscribe to real-time changes
        const supabase = getSupabase();
        const subscription = supabase
            .channel(`messages:conversation_id=eq.${conversationId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}` 
            }, (payload) => {
                // When a new message arrives, add it to the state (if we didn't send it, although if we sent it we might add it twice if not careful, handled below via fetch)
                // For simplicity, re-fetch to get profile joins, or ideally join locally. Let's re-fetch for safety.
                fetchMessages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchMessages = async () => {
        try {
            const data = await getMessages(conversationId);
            setMessages(data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        
        const textToSend = inputText.trim();
        setInputText(''); // Clear input optimistically
        
        try {
            await sendMessage(conversationId, user.id, textToSend);
            await fetchMessages(); // Re-fetch to show new message
            flatListRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
            console.error('Error sending message:', error);
            alert('שגיאה בשליחת ההודעה. נסה שוב.');
            setInputText(textToSend); // Restore text on failure
        }
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.sender_id === user.id;
        const fName = item.profiles?.first_name || '';
        const lName = item.profiles?.last_name || '';
        const senderName = `${fName} ${lName}`.trim() || 'שכן ללא שם';
        
        return (
            <View style={[styles.messageBubbleContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
                {!isMyMessage && (
                    <Text style={styles.senderName}>{senderName}</Text>
                )}
                <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>{item.content}</Text>
                    <Text style={styles.timeText}>
                        {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {loading ? (
                <ActivityIndicator size="large" color="#007BFF" style={{ flex: 1 }}/>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="הקלד הודעה..."
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Text style={styles.sendButtonText}>שלח</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F2F5',
    },
    messagesList: {
        padding: 15,
        paddingBottom: 20,
    },
    messageBubbleContainer: {
        marginBottom: 15,
        maxWidth: '80%',
    },
    myMessageContainer: {
        alignSelf: 'flex-start', // Because text is RTL
    },
    otherMessageContainer: {
        alignSelf: 'flex-end',
    },
    senderName: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        marginRight: 4,
        textAlign: 'right', // RTL
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    myBubble: {
        backgroundColor: '#DCF8C6',
        borderTopLeftRadius: 4,
    },
    otherBubble: {
        backgroundColor: '#FFF',
        borderTopRightRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
        textAlign: 'right', // RTL
    },
    myMessageText: {
        color: '#000',
    },
    otherMessageText: {
        color: '#333',
    },
    timeText: {
        fontSize: 10,
        color: '#999',
        alignSelf: 'flex-start', // Align left for time
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row-reverse', // RTL
        padding: 10,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderColor: '#EEE',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 16,
        marginLeft: 10,
        textAlign: 'right', // RTL
    },
    sendButton: {
        backgroundColor: '#007BFF',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    sendButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
