import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Building, ClipboardList, Bell, CheckCircle } from 'lucide-react-native';
import { getSupabase } from '../DataBase/supabase';
import NotificationsModal from '../components/NotificationsModal';
import { getMyNotifications } from '../API/notificationsApi';
import { getEmployeeOpenJobs } from '../API/jobRequestsApi';

export default function EmployeeHomeScreen({ user, onSignOut }) {
    const navigation = useNavigation();
    const supabase = getSupabase();
    const [loading, setLoading] = useState(true);
    const [buildingsCount, setBuildingsCount] = useState(0);
    const [requestsCount, setRequestsCount] = useState(0);

    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const handleLogout = () => {
        Alert.alert(
            "התנתקות",
            "האם אתה בטוח שברצונך להתנתק?",
            [
                { text: "ביטול", style: "cancel" },
                { text: "התנתק", onPress: onSignOut, style: 'destructive' }
            ]
        );
    };

    const loadStats = async () => {
        setLoading(true);
        try {
            // Count buildings
            const { count: bCount, error: bError } = await supabase
                .from('employee_buildings')
                .select('*', { count: 'exact', head: true })
                .eq('employee_id', user.id);
            
            if (!bError) setBuildingsCount(bCount || 0);

            // Open requests count
            const openJobs = await getEmployeeOpenJobs(user.id);
            setRequestsCount(openJobs.length); 
            
            // Notifications
            const notifs = await getMyNotifications(user.id);
            setUnreadCount(notifs.filter(n => !n.is_read).length);
        } catch (e) {
            console.log(e);
        }
        setLoading(false);
    };

    const handleCloseNotifications = async () => {
        setShowNotifications(false);
        try {
            const notifs = await getMyNotifications(user.id);
            setUnreadCount(notifs.filter(n => !n.is_read).length);
        } catch (e) {}
    };

    useEffect(() => {
        loadStats();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={() => setShowNotifications(true)} style={styles.logoutButton}>
                        <View>
                            <Bell size={24} color="#94a3b8" />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <LogOut size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>אזור נותני השירות</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.welcomeText}>שלום, {user?.full_name}!</Text>
                    <Text style={styles.subText}>הנך מחובר למערכת כנותן שירות.</Text>
                    <Text style={styles.infoText}>מספר עובד: {user?.employee_number}</Text>
                </View>

                {/* Dashboard Stats / Buttons */}
                <View style={styles.grid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('EmployeeBuildings', { user })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                            <Building size={24} color="#3b82f6" />
                        </View>
                        <Text style={styles.actionTitle}>הבניינים שלי</Text>
                        <Text style={styles.actionDesc}>({buildingsCount} מבנים)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('EmployeeJobRequestsList', { employeeId: user.id })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#fef08a' }]}>
                            <ClipboardList size={24} color="#ca8a04" />
                        </View>
                        <Text style={styles.actionTitle}>בקשות פתוחות</Text>
                        <Text style={styles.actionDesc}>לטיפול</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionCard, { marginTop: 16, width: '100%' }]}
                        onPress={() => navigation.navigate('EmployeeCompletedJobs', { employeeId: user.id })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
                            <CheckCircle size={24} color="#16a34a" />
                        </View>
                        <Text style={styles.actionTitle}>היסטוריית משימות</Text>
                        <Text style={styles.actionDesc}>קריאות שטופלו והסתיימו</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={[styles.card, { marginTop: 20 }]}>
                    <Text style={[styles.welcomeText, { fontSize: 16, marginBottom: 10 }]}>הודעות מערכת</Text>
                    <Text style={styles.infoText}>אין הודעות מערכת חדשות.</Text>
                </View>
            </View>

            <NotificationsModal 
                visible={showNotifications} 
                onClose={handleCloseNotifications} 
                userId={user?.id} 
                navigation={navigation} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        backgroundColor: '#1e293b',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'flex-end',
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
        textAlign: 'right'
    },
    subText: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 4,
        textAlign: 'right'
    },
    infoText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 5
    },
    grid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
    },
    actionCard: {
        backgroundColor: '#1e293b',
        width: '48%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#334155',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 4,
        textAlign: 'center'
    },
    actionDesc: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center'
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#ef4444',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 4,
    }
});
