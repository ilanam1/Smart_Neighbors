import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, Image, Alert, Modal, TouchableWithoutFeedback, Dimensions, Keyboard } from 'react-native';
import ActivityIndicator from '../components/CustomLoader';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { getMessages, sendMessage, editMessage, toggleMessageReaction } from '../API/chatApi';
import { moderateMessage } from '../API/moderationApi';
import { getSupabase } from '../DataBase/supabase';
import { markChatNotificationsAsRead } from '../API/notificationsApi';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

export default function ChatRoomScreen({ navigation, route }) {
    const { conversationId, chatName, chatPhotoUrl, chatUserId, isGroup, user } = route.params;
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [reactionMessageId, setReactionMessageId] = useState(null);
    const [replyingToMessage, setReplyingToMessage] = useState(null);
    const [activeMessage, setActiveMessage] = useState(null);
    const [checkingModeration, setCheckingModeration] = useState(false);
    const flatListRef = useRef();
    const [keyboardOpen, setKeyboardOpen] = useState(false);

    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
            () => setKeyboardOpen(true)
        );
        const hideSubscription = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
            () => setKeyboardOpen(false)
        );
        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: '',
            headerStyle: {
                backgroundColor: '#f97316',
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255, 255, 255, 0.08)',
            },
            headerTintColor: '#ffffff',
            headerRight: () => {
                const content = (
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingRight: 15 }}>
                        {chatPhotoUrl ? (
                            <Image source={{ uri: chatPhotoUrl }} style={{ width: 32, height: 32, borderRadius: 16, marginLeft: 10 }} />
                        ) : (
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0, 0, 0, 0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}>
                                <Text style={{ fontSize: 14 }}>{isGroup ? '🏢' : (chatName ? chatName.charAt(0) : '👤')}</Text>
                            </View>
                        )}
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff' }} numberOfLines={1}>
                            {chatName}
                        </Text>
                    </View>
                );

                if (!isGroup && chatUserId) {
                    return (
                        <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { authUid: chatUserId })}>
                            {content}
                        </TouchableOpacity>
                    );
                }
                return content;
            },
        });

        fetchMessages();

        if (user) {
            markChatNotificationsAsRead(conversationId, user.id || user.auth_uid);
        }

        const supabase = getSupabase();
        const subscription = supabase
            .channel(`messages:conversation_id=eq.${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                fetchMessages();
                if (user) {
                    markChatNotificationsAsRead(conversationId, user.id || user.auth_uid);
                }
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

    const sendMessageAfterModeration = async (textToSend, moderationData = null) => {
        try {
            await sendMessage(conversationId, user.id, textToSend, moderationData);
            await fetchMessages();
            flatListRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
            console.error('Error sending message:', error);
            alert('שגיאה בשליחת ההודעה. נסה שוב.');
            setInputText(textToSend);
        }
    };

    const checkMessageModeration = async (textToSend) => {
        try {
            setCheckingModeration(true);

            const moderation = await moderateMessage({
                text: textToSend,
                conversationId,
                senderProfileId: user.id,
                saveEvent: true,
            });

            return moderation;
        } catch (error) {
            console.error('Error checking message moderation:', error);

            return {
                allowed: true,
                shouldWarn: false,
                shouldBlock: false,
                toxicityScore: 0,
                label: 'moderation_failed',
                action: 'allow',
                reason: 'בדיקת התוכן נכשלה, ההודעה נשלחת ללא סינון',
            };
        } finally {
            setCheckingModeration(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        if (checkingModeration) return;

        let textToSend = inputText.trim();
        setInputText('');

        if (replyingToMessage) {
            const fName = replyingToMessage.profiles?.first_name || '';
            const lName = replyingToMessage.profiles?.last_name || '';
            const senderName = `${fName} ${lName}`.trim() || 'שכן';

            let pureText = replyingToMessage.content;
            const replyMatch = pureText.match(/^\[REPLY::(.*?)::(.*?)\] (.*)$/s);
            if (replyMatch) {
                pureText = replyMatch[3];
            }

            const snippet = pureText.length > 50 ? pureText.substring(0, 50) + '...' : pureText;
            textToSend = `[REPLY::${senderName}::${snippet}] ${textToSend}`;
            setReplyingToMessage(null);
        }

        if (editingMessageId) {
            try {
                await editMessage(editingMessageId, textToSend);
                setEditingMessageId(null);
                await fetchMessages();
            } catch (error) {
                console.error('Error editing message:', error);
                alert('שגיאה בעריכת ההודעה. נסה שוב.');
                setInputText(textToSend);
            }
        } else {
            const moderation = await checkMessageModeration(textToSend);

            if (moderation?.shouldBlock) {
                Alert.alert(
                    'הודעה לא נשלחה',
                    'המערכת זיהתה שההודעה עלולה להיות פוגענית ולכן היא לא נשלחה. נסה לנסח את ההודעה בצורה מכבדת יותר.',
                    [
                        {
                            text: 'ערוך הודעה',
                            onPress: () => setInputText(textToSend),
                        },
                        {
                            text: 'אישור',
                            style: 'cancel',
                        },
                    ]
                );
                return;
            }

            if (moderation?.shouldWarn) {
                Alert.alert(
                    'שים לב',
                    'המערכת זיהתה שההודעה עשויה להיות פוגענית. מומלץ לנסח אותה בצורה מכבדת יותר.',
                    [
                        {
                            text: 'ערוך הודעה',
                            style: 'cancel',
                            onPress: () => {
                                setInputText(textToSend);
                            },
                        },
                        {
                            text: 'שלח בכל זאת',
                            onPress: async () => {
                                await sendMessageAfterModeration(textToSend, {
                                    moderationScore: moderation.toxicityScore ?? 0,
                                    moderationLabel: moderation.label ?? 'toxic',
                                    isToxic: true,
                                });
                            },
                        },
                    ]
                );
                return;
            }

            await sendMessageAfterModeration(textToSend, {
                moderationScore: moderation?.toxicityScore ?? 0,
                moderationLabel: moderation?.label ?? 'safe',
                isToxic: false,
            });
        }
    };

    const deleteMessage = async (item) => {
        try {
            await editMessage(item.id, "הודעה זו נמחקה");
            await fetchMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
            Alert.alert('שגיאה', 'שגיאה במחיקת ההודעה. נסה שוב.');
        }
    };

    const handleLongPressMessage = (item) => {
        if (item.content === 'הודעה זו נמחקה') return;
        setActiveMessage(item);
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setReplyingToMessage(null);
        setInputText('');
    };

    const handleLongPressOtherMessage = (item) => {
        if (item.content === 'הודעה זו נמחקה') return;
        setActiveMessage(item);
    };

    const handleSelectReaction = async (emoji) => {
        if (!reactionMessageId) return;
        const msgId = reactionMessageId;
        setReactionMessageId(null);
        try {
            await toggleMessageReaction(msgId, emoji, user.id);
            await fetchMessages();
        } catch (error) {
            console.error('Error toggling reaction:', error);
            alert('שגיאה בהוספת תגובה.');
        }
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.profiles?.auth_uid === (user.auth_uid || user.id);
        const fName = item.profiles?.first_name || '';
        const lName = item.profiles?.last_name || '';
        const senderName = `${fName} ${lName}`.trim() || 'שכן ללא שם';

        const BubbleComponent = TouchableOpacity;

        let reactionsDisplay = null;
        if (item.reactions && Object.keys(item.reactions).length > 0) {
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

        const profilePhotoUrl = item.profiles?.photo_url;

        let actualContent = item.content;
        let isReply = false;
        let replySender = '';
        let replyText = '';

        const replyMatch = actualContent.match(/^\[REPLY::(.*?)::(.*?)\] (.*)$/s);
        if (replyMatch) {
            isReply = true;
            replySender = replyMatch[1];
            replyText = replyMatch[2];
            actualContent = replyMatch[3];
        }

        return (
            <View style={[styles.messageBubbleContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end' }}>
                    <View style={{ flexShrink: 1 }}>
                        <BubbleComponent
                            style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}
                            onLongPress={isMyMessage ? () => handleLongPressMessage(item) : () => handleLongPressOtherMessage(item)}
                            delayLongPress={300}
                            activeOpacity={0.8}
                        >
                            {isGroup && !isMyMessage && (
                                <Text style={styles.senderNameInsideBubble}>{senderName}</Text>
                            )}

                            {isReply && (
                                <View style={styles.bubbleReplyContainer}>
                                    <View style={styles.bubbleReplyBorder} />
                                    <View style={styles.bubbleReplyContent}>
                                        <Text style={styles.bubbleReplySender}>{replySender}</Text>
                                        <Text style={styles.bubbleReplyText} numberOfLines={2}>{replyText}</Text>
                                    </View>
                                </View>
                            )}

                            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>{actualContent}</Text>
                            <Text style={styles.timeText}>
                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </BubbleComponent>
                        {reactionsDisplay}
                    </View>
                    {!isMyMessage && (
                        <View style={styles.chatRoomAvatarContainer}>
                            {profilePhotoUrl ? (
                                <Image source={{ uri: profilePhotoUrl }} style={styles.chatRoomAvatar} />
                            ) : (
                                <Text style={styles.chatRoomAvatarText}>{fName ? fName.charAt(0) : '👤'}</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Image
                source={require('../assets/app_internal_bg.png')}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: Dimensions.get('screen').width,
                    height: Dimensions.get('screen').height,
                }}
                resizeMode="cover"
            />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : (keyboardOpen ? 80 : 0)}
            >
                <StatusBar barStyle="light-content" backgroundColor="#f97316" />

                {loading ? (
                    <ActivityIndicator size="large" color="#f97316" style={{ flex: 1 }} />
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

                {replyingToMessage && (
                    <View style={styles.replyPreviewContainer}>
                        <View style={styles.replyPreviewBorder} />
                        <View style={styles.replyPreviewContent}>
                            <Text style={styles.replyPreviewSender}>
                                {`${replyingToMessage.profiles?.first_name || ''} ${replyingToMessage.profiles?.last_name || ''}`.trim() || 'שכן'}
                            </Text>
                            <Text style={styles.replyPreviewText} numberOfLines={1}>
                                {replyingToMessage.content.replace(/^\[REPLY::(.*?)::(.*?)\] /s, '')}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setReplyingToMessage(null)} style={styles.replyPreviewClose}>
                            <Text style={styles.replyPreviewCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {editingMessageId && (
                    <View style={styles.editBanner}>
                        <Text style={styles.editBannerText}>עורך הודעה...</Text>
                        <TouchableOpacity onPress={cancelEdit}>
                            <Text style={styles.cancelEditText}>בטל</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {checkingModeration && (
                    <View style={styles.moderationBanner}>
                        <Text style={styles.moderationBannerText}>בודק את תוכן ההודעה...</Text>
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
                        editable={!checkingModeration}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, checkingModeration && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={checkingModeration}
                    >
                        <Text style={styles.sendButtonText}>
                            {checkingModeration ? 'בודק...' : 'שלח'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    visible={!!activeMessage}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setActiveMessage(null)}
                >
                    <TouchableWithoutFeedback onPress={() => setActiveMessage(null)}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>אפשרויות הודעה</Text>

                                    <TouchableOpacity
                                        style={styles.modalOption}
                                        onPress={() => {
                                            setReplyingToMessage(activeMessage);
                                            setActiveMessage(null);
                                        }}
                                    >
                                        <Text style={styles.modalOptionText}>הגב</Text>
                                    </TouchableOpacity>

                                    {activeMessage?.profiles?.auth_uid !== (user.auth_uid || user.id) && (
                                        <TouchableOpacity
                                            style={styles.modalOption}
                                            onPress={() => {
                                                setReactionMessageId(activeMessage.id);
                                                setActiveMessage(null);
                                            }}
                                        >
                                            <Text style={styles.modalOptionText}>הוסף אימוג'י</Text>
                                        </TouchableOpacity>
                                    )}

                                    {activeMessage?.profiles?.auth_uid === (user.auth_uid || user.id) && (
                                        <>
                                            <TouchableOpacity
                                                style={styles.modalOption}
                                                onPress={() => {
                                                    setEditingMessageId(activeMessage.id);
                                                    const cleanText = activeMessage.content.replace(/^\[REPLY::(.*?)::(.*?)\] /s, '');
                                                    setInputText(cleanText);
                                                    setActiveMessage(null);
                                                }}
                                            >
                                                <Text style={styles.modalOptionText}>עריכה</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.modalOption, styles.modalOptionDestructive]}
                                                onPress={() => {
                                                    deleteMessage(activeMessage);
                                                    setActiveMessage(null);
                                                }}
                                            >
                                                <Text style={styles.modalOptionTextDestructive}>מחק</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.modalOption, styles.modalOptionCancel]}
                                        onPress={() => setActiveMessage(null)}
                                    >
                                        <Text style={styles.modalOptionTextCancel}>ביטול</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
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
        alignSelf: 'flex-end',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
    },
    senderName: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 4,
        marginRight: 4,
        textAlign: 'right',
    },
    senderNameInsideBubble: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#f97316',
        marginBottom: 6,
        textAlign: 'right',
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
    },
    myBubble: {
        backgroundColor: '#f97316',
        borderTopRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        borderTopLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
        textAlign: 'right',
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
        alignSelf: 'flex-start',
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row-reverse',
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
        textAlign: 'right',
    },
    sendButton: {
        backgroundColor: '#f97316',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendButtonText: {
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: 16,
    },
    moderationBanner: {
        backgroundColor: '#1e293b',
        borderTopWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        paddingVertical: 8,
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    moderationBannerText: {
        color: '#f97316',
        fontSize: 13,
        fontWeight: 'bold',
    },
    editBanner: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: '#1e293b',
        borderTopWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
    },
    editBannerText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    cancelEditText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: 'bold',
    },
    reactionsRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        marginTop: -10,
        paddingHorizontal: 15,
        gap: 4,
        zIndex: 5,
    },
    myReactionsRow: {
        justifyContent: 'flex-start',
    },
    otherReactionsRow: {
        justifyContent: 'flex-start',
    },
    reactionBadge: {
        backgroundColor: '#1e293b',
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
    },
    chatRoomAvatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(148, 163, 184, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        overflow: 'hidden',
    },
    chatRoomAvatar: {
        width: '100%',
        height: '100%',
    },
    chatRoomAvatarText: {
        fontSize: 14,
        color: '#f97316',
        fontWeight: 'bold',
    },
    replyPreviewContainer: {
        flexDirection: 'row-reverse',
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        padding: 10,
        marginHorizontal: 15,
        marginBottom: -10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        zIndex: 1
    },
    replyPreviewBorder: {
        width: 4,
        backgroundColor: '#f97316',
        borderRadius: 2,
        marginLeft: 10
    },
    replyPreviewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    replyPreviewSender: {
        color: '#f97316',
        fontWeight: 'bold',
        fontSize: 13,
        marginBottom: 2
    },
    replyPreviewText: {
        color: '#94a3b8',
        fontSize: 13
    },
    replyPreviewClose: {
        padding: 5,
        justifyContent: 'center'
    },
    replyPreviewCloseText: {
        color: '#94a3b8',
        fontSize: 18,
        fontWeight: 'bold'
    },
    bubbleReplyContainer: {
        flexDirection: 'row-reverse',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 8,
        padding: 6,
        marginBottom: 5,
        overflow: 'hidden'
    },
    bubbleReplyBorder: {
        width: 3,
        backgroundColor: '#f97316',
        borderRadius: 2,
        marginLeft: 8
    },
    bubbleReplyContent: {
        alignItems: 'flex-end',
        flexShrink: 1,
    },
    bubbleReplySender: {
        color: '#f97316',
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 2,
        textAlign: 'right'
    },
    bubbleReplyText: {
        color: '#e2e8f0',
        fontSize: 12,
        textAlign: 'right'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalTitle: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalOption: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        alignItems: 'center',
    },
    modalOptionText: {
        color: '#f8fafc',
        fontSize: 18,
    },
    modalOptionDestructive: {
        borderBottomWidth: 0,
    },
    modalOptionTextDestructive: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOptionCancel: {
        marginTop: 10,
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
        borderRadius: 10,
        borderBottomWidth: 0,
        paddingVertical: 15,
        alignItems: 'center',
    },
    modalOptionTextCancel: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: 'bold',
    }
});