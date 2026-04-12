import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getSupabase } from '../DataBase/supabase';
import { ShieldCheck, XCircle, UserCheck } from 'lucide-react-native';

export default function AdminPendingCommitteesScreen({ route, navigation }) {
    const { adminUser } = route.params || {};
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const supabase = getSupabase();

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        if (!adminUser) { setLoading(false); return; }

        // Fetch all profiles securely via Admin RPC
        const { data: profilesData, error: profilesError } = await supabase.rpc('get_all_profiles_as_admin', {
            admin_req_number: adminUser.admin_number,
            admin_req_password: adminUser.password
        });
        
        let committees = [];
        if (!profilesError && profilesData) {
            committees = profilesData.filter(p => p.is_house_committee === true && p.is_approved === false);
        }

        // Attempt to fetch building names
        try {
            const { data: buildings } = await supabase.from('buildings').select('id, name');
            if (buildings) {
                committees = committees.map(c => {
                    const b = buildings.find(b => b.id === c.building_id);
                    return { ...c, buildings: { name: b ? b.name : 'בניין לא ידוע' } };
                });
            }
        } catch(e) {}

        setPendingUsers(committees);
        setLoading(false);
    };

    const handleApprove = async (userId) => {
        Alert.alert('אישור ועד בית', 'האם אתה בטוח שברצונך לאשר משתמש זה כועד הבית של הבניין שלו?', [
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
        Alert.alert('דחיית ועד בית', 'האם אתה בטוח שברצונך למחוק משתמש זה לצמיתות מהמערכת?', [
            { text: 'ביטול', style: 'cancel' },
            { text: 'מחק משתמש', style: 'destructive', onPress: async () => {
                // We use the secure delete_rejected_user RPC so it cleans Auth and Profiles securely
                const { error } = await supabase.rpc('delete_rejected_user', { target_user_id: authUid });
                if (!error) {
                    Alert.alert('הצלחה', 'המשתמש נמחק מהמערכת.');
                    fetchPending();
                } else {
                    Alert.alert('שגיאה', 'לא ניתן למחוק את המשתמש.');
                }
            }}
        ]);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
                <Text style={styles.buildingTag}>{item.buildings?.name || 'ללא בניין'}</Text>
            </View>
            <Text style={styles.detailText}>אימייל: {item.email}</Text>
            <Text style={styles.detailText}>טלפון: {item.phone}</Text>
            <Text style={styles.detailText}>ת.ז: {item.id_number}</Text>
            <Text style={styles.detailText}>כתובת: {item.address}</Text>
            
            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.auth_uid)}>
                    <UserCheck size={20} color="#10b981" />
                    <Text style={styles.approveTxt}>אשר ועד</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.auth_uid)}>
                    <XCircle size={20} color="#ef4444" />
                    <Text style={styles.rejectTxt}>סרב ומחק</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ShieldCheck size={32} color="#00f2ff" />
                <Text style={styles.headerTitle}>ניהול ועדי בית ממתינים</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color="#00f2ff" style={{marginTop: 50}} />
            ) : pendingUsers.length === 0 ? (
                <Text style={styles.emptyText}>אין ועדי בית הממתינים לאישור מנהל כעת.</Text>
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
    buildingTag: { backgroundColor: '#3b82f6', color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 12, overflow: 'hidden' },
    detailText: { color: '#cbd5e1', fontSize: 14, marginBottom: 4, textAlign: 'right' },
    actionsRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginTop: 16, gap: 12 },
    actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
    approveBtn: { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    approveTxt: { color: '#10b981', fontWeight: 'bold', marginRight: 8 },
    rejectBtn: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    rejectTxt: { color: '#ef4444', fontWeight: 'bold', marginRight: 8 },
});
