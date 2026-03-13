import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { getBuildingResidents, getOrCreatePrivateChat } from '../API/chatApi';

export default function SelectUserForChatScreen({ navigation, route }) {
    const { user } = route.params;
    const [residents, setResidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creatingChat, setCreatingChat] = useState(false);

    useEffect(() => {
        fetchResidents();
    }, []);

    const fetchResidents = async () => {
        try {
            console.log('--- DBG FETCH_RESIDENTS PARAMS ---', { buildingId: user.building_id, authUid: user.auth_uid || user.id });
            // Note: passing user.auth_uid since chatApi.js expects the Supabase Auth UUID
            const data = await getBuildingResidents(user.building_id, user.auth_uid || user.id);
            console.log('--- DBG FETCH_RESIDENTS RESULT ---', data);
            setResidents(data);
        } catch (error) {
            console.error('Error fetching residents:', error);
            alert('שגיאה בטעינת דיירי הבניין');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = async (otherUser) => {
        if (creatingChat) return;
        setCreatingChat(true);
        try {
            const chat = await getOrCreatePrivateChat(user.auth_uid || user.id, otherUser.auth_uid || otherUser.id, user.building_id);
            
            // Go back to the chat list, then navigate into the new chat
            navigation.goBack();
            setTimeout(() => {
                const fName = otherUser.first_name || '';
                const lName = otherUser.last_name || '';
                const titleStr = `${fName} ${lName}`.trim();
                navigation.navigate('ChatRoom', {
                    conversationId: chat.id,
                    chatName: titleStr || otherUser.email,
                    isGroup: false,
                    user: user
                });
            }, 100);

        } catch (error) {
            console.error('Error creating chat:', error);
            alert('שגיאה ביצירת שיחה');
        } finally {
            setCreatingChat(false);
        }
    };

    const renderItem = ({ item }) => {
        const fName = item.first_name || '';
        const lName = item.last_name || '';
        const fullName = `${fName} ${lName}`.trim();
        return (
        <TouchableOpacity style={styles.userCard} onPress={() => handleSelectUser(item)} disabled={creatingChat}>
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{fName ? fName.charAt(0) : '👤'}</Text>
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{fullName || 'שכן ללא שם'}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
            </View>
        </TouchableOpacity>
    )
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

            <Text style={styles.title}>בחר שכן לשיחה</Text>
            
            {loading ? (
                <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={residents}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.emptyText}>לא נמצאו שכנים אחרים בבניין.</Text>}
                />
            )}
            
            {creatingChat && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={styles.overlayText}>פותח שיחה...</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        color: '#f8fafc',
    },
    list: {
        paddingHorizontal: 16,
    },
    userCard: {
        flexDirection: 'row-reverse',
        padding: 15,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(148, 163, 184, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 15,
    },
    avatarText: {
        fontSize: 20,
        color: '#10b981',
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    userEmail: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        marginTop: 40,
        fontSize: 16,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    overlayText: {
        color: '#FFF',
        marginTop: 10,
        fontSize: 16,
    }
});
