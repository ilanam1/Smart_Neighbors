import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, CheckCircle, Info, CalendarClock, Briefcase, X } from 'lucide-react-native';
import { getSupabase } from '../DataBase/supabase';
import { markJobAsDone, rejectJob } from '../API/jobRequestsApi';

export default function EmployeeJobRequestScreen({ route, navigation }) {
    const { notification } = route.params;
    const { related_data } = notification;
    
    // Safety check
    if (!related_data || !related_data.job_id) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <Text style={{color: 'red', textAlign: 'center'}}>שגיאה: חסרים פרטי קריאה.</Text>
            </SafeAreaView>
        );
    }

    const [loading, setLoading] = useState(false);
    const [isHandledLocally, setIsHandledLocally] = useState(false);

    const handleMarkAsDone = async () => {
        Alert.alert(
            "אישור סיום משימה",
            "האם סיימת לטפל במטרד בהצלחה? (פעולה זו תעדכן את הועד המנהל ותסגור את הקריאה)",
            [
                { text: "עדיין לא", style: "cancel" },
                {
                    text: "כן, סיימתי",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await markJobAsDone(
                                related_data.job_id,
                                related_data.report_id,
                                notification.sender_id, // The committee member who sent it
                                null, // Optional employee name
                                related_data.tenant_id,
                                related_data.report_type
                            );

                            // Update the notification so it's not clickable anymore
                            const supabase = getSupabase();
                            await supabase
                                .from("app_notifications")
                                .update({ 
                                    is_read: true,
                                    related_data: { ...related_data, is_handled: true, resolution: 'done' }
                                })
                                .eq("id", notification.id);

                            Alert.alert("מעולה!", "המשימה סומנה כטופלה בהצלחה.");
                            setIsHandledLocally(true);
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert("שגיאה", "שגיאה בסגירת המשימה: " + e.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleRejectJob = async () => {
        Alert.alert(
            "דחיית המשימה",
            "האם אתה בטוח שאינך פנוי או לא יכול לבצע את המשימה כעת?",
            [
                { text: "ביטול", style: "cancel" },
                {
                    text: "דחה משימה",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);

                            await rejectJob(
                                related_data.job_id,
                                notification.sender_id,
                                null
                            );

                            const supabase = getSupabase();
                            await supabase
                                .from("app_notifications")
                                .update({ 
                                    is_read: true,
                                    related_data: { ...related_data, is_handled: true, resolution: 'rejected' }
                                })
                                .eq("id", notification.id);

                            Alert.alert("נדחה", "המשימה נדחתה. הועד יעודכן.");
                            setIsHandledLocally(true);
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert("שגיאה", e.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const isAlreadyHandled = notification.related_data?.is_handled || isHandledLocally;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronRight size={28} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>קריאת שירות</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Briefcase size={24} color="#f59e0b" />
                        <Text style={styles.buildingName}>{related_data.building_name}</Text>
                    </View>

                    <Text style={styles.senderText}>הקריאה נפתחה על ידי: {related_data.manager_name}</Text>
                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Info size={18} color="#94a3b8" />
                        <Text style={styles.infoLabel}>תיאור הבעיה / מה צריך לעשות:</Text>
                    </View>
                    <Text style={styles.infoText}>{related_data.instructions}</Text>

                    <View style={styles.infoRow}>
                        <CalendarClock size={18} color="#94a3b8" />
                        <Text style={styles.infoLabel}>זמן לביצוע:</Text>
                    </View>
                    <Text style={styles.infoText}>{related_data.schedule_time}</Text>
                </View>

                {isAlreadyHandled ? (
                    <View style={styles.handledBox}>
                        <Text style={styles.handledText}>הגבת לקריאה זו והיא סגורה</Text>
                    </View>
                ) : (
                    <View style={styles.actionsContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#3b82f6" />
                        ) : (
                            <>
                                <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAsDone}>
                                    <CheckCircle size={22} color="white" />
                                    <Text style={styles.actionBtnText}>סיימתי / אישור טיפול</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.rejectBtn} onPress={handleRejectJob}>
                                    <X size={20} color="#f87171" />
                                    <Text style={styles.rejectBtnText}>דחה קריאה</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
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
    
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
    buildingName: { fontSize: 22, fontWeight: '900', color: '#f8fafc' },
    senderText: { fontSize: 13, color: '#94a3b8', textAlign: 'right' },
    divider: { height: 1, backgroundColor: '#334155', marginVertical: 16 },
    
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
    infoLabel: { fontSize: 14, fontWeight: '700', color: '#cbd5e1' },
    infoText: { fontSize: 16, color: '#f8fafc', textAlign: 'right', marginBottom: 16, marginRight: 26 },

    actionsContainer: { marginTop: 30, gap: 12 },
    actionBtn: {
        backgroundColor: '#10b981', // Green
        paddingVertical: 16,
        borderRadius: 14,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
    },
    actionBtnText: { color: 'white', fontSize: 18, fontWeight: '800' },

    rejectBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#f87171'
    },
    rejectBtnText: { color: '#f87171', fontSize: 16, fontWeight: '700' },

    handledBox: { marginTop: 30, padding: 20, backgroundColor: '#334155', borderRadius: 12 },
    handledText: { textAlign: 'center', color: '#f8fafc', fontSize: 16, fontWeight: 'bold' }
});
