import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Wrench, Clock, Building } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getEmployeeOpenJobs } from '../API/jobRequestsApi';

export default function EmployeeJobRequestsListScreen({ route }) {
    const { employeeId } = route.params;
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const data = await getEmployeeOpenJobs(employeeId);
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

    const handlePressJob = (job) => {
        // Build a notification-like object to pass to the existing EmployeeJobRequestScreen
        const fakeNotification = {
            id: job.id, // For uniqueness if needed
            sender_id: job.manager_uid,
            related_data: {
                job_id: job.id,
                report_id: job.report_id,
                building_id: job.building_id,
                building_name: job.buildings?.name || 'בניין לא ידוע',
                manager_name: 'נציג ועד',
                instructions: job.instructions,
                schedule_time: job.schedule_time,
                is_handled: job.status === 'DONE' || job.status === 'REJECTED'
            }
        };
        
        navigation.navigate("EmployeeJobRequest", { notification: fakeNotification });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronRight size={28} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>בקשות שירות פתוחות</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
                ) : jobs.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Wrench size={48} color="#475569" />
                        <Text style={styles.emptyStateText}>אין לך בקשות שירות פתוחות כרגע.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={jobs}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.card} 
                                activeOpacity={0.8}
                                onPress={() => handlePressJob(item)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>
                                            {item.status === 'PENDING' ? 'ממתין' : item.status === 'ACCEPTED' ? 'בביצוע' : 'בטיפול'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                                        <Building size={16} color="#94a3b8" />
                                        <Text style={styles.buildingName}>{item.buildings?.name || 'בניין לא ידוע'}</Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.instructions} numberOfLines={2}>{item.instructions}</Text>
                                
                                <View style={styles.timeRow}>
                                    <Clock size={14} color="#64748b" />
                                    <Text style={styles.timeText}>{item.schedule_time}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
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
    },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    buildingName: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginRight: 6 },
    
    statusBadge: { backgroundColor: '#3b82f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    instructions: { fontSize: 15, color: '#cbd5e1', textAlign: 'right', marginBottom: 12 },
    
    timeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    timeText: { fontSize: 13, color: '#64748b' }
});
