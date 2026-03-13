import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUserConversations, getBuildingGroupChat } from '../API/chatApi';

export default function ChatListScreen({ navigation, route }) {
    const { user } = route.params;
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchChats();
        }, [])
    );

    const fetchChats = async () => {
        setLoading(true);
        try {
            // First, ensure the user is part of the building group chat
            if (user.building_id) {
                await getBuildingGroupChat(user.building_id, user.id);
            }
            
            // Then fetch all conversations
            const convos = await getUserConversations(user.id);
            setConversations(convos);
        } catch (error) {
            console.error('Error fetching chats:', error);
            alert('שגיאה בטעינת השיחות');
        } finally {
            setLoading(false);
        }
    };

    const handlePressChat = (chat) => {
        let chatName = 'קבוצת הבניין';
        if (!chat.is_group) {
            // Find the other participant's name
            const otherParticipant = chat.conversation_participants.find(p => p.profile_id !== user.id);
            if (otherParticipant && otherParticipant.profiles) {
                const fName = otherParticipant.profiles.first_name || '';
                const lName = otherParticipant.profiles.last_name || '';
                chatName = `${fName} ${lName}`.trim() || otherParticipant.profiles.email;
            } else {
                chatName = 'שיחה פרטית';
            }
        }
        
        navigation.navigate('ChatRoom', { 
            conversationId: chat.id, 
            chatName: chatName,
            user: user 
        });
    };

    const renderItem = ({ item }) => {
        let chatTitle = 'קבוצת הבניין';
        let subTitle = 'צ\'אט כללי לכל הבניין';
        
        if (!item.is_group) {
            const otherParticipant = item.conversation_participants?.find(p => p.profile_id !== user.id);
            if (otherParticipant && otherParticipant.profiles) {
                const fName = otherParticipant.profiles.first_name || '';
                const lName = otherParticipant.profiles.last_name || '';
                chatTitle = `${fName} ${lName}`.trim() || 'שכן ללא שם';
                subTitle = 'שיחה פרטית';
            } else {
                chatTitle = 'שיחה פרטית';
            }
        }

        return (
            <TouchableOpacity style={styles.chatCard} onPress={() => handlePressChat(item)}>
               <View style={styles.chatIconPlaceholder}>
                   <Text style={styles.chatIconText}>{item.is_group ? '🏢' : '👤'}</Text>
               </View>
               <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle}>{chatTitle}</Text>
                    <Text style={styles.chatSubtitle}>{subTitle}</Text>
               </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>הודעות וצ'אטים</Text>
            
            {loading ? (
                 <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 20 }}/>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>לא נמצאו שיחות.</Text>}
                />
            )}

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate('SelectUserForChat', { user })}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginVertical: 20,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    chatCard: {
        flexDirection: 'row-reverse',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    chatIconPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 15,
    },
    chatIconText: {
        fontSize: 24,
    },
    chatInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    chatSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
        marginTop: 50,
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#007BFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    fabIcon: {
        color: '#FFF',
        fontSize: 30,
        fontWeight: 'bold',
    }
});
