import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
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
            
            // Sort conversations: group chat first, then by updated_at (newest first)
            const sortedConvos = convos.sort((a, b) => {
                if (a.is_group && !b.is_group) return -1;
                if (!a.is_group && b.is_group) return 1;
                
                const dateA = new Date(a.updated_at || a.created_at);
                const dateB = new Date(b.updated_at || b.created_at);
                return dateB - dateA; // Descending
            });
            
            setConversations(sortedConvos);
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
            isGroup: chat.is_group,
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
        backgroundColor: '#0F172A',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f8fafc',
        textAlign: 'center',
        marginVertical: 20,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    chatCard: {
        flexDirection: 'row-reverse',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
    },
    chatIconPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(148, 163, 184, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.18)',
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
        color: '#f8fafc',
        marginBottom: 4,
    },
    chatSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
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
        backgroundColor: '#ff0080',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ff0080',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    fabIcon: {
        color: '#FFF',
        fontSize: 30,
        fontWeight: 'bold',
    }
});
