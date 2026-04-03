import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Building, User, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { respondToAssignmentRequest } from '../API/notificationsApi';

export default function EmployeeAssignmentRequestScreen({ route }) {
    const navigation = useNavigation();
    const notification = route.params?.notification;
    
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    if (!notification) {
        return (
            <SafeAreaView style={styles.safe}>
                <Text style={styles.errorText}>שגיאה בטעינת הבקשה.</Text>
            </SafeAreaView>
        );
    }

    const { building_name, building_id } = notification.related_data;

    const handleAction = async (isAccepted) => {
        try {
            setLoading(true);
            await respondToAssignmentRequest(notification, isAccepted, reason.trim());
            
            Alert.alert(
                "עודכן בהצלחה",
                isAccepted ? "השיוך בוצע. הועד יקבל התראה על כך." : "סירבת לבקשה. הועד יעודכן.",
                [{ text: "סגור", onPress: () => navigation.goBack() }]
            );
        } catch (e) {
            console.log(e);
            Alert.alert("שגיאה", "משהו השתבש, נסה שוב.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowRight size={24} color="#f8fafc" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>בקשת שיוך לבניין</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.card}>
                        <View style={styles.iconCircle}>
                            <Building size={32} color="#3b82f6" />
                        </View>
                        <Text style={styles.title}>נציג בניין שלח לך בקשה!</Text>
                        <Text style={styles.subtitle}>
                            רוצים לצרף אותך כנותן שירות רשמי לבניין "{building_name}".
                        </Text>
                        
                        <View style={styles.detailRow}>
                            <Text style={styles.detailText}>{building_name}</Text>
                            <Building size={16} color="#94a3b8" />
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailText}>כדי לאשר ולהתחיל לקבל פניות, לחץ על אישור.</Text>
                            <InfoIcon size={16} color="#94a3b8" />
                        </View>
                    </View>

                    <Text style={styles.label}>הודעה לועד (אופציונלי):</Text>
                    <TextInput
                        style={styles.input}
                        value={reason}
                        onChangeText={setReason}
                        placeholder="למשל: תודה, אשמח לעבוד אתכם. או: לצערי אני עמוס."
                        placeholderTextColor="#64748b"
                        multiline
                    />

                    <View style={styles.actionsBox}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#3b82f6" />
                        ) : (
                            <View style={styles.row}>
                                <TouchableOpacity 
                                    style={[styles.btn, styles.declineBtn]}
                                    onPress={() => handleAction(false)}
                                >
                                    <Text style={styles.declineBtnText}>סרב לבקשה</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.btn, styles.acceptBtn]}
                                    onPress={() => handleAction(true)}
                                >
                                    <Text style={styles.acceptBtnText}>אשר שיוך</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const InfoIcon = ({ size, color }) => (
    <View style={{ width: size, height: size, borderRadius: size/2, borderWidth: 1, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontSize: size*0.7, fontWeight: 'bold' }}>i</Text>
    </View>
);

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    errorText: {
        color: '#f8fafc',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 24,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#cbd5e1',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: '100%',
        marginBottom: 8,
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    label: {
        fontSize: 14,
        color: '#e2e8f0',
        marginBottom: 8,
        textAlign: 'right',
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 16,
        color: '#f8fafc',
        minHeight: 100,
        textAlignVertical: 'top',
        textAlign: 'right',
        marginBottom: 30,
    },
    actionsBox: {
        marginTop: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    declineBtn: {
        backgroundColor: 'transparent',
        borderColor: '#ef4444',
    },
    declineBtnText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 16,
    },
    acceptBtn: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    acceptBtnText: {
        color: '#0f172a',
        fontWeight: '900',
        fontSize: 16,
    }
});
