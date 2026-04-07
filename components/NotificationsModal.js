import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Bell, X, CheckCircle, Info, CheckCheck } from 'lucide-react-native';
import {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '../API/notificationsApi';

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

    const markAsReadLocally = (notificationId) => {
        setNotifications(vals =>
            vals.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            )
        );
    };

    const handlePressNotification = async (item) => {
        const isAssignmentRequest = item.type === 'assignment_request';
        const isEquipmentLoanRequest = item.type === 'equipment_loan_request';

        // מסמנים כנקרא אוטומטית רק אם זו לא התראה "פעילה" שדורשת פעולה
        if (!item.is_read && !isAssignmentRequest && !isEquipmentLoanRequest) {
            await markNotificationAsRead(item.id);
            markAsReadLocally(item.id);
        }

        if (item.type === 'assignment_request') {
            if (item.related_data?.is_handled) {
                Alert.alert("הבקשה טופלה", "כבר הגבת לבקשת שיוך זו בעבר.");
                return;
            }

            onClose();
            navigation.navigate("EmployeeAssignmentRequest", { notification: item });

        } else if (item.type === 'equipment_loan_request') {
            // בקשת השאלת ציוד - עדיין בקשה שדורשת פעולה, לכן לא סתם מסמנים וזהו
            await markNotificationAsRead(item.id);
            markAsReadLocally(item.id);

            onClose();
            Alert.alert(
                "בקשת השאלה חדשה",
                "גש למסך הבקשות הנכנסות שלך כדי לאשר או לדחות את ההשאלה."
            );

        } else if (item.type === 'equipment_loan_approved') {
            onClose();
            Alert.alert(
                "בקשת ההשאלה אושרה",
                "בעל הציוד אישר את בקשת ההשאלה שלך."
            );

        } else if (item.type === 'equipment_loan_rejected') {
            onClose();
            Alert.alert(
                "בקשת ההשאלה נדחתה",
                "בעל הציוד דחה את בקשת ההשאלה שלך."
            );

        } else if (item.type === 'job_request') {
            onClose();
            Alert.alert("התקבלה קריאה", "גש ללשונית 'בקשות פתוחות' בדף הבית כדי לצפות בה.");

        } else if (item.type === 'maintenance_notice') {
            onClose();
            Alert.alert(
                "הודעת תחזוקה",
                item.message || "צפויה עבודת תחזוקה בבניין."
            );
        

        } else if (item.type === 'house_fee_cash_request') {
            await markNotificationAsRead(item.id);
            markAsReadLocally(item.id);

            onClose();
            Alert.alert(
                "בקשת תשלום מזומן",
                item.message || "דייר ביקש לשלם במזומן עבור מיסי הוועד."
            );
        

        } else if (item.type === 'house_fee_link_paid') {
            await markNotificationAsRead(item.id);
            markAsReadLocally(item.id);

            onClose();
            Alert.alert(
                "תשלום דרך לינק הושלם",
                item.message || "דייר סימן שהתשלום בוצע בהצלחה דרך הלינק."
            );


        }
        else {
            // General notification - כבר סומן כנקרא למעלה אם היה צריך
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

    const renderNotificationIcon = (item) => {
        if (item.type === 'assignment_accepted') {
            return <CheckCircle size={20} color="#10b981" />;
        }

        if (item.type === 'assignment_rejected') {
            return <X size={20} color="#ef4444" />;
        }

        if (item.type === 'equipment_loan_approved') {
            return <CheckCircle size={20} color="#10b981" />;
        }

        if (item.type === 'equipment_loan_rejected') {
            return <X size={20} color="#ef4444" />;
        }

        if (item.type === 'equipment_loan_request') {
            return <Info size={20} color="#f59e0b" />;
        }

        if (item.type === 'job_request') {
            return <Info size={20} color="#f59e0b" />;
        }
        
        if (item.type === 'maintenance_notice') {
            return <Info size={20} color="#f59e0b" />;
        }


        if (item.type === 'house_fee_cash_request') {
            return <Info size={20} color="#f59e0b" />;
        }

        if (item.type === 'house_fee_link_paid') {
            return <CheckCircle size={20} color="#10b981" />;
        }

        return <Info size={20} color="#3b82f6" />;
    };

    const renderActionPrompt = (item) => {
        const isHandled = item.related_data?.is_handled;

        if (item.type === 'assignment_request') {
            if (!isHandled) {
                return <Text style={styles.actionPrompt}>ליחצו לפתיחה וצפייה בבקשה</Text>;
            }

            return (
                <Text style={[styles.actionPrompt, { color: '#64748b' }]}>
                    בקשה זו טופלה ונסגרה
                </Text>
            );
        }

        if (item.type === 'equipment_loan_request') {
            return (
                <Text style={styles.actionPrompt}>
                    ליחצו לצפייה ועברו למסך הבקשות הנכנסות
                </Text>
            );
        }


        if (item.type === 'house_fee_cash_request') {
            return (
                <Text style={styles.actionPrompt}>
                    לחצו לצפייה בפרטי בקשת התשלום במזומן
                </Text>
            );
        }

        if (item.type === 'house_fee_link_paid') {
            return (
                <Text style={styles.actionPrompt}>
                    לחצו לצפייה בפרטי התשלום שהושלם
                </Text>
            );
        }

        return null;
    };

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
                onPress={() => handlePressNotification(item)}
            >
                <View style={styles.iconContainer}>
                    {renderNotificationIcon(item)}
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, !item.is_read && styles.unreadText]}>
                        {item.title}
                    </Text>

                    <Text style={styles.message} numberOfLines={2}>
                        {item.message}
                    </Text>

                    {renderActionPrompt(item)}
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