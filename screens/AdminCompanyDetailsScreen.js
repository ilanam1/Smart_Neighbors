import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    Alert, 
    ActivityIndicator,
    Modal,
    TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
    Briefcase, 
    Trash2, 
    ArrowRight, 
    ShieldAlert, 
    User, 
    Phone,
    XOctagon,
    Plus
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getSupabase } from '../DataBase/supabase';

export default function AdminCompanyDetailsScreen({ route, navigation }) {
    const { adminUser, company } = route.params || {};
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Employee deletion
    const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);

    // Company Deletion Modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [isDeletingCompany, setIsDeletingCompany] = useState(false);

    const supabase = getSupabase();

    useFocusEffect(
        useCallback(() => {
            if (company?.id) {
                fetchEmployees();
            }
        }, [company?.id])
    );

    async function fetchEmployees() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('service_employees')
                .select('*')
                .eq('company_id', company.id)
                .order('full_name', { ascending: true });
                
            if (error) {
                Alert.alert('שגיאה', 'לא ניתן למשוך עובדים מהשרת.');
                console.error(error);
            } else {
                setEmployees(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const confirmDeleteEmployee = (employee) => {
        Alert.alert(
            "מחיקת עובד",
            `האם אתה בטוח שברצונך למחוק את "${employee.full_name}"? זה יוסר מכל הבניינים תחתיו הוא עובד.`,
            [
                { text: "ביטול", style: "cancel" },
                { 
                    text: "מחק עובד", 
                    style: 'destructive', 
                    onPress: () => executeDeleteEmployee(employee)
                }
            ]
        );
    };

    const executeDeleteEmployee = async (employee) => {
        if (!adminUser) return;
        setIsDeletingEmployee(true);
        try {
            const { error } = await supabase.rpc('admin_delete_service_employee', {
                target_employee_id: employee.id,
                admin_req_number: adminUser.admin_number,
                admin_req_password: adminUser.password // We use current stored password
            });

            if (error) {
                Alert.alert("שגיאה", error.message);
            } else {
                setEmployees(prev => prev.filter(e => e.id !== employee.id));
            }
        } catch (error) {
            Alert.alert("שגיאה", error.message);
        } finally {
            setIsDeletingEmployee(false);
        }
    };

    const executeDeleteCompany = async () => {
        if (!adminPassword) {
            Alert.alert("שגיאה", "אנא הזן סיסמת מנהל.");
            return;
        }

        if (!adminUser) {
            Alert.alert("שגיאה", "פרטי מנהל חסרים. התחבר מחדש.");
            setShowPasswordModal(false);
            return;
        }

        setIsDeletingCompany(true);
        try {
            const { error } = await supabase.rpc('admin_delete_service_company', {
                target_company_id: company.id,
                admin_req_number: adminUser.admin_number,
                admin_req_password: adminPassword
            });

            if (error) {
                Alert.alert('שגיאה במחיקת חברה', error.message || 'סיסמה שגויה או שגיאת שרת.');
            } else {
                Alert.alert('הצלחה', 'החברה וכלל עובדיה נמחקו מהמערכת.');
                setShowPasswordModal(false);
                navigation.goBack();
            }
        } catch (e) {
            Alert.alert('שגיאה חמורה', e.message);
        } finally {
            setIsDeletingCompany(false);
        }
    };

    const renderItem = ({ item }) => (
        <LinearGradient
            colors={['#0c1f38', '#0a1b31']}
            style={styles.cardContainer}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
        >
            <View style={styles.accentLine} />

            <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => confirmDeleteEmployee(item)}
                activeOpacity={0.7}
            >
                <Trash2 size={20} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.infoBlock}>
                <View style={styles.titleRow}>
                    <Text style={styles.bName}>{item.full_name}</Text>
                    <User size={16} color="#fbbf24" style={{ marginLeft: 8 }} />
                </View>
                
                <View style={styles.addressRow}>
                    <Text style={styles.bAddress}>{item.phone || 'ללא מספר'}</Text>
                    <Phone size={14} color="#06b6d4" style={{ marginLeft: 6 }} />
                </View>
            </View>
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
                    <ArrowRight size={24} color="#cbd5e1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{company?.name}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#22d3ee" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={employees}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <User size={64} color="#1e293b" />
                            <Text style={styles.emptyText}>לחברה זו אין עדיין עובדים רשומים</Text>
                        </View>
                    }
                    ListHeaderComponent={
                        <View style={styles.companyHeaderBox}>
                            <Briefcase size={32} color="#06b6d4" />
                            <Text style={styles.companyInfoText}>ניהול עובדי {company?.name}</Text>
                        </View>
                    }
                />
            )}

            {/* Delete Company Button */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.deleteCompanyBtn} 
                    onPress={() => {
                        setAdminPassword('');
                        setShowPasswordModal(true);
                    }}
                    activeOpacity={0.8}
                >
                    <XOctagon size={20} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={styles.deleteCompanyText}>מחיקת חברה לצמיתות</Text>
                </TouchableOpacity>
            </View>

            {/* Floating Action Button (New Employee) */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate('AdminAddEmployee', { adminUser, company })}
                activeOpacity={0.8}
            >
                <Plus size={28} color="#0f172a" strokeWidth={3} />
            </TouchableOpacity>

            {/* Password Confirmation Modal */}
            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => !isDeletingCompany && setShowPasswordModal(false)}
            >
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <ShieldAlert size={40} color="#ef4444" />
                        </View>
                        <Text style={styles.modalTitle}>אזהרה - מחיקת חברה</Text>
                        <Text style={styles.modalDesc}>
                            האם אתה בטוח שברצונך למחוק את {company?.name}?
                            כלל העובדים בחברה ימחקו גם הם וייסרו מכל הבניינים.
                        </Text>
                        
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="הזן סיסמת מנהל לאישור"
                            placeholderTextColor="#64748b"
                            secureTextEntry
                            value={adminPassword}
                            onChangeText={setAdminPassword}
                            textAlign="right"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, styles.cancelBtn]} 
                                onPress={() => setShowPasswordModal(false)}
                                disabled={isDeletingCompany}
                            >
                                <Text style={styles.cancelBtnText}>ביטול</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.modalBtn, styles.confirmBtn]} 
                                onPress={executeDeleteCompany}
                                disabled={isDeletingCompany || adminPassword.length < 4}
                            >
                                {isDeletingCompany ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>מחק חברה</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#051121', 
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 65,
        paddingBottom: 20,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    backBtnWrapper: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    companyHeaderBox: {
        alignItems: 'center',
        marginBottom: 24,
        padding: 24,
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.2)'
    },
    companyInfoText: {
        marginTop: 12,
        fontSize: 18,
        color: '#f8fafc',
        fontWeight: 'bold'
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    cardContainer: {
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.3)',
        shadowColor: '#00f2ff',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
        position: 'relative',
        overflow: 'hidden'
    },
    accentLine: {
        position: 'absolute',
        left: 0,
        top: '30%',
        width: 4,
        height: 48,
        backgroundColor: '#06b6d4',
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    deleteButton: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    infoBlock: {
        flex: 1,
        alignItems: 'flex-end', 
        paddingHorizontal: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    bName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bAddress: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        backgroundColor: '#0F172A',
    },
    deleteCompanyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    deleteCompanyText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: 'bold'
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 18,
        marginTop: 16,
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#0f172a',
        borderRadius: 24,
        padding: 30,
        width: '100%',
        maxWidth: 380,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 12,
    },
    modalDesc: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 24,
    },
    passwordInput: {
        width: '100%',
        height: 55,
        backgroundColor: '#051121',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        color: '#f8fafc',
        fontSize: 16,
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    modalActions: {
        flexDirection: 'row-reverse',
        width: '100%',
        gap: 16,
    },
    modalBtn: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#1e293b',
    },
    cancelBtnText: {
        color: '#cbd5e1',
        fontWeight: 'bold',
    },
    confirmBtn: {
        backgroundColor: '#ef4444',
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 100, // Slightly above the footer
        left: 24, 
        backgroundColor: '#06b6d4',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#06b6d4',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 8,
        zIndex: 10
    }
});
