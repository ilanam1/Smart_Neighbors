import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getSupabase } from '../DataBase/supabase';
import { Users, XCircle, UserCheck } from 'lucide-react-native';

export default function CommitteePendingUsersScreen({ route, navigation }) {
    const { buildingId } = route.params || {};
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const supabase = getSupabase();

    useEffect(() => {
        if (buildingId) fetchPending();
    }, [buildingId]);

    const fetchPending = async () => {
        setLoading(true);
        // Committee fetches all users in their building who aren't committee and aren't approved yet
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('building_id', buildingId)
            .eq('is_house_committee', false)
            .eq('is_approved', false);
            
        if (!error && data) {
            setPendingUsers(data);
        }
        setLoading(false);
    };

    const handleApprove = async (userId) => {
        Alert.alert('אישור דייר', 'האם אתה בטוח שברצונך לאשר כניסה של דייר זה לבניין?', [
            { text: 'ביטול', style: 'cancel' },
            { text: 'אישור', style: 'default', onPress: async () => {
                const { error } = await supabase.rpc('approve_user', { target_user_id: userId });
                if (!error) {
                    Alert.alert('הצלחה', 'המשתמש אושר בהצלחה!');
                    fetchPending();
                } else {
                    Alert.alert('שגיאה', 'לא ניתן היה לאשר את המשתמש.');
                }
            }}
        ]);
    };

    const handleReject = async (authUid) => {
        Alert.alert('דחיית דייר', 'האם אתה בטוח שברצונך לדחות משתמש זה ולחסום את הצטרפותו לבניין?', [
            { text: 'ביטול', style: 'cancel' },
            { text: 'דחה ומחק', style: 'destructive', onPress: async () => {
                // Remove the user from DB allowing them to register again correctly if needed
                const { error } = await supabase.rpc('delete_rejected_user', { target_user_id: authUid });
                if (!error) {
                    Alert.alert('הצלחה', 'רישום המשתמש בוטל לחלוטין.');
                    fetchPending();
                } else {
                    Alert.alert('שגיאה', 'לא ניתן היה לבטל את רישום המשתמש.');
                }
            }}
        ]);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
            </View>
            <Text style={styles.detailText}>דירה / משפחה: {item.address}</Text>
            <Text style={styles.detailText}>טלפון: {item.phone}</Text>
            
            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.auth_uid)}>
                    <UserCheck size={20} color="#10b981" />
                    <Text style={styles.approveTxt}>אשר דייר</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.auth_uid)}>
                    <XCircle size={20} color="#ef4444" />
                    <Text style={styles.rejectTxt}>סרב</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Users size={32} color="#f59e0b" />
                <Text style={styles.headerTitle}>אישור דיירים חדשים</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color="#f59e0b" style={{marginTop: 50}} />
            ) : pendingUsers.length === 0 ? (
                <Text style={styles.emptyText}>אין דיירים חדשים הממתינים לאישור ועד הבית כעת.</Text>
            ) : (
                <FlatList 
                    data={pendingUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 50 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20, paddingTop: 40 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginRight: 10 },
    emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 40, fontSize: 16 },
    card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    name: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
    detailText: { color: '#cbd5e1', fontSize: 14, marginBottom: 4, textAlign: 'right' },
    actionsRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginTop: 16, gap: 12 },
    actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
    approveBtn: { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    approveTxt: { color: '#10b981', fontWeight: 'bold', marginRight: 8 },
    rejectBtn: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    rejectTxt: { color: '#ef4444', fontWeight: 'bold', marginRight: 8 },
});
