import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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
        backgroundColor: '#F7F9FC',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        color: '#333',
    },
    list: {
        paddingHorizontal: 16,
    },
    userCard: {
        flexDirection: 'row-reverse',
        padding: 15,
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    avatarPlaceholder: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#E1BEE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 15,
    },
    avatarText: {
        fontSize: 20,
        color: '#6A1B9A',
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    userEmail: {
        fontSize: 13,
        color: '#777',
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
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
