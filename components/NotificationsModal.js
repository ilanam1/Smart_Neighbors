import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Bell, X, CheckCircle, Info, CheckCheck } from 'lucide-react-native';
import { getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../API/notificationsApi';

export default function NotificationsModal({ visible, onClose, userId, navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && userId) {
            loadNotifications();
        }
    }, [visible, userId]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await getMyNotifications(userId);
            setNotifications(data);
        } catch (e) {
            console.log(e);
        }
        setLoading(false);
    };

    const handlePressNotification = async (item) => {
        if (!item.is_read && item.type !== 'assignment_request') {
            await markNotificationAsRead(item.id);
            // Optionally update state locally to reflect read
            setNotifications(vals => vals.map(n => n.id === item.id ? { ...n, is_read: true } : n));
        }

        if (item.type === 'assignment_request') {
            if (item.related_data?.is_handled) {
                Alert.alert("הבקשה טופלה", "כבר הגבת לבקשת שיוך זו בעבר.");
                return;
            }
            onClose(); // Close modal
            navigation.navigate("EmployeeAssignmentRequest", { notification: item });
        } else {
            // General notification, could just mark as read
        }
    };

    const handleMarkAllRead = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            await markAllNotificationsAsRead(userId);
            setNotifications(vals => vals.map(n => ({ ...n, is_read: true })));
        } catch (e) {
            console.log(e);
        }
        setLoading(false);
    };

    const renderItem = ({ item }) => {
        const isActionable = item.type === 'assignment_request';
        const isHandled = item.related_data?.is_handled;

        return (
            <TouchableOpacity 
                style={[styles.notificationCard, !item.is_read && styles.unreadCard]} 
                onPress={() => handlePressNotification(item)}
            >
                <View style={styles.iconContainer}>
                    {item.type === 'assignment_accepted' ? (
                        <CheckCircle size={20} color="#10b981" />
                    ) : item.type === 'assignment_rejected' ? (
                        <X size={20} color="#ef4444" />
                    ) : (
                        <Info size={20} color="#3b82f6" />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    {isActionable && !isHandled && (
                        <Text style={styles.actionPrompt}>ליחצו לפתיחה וצפייה בבקשה</Text>
                    )}
                    {isActionable && isHandled && (
                        <Text style={[styles.actionPrompt, { color: '#64748b' }]}>בקשה זו טופלה ונסגרה</Text>
                    )}
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
                <View style={styles.popupContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#94a3b8" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>התראות אחרונות</Text>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                            <Bell size={20} color="#94a3b8" />
                            {notifications.some(n => !n.is_read) && (
                                <TouchableOpacity onPress={handleMarkAllRead} style={{ paddingHorizontal: 5 }}>
                                    <CheckCheck size={20} color="#3b82f6" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#3b82f6" />
                        </View>
                    ) : notifications.length === 0 ? (
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>אין לך התראות חדשות</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={notifications}
                            keyExtractor={item => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 80,
    },
    popupContainer: {
        backgroundColor: '#1e293b',
        width: '90%',
        maxHeight: '60%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        backgroundColor: '#0f172a',
    },
    closeBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    listContent: {
        padding: 12,
    },
    center: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#64748b',
        fontSize: 16,
    },
    notificationCard: {
        flexDirection: 'row-reverse',
        padding: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 12,
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    unreadCard: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    iconContainer: {
        marginLeft: 12,
        marginTop: 2,
    },
    textContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#e2e8f0',
        marginBottom: 4,
    },
    unreadText: {
        color: '#f8fafc',
        fontWeight: 'bold',
    },
    message: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'right',
        lineHeight: 18,
    },
    actionPrompt: {
        marginTop: 6,
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: 'bold',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        marginTop: 6,
        marginLeft: 8,
    }
});
