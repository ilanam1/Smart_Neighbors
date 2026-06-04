import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Image, Dimensions } from 'react-native';
import ActivityIndicator from '../components/CustomLoader';
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
            .eq('is_approved', false)
            .eq('is_email_verified', true);
            
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
                    <UserCheck size={20} color="#0f172a" />
                    <Text style={styles.approveTxt}>אשר דייר</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.auth_uid)}>
                    <XCircle size={20} color="#f97316" />
                    <Text style={styles.rejectTxt}>סרב</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

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
      <View style={styles.container}>
            <View style={styles.header}>
                <Users size={32} color="#f97316" />
                <Text style={styles.headerTitle}>אישור דיירים חדשים</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color="#f97316" style={{marginTop: 50}} />
            ) : pendingUsers.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Users size={48} color="rgba(249, 115, 22, 0.4)" style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyText}>אין דיירים חדשים הממתינים לאישור ועד הבית כעת.</Text>
                </View>
            ) : (
                <FlatList 
                    data={pendingUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 50 }}
                />
            )}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', padding: 16 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20, paddingTop: 40 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginRight: 10 },
    emptyCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    emptyText: {
        color: '#cbd5e1',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
    card: {
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRightWidth: 4,
        borderRightColor: '#f97316',
    },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    name: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
    detailText: { color: '#cbd5e1', fontSize: 14, marginBottom: 4, textAlign: 'right' },
    actionsRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginTop: 16, gap: 12 },
    actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
    approveBtn: { borderColor: '#f97316', backgroundColor: '#f97316' },
    approveTxt: { color: '#0f172a', fontWeight: 'bold', marginRight: 8 },
    rejectBtn: { borderColor: '#f97316', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    rejectTxt: { color: '#f97316', fontWeight: 'bold', marginRight: 8 },
});
