import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, CheckCircle, XCircle, Building, CalendarCheck } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getEmployeeCompletedJobs } from '../API/jobRequestsApi';

export default function EmployeeCompletedJobsScreen({ route }) {
    const { employeeId } = route.params;
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const data = await getEmployeeCompletedJobs(employeeId);
            setJobs(data || []);
        } catch (e) {
            Alert.alert("שגיאה", "שגיאה בטעינת הבקשות: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadJobs();
        }
    }, [isFocused]);

    const renderDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronRight size={28} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>היסטוריית משימות</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
                ) : jobs.length === 0 ? (
                    <View style={styles.emptyState}>
                        <CheckCircle size={48} color="#475569" />
                        <Text style={styles.emptyStateText}>עדיין לא סיימת אף משימה.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={jobs}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => {
                            const isDone = item.status === 'DONE';
                            return (
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.statusBadge, isDone ? styles.statusBadgeDone : styles.statusBadgeReject]}>
                                            <Text style={styles.statusText}>
                                                {isDone ? 'בוצע בהצלחה' : 'נדחה'}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                                            <Building size={16} color="#94a3b8" />
                                            <Text style={styles.buildingName}>{item.buildings?.name || 'בניין לא ידוע'}</Text>
                                        </View>
                                    </View>
                                    
                                    <Text style={styles.instructions} numberOfLines={2}>{item.instructions}</Text>
                                    
                                    <View style={styles.timeRow}>
                                        <CalendarCheck size={14} color="#64748b" />
                                        <Text style={styles.timeText}>עודכן לאחרונה: {renderDate(item.updated_at)}</Text>
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0f172a' },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
    container: { flex: 1, padding: 16 },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingBottom: 100 },
    emptyStateText: { marginTop: 16, fontSize: 16, color: '#94a3b8', fontWeight: '500' },

    card: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
        opacity: 0.85
    },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    buildingName: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginRight: 6 },
    
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadgeDone: { backgroundColor: '#10b981' },
    statusBadgeReject: { backgroundColor: '#ef4444' },
    statusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    instructions: { fontSize: 15, color: '#cbd5e1', textAlign: 'right', marginBottom: 12, textDecorationLine: 'line-through' },
    
    timeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    timeText: { fontSize: 13, color: '#64748b' }
});
