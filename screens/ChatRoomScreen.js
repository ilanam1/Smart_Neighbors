import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { getMessages, sendMessage, editMessage, toggleMessageReaction } from '../API/chatApi';
import { getSupabase } from '../DataBase/supabase';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

export default function ChatRoomScreen({ navigation, route }) {
    const { conversationId, chatName, isGroup, user } = route.params;
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [reactionMessageId, setReactionMessageId] = useState(null);
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
        
        if (editingMessageId) {
            try {
                await editMessage(editingMessageId, textToSend);
                setEditingMessageId(null);
                await fetchMessages(); // Re-fetch to show edited message
            } catch (error) {
                console.error('Error editing message:', error);
                alert('שגיאה בעריכת ההודעה. נסה שוב.');
                setInputText(textToSend); // Restore text on failure
            }
        } else {
            try {
                await sendMessage(conversationId, user.id, textToSend);
                await fetchMessages(); // Re-fetch to show new message
                flatListRef.current?.scrollToEnd({ animated: true });
            } catch (error) {
                console.error('Error sending message:', error);
                alert('שגיאה בשליחת ההודעה. נסה שוב.');
                setInputText(textToSend); // Restore text on failure
            }
        }
    };

    const handleLongPressMessage = (item) => {
        setEditingMessageId(item.id);
        setInputText(item.content);
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setInputText('');
    };

    const handleLongPressOtherMessage = (item) => {
        setReactionMessageId(item.id);
    };

    const handleSelectReaction = async (emoji) => {
        if (!reactionMessageId) return;
        const msgId = reactionMessageId;
        setReactionMessageId(null);
        try {
            await toggleMessageReaction(msgId, emoji, user.id);
            await fetchMessages(); // Re-fetch to show new reaction
        } catch (error) {
            console.error('Error toggling reaction:', error);
            alert('שגיאה בהוספת תגובה.');
        }
    };

    const renderMessage = ({ item }) => {
        // Compare the profile's auth_uid to the session's auth UUID
        const isMyMessage = item.profiles?.auth_uid === (user.auth_uid || user.id);
        const fName = item.profiles?.first_name || '';
        const lName = item.profiles?.last_name || '';
        const senderName = `${fName} ${lName}`.trim() || 'שכן ללא שם';
        
        const BubbleComponent = TouchableOpacity;
        
        // Count string representation of reactions
        let reactionsDisplay = null;
        if (item.reactions && Object.keys(item.reactions).length > 0) {
            // Group by emoji
            const counts = {};
            Object.values(item.reactions).forEach(e => counts[e] = (counts[e] || 0) + 1);
            
            reactionsDisplay = (
                <View style={[styles.reactionsRow, isMyMessage ? styles.myReactionsRow : styles.otherReactionsRow]}>
                   {Object.keys(counts).map(emoji => (
                       <View key={emoji} style={styles.reactionBadge}>
                           <Text style={styles.reactionBadgeText}>{emoji} {counts[emoji] > 1 ? counts[emoji] : ''}</Text>
                       </View>
                   ))}
                </View>
            );
        }

        return (
            <View style={[styles.messageBubbleContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
                {isGroup && !isMyMessage && (
                    <Text style={styles.senderName}>{senderName}</Text>
                )}
                <BubbleComponent 
                    style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}
                    onLongPress={isMyMessage ? () => handleLongPressMessage(item) : () => handleLongPressOtherMessage(item)}
                    delayLongPress={300}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>{item.content}</Text>
                    <Text style={styles.timeText}>
                        {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                </BubbleComponent>
                {reactionsDisplay}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <StatusBar barStyle="light-content" backgroundColor="#000000" />
            
            {/* Background Glows */}
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%">
                <Defs>
                    <RadialGradient
                    id="topGlow"
                    cx="100%"
                    cy="0%"
                    rx="60%"
                    ry="40%"
                    fx="100%"
                    fy="0%"
                    gradientUnits="userSpaceOnUse"
                    >
                    <Stop offset="0" stopColor="#ff0080" stopOpacity="0.3" />
                    <Stop offset="1" stopColor="#000000" stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient
                    id="bottomGlow"
                    cx="0%"
                    cy="100%"
                    rx="60%"
                    ry="40%"
                    fx="0%"
                    fy="100%"
                    gradientUnits="userSpaceOnUse"
                    >
                    <Stop offset="0" stopColor="#00f2ff" stopOpacity="0.25" />
                    <Stop offset="1" stopColor="#000000" stopOpacity="0" />
                    </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGlow)" />
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomGlow)" />
                </Svg>
            </View>

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

            {reactionMessageId && (
                <TouchableOpacity style={styles.reactionsOverlay} onPress={() => setReactionMessageId(null)} activeOpacity={1}>
                    <View style={styles.reactionPickerContainer}>
                        {EMOJIS.map(emoji => (
                            <TouchableOpacity key={emoji} onPress={() => handleSelectReaction(emoji)} style={styles.reactionOption}>
                                <Text style={styles.reactionOptionText}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            )}

            {editingMessageId && (
                <View style={styles.editBanner}>
                    <Text style={styles.editBannerText}>עורך הודעה...</Text>
                    <TouchableOpacity onPress={cancelEdit}>
                        <Text style={styles.cancelEditText}>בטל</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="הקלד הודעה..."
                    placeholderTextColor="#94a3b8"
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
        backgroundColor: '#0F172A',
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
        alignSelf: 'flex-end', // Push to right
    },
    otherMessageContainer: {
        alignSelf: 'flex-start', // Push to left
    },
    senderName: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 4,
        marginRight: 4,
        textAlign: 'right', // RTL
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
    },
    myBubble: {
        backgroundColor: '#10b981', // Emerald 500
        borderTopRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)', // Slate 800
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        borderTopLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
        textAlign: 'right', // RTL
    },
    myMessageText: {
        color: '#f8fafc',
    },
    otherMessageText: {
        color: '#f8fafc',
    },
    timeText: {
        fontSize: 10,
        color: '#cbd5e1',
        alignSelf: 'flex-start', // Align left for time
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row-reverse', // RTL
        padding: 10,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderTopWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        color: '#f8fafc',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 16,
        marginLeft: 10,
        textAlign: 'right', // RTL
    },
    sendButton: {
        backgroundColor: '#ff0080',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    sendButtonText: {
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: 16,
    },
    editBanner: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: '#1e293b', // slate 800
        borderTopWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
    },
    editBannerText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    cancelEditText: {
        color: '#ef4444', // red 500
        fontSize: 12,
        fontWeight: 'bold',
    },
    reactionsRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        marginTop: -10, // Pull it up slightly to overlap the bubble border
        paddingHorizontal: 15,
        gap: 4,
        zIndex: 5, // Render above the bubble's shadow
    },
    myReactionsRow: {
        justifyContent: 'flex-start',
    },
    otherReactionsRow: {
        justifyContent: 'flex-start',
    },
    reactionBadge: {
        backgroundColor: '#1e293b', // Match the background
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.8)',
    },
    reactionBadgeText: {
        fontSize: 12,
        color: '#FFF',
    },
    reactionsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionPickerContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 30,
        padding: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
    },
    reactionOption: {
        padding: 8,
    },
    reactionOptionText: {
        fontSize: 28,
    }
});
