import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, Image, Dimensions } from 'react-native';
import ActivityIndicator from '../components/CustomLoader';
import { 
    Building2, 
    Trash2, 
    ArrowRight, 
    Search, 
    ShieldAlert, 
    MapPin, 
    Plus
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getSupabase } from '../DataBase/supabase';

export default function AdminBuildingsScreen({ route, navigation }) {
    const { adminUser } = route.params || {};
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Deletion Modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [buildingToDelete, setBuildingToDelete] = useState(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const supabase = getSupabase();

    useEffect(() => {
        fetchBuildings();
    }, []);

    async function fetchBuildings() {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('buildings').select('*').order('created_at', { ascending: false });
            if (error) {
                Alert.alert('שגיאה', 'לא ניתן למשוך בניינים מהשרת.');
            } else {
                setBuildings(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const confirmDeletion = (building) => {
        Alert.alert(
            "מחיקת בניין לצמיתות",
            `האם אתה בטוח שברצונך למחוק סופית את "${building.name}"?\nפעולה זו תמחק את כל הנתונים שלו (חיובים, אישורים, שיחות, משתמשים). לא ניתן לחזור לאחור!`,
            [
                { text: "ביטול", style: "cancel" },
                { 
                    text: "הבנתי, המשך למחיקה", 
                    style: 'destructive', 
                    onPress: () => {
                        setBuildingToDelete(building);
                        setAdminPassword('');
                        setShowPasswordModal(true);
                    }
                }
            ]
        );
    };

    const executeDeletion = async () => {
        if (!adminPassword) {
            Alert.alert("שגיאה", "אנא הזן סיסמת מנהל.");
            return;
        }

        if (!adminUser) {
            Alert.alert("שגיאה", "פרטי מנהל חסרים. התחבר מחדש.");
            setShowPasswordModal(false);
            return;
        }

        setIsDeleting(true);
        try {
            const { data, error } = await supabase.rpc('admin_delete_building', {
                target_building_id: buildingToDelete.id,
                admin_req_number: adminUser.admin_number,
                admin_req_password: adminPassword
            });

            if (error) {
                Alert.alert('שגיאה בתהליך המחיקה', error.message || 'סיסמה שגויה או שגיאת שרת.');
            } else {
                Alert.alert('הצלחה', `הבניין הוסר המסד בהצלחה.`);
                setBuildings(prev => prev.filter(b => b.id !== buildingToDelete.id));
                setShowPasswordModal(false);
            }
        } catch (e) {
            Alert.alert('שגיאה חמורה', e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredBuildings = buildings.filter(b => {
        const q = searchQuery.toLowerCase();
        return (b.name && b.name.toLowerCase().includes(q)) || (b.address && b.address.toLowerCase().includes(q)) || (b.city && b.city.toLowerCase().includes(q));
    });

    const renderItem = ({ item }) => (
        <LinearGradient
            colors={['#18181b', '#09090b']}
            style={styles.cardContainer}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
        >
            {/* Accent Line Left */}
            <View style={styles.accentLine} />

            {/* Left Side: Delete Button */}
            <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => confirmDeletion(item)}
                activeOpacity={0.7}
            >
                <Trash2 size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Right Side: Info Block */}
            <View style={styles.infoBlock}>
                {/* Title Row */}
                <View style={styles.titleRow}>
                    <Text style={styles.bName}>{item.name}</Text>
                    <Building2 size={16} color="#f97316" style={{ marginLeft: 8 }} />
                </View>
                
                {/* Address Row */}
                <View style={styles.addressRow}>
                    <Text style={styles.bAddress} numberOfLines={1}>{item.address}, {item.city || 'ללא עיר'}</Text>
                    <MapPin size={14} color="#f59e0b" style={{ marginLeft: 6 }} />
                </View>
            </View>
            
        </LinearGradient>
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
                    <ArrowRight size={24} color="#cbd5e1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>הבניינים שלנו</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchWrapper}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="חיפוש לפי שם, עיר או כתובת..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    textAlign="right"
                />
                <Search size={20} color="#f97316" style={styles.searchIcon} />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filteredBuildings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Building2 size={64} color="#1e293b" />
                            <Text style={styles.emptyText}>לא נמצאו בניינים תואמים</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button (New Building) */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate('AdminAddBuilding')}
                activeOpacity={0.8}
            >
                <Plus size={28} color="#ffffff" strokeWidth={3} />
            </TouchableOpacity>

            {/* Password Confirmation Modal */}
            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => !isDeleting && setShowPasswordModal(false)}
            >
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <ShieldAlert size={40} color="#ef4444" />
                        </View>
                        <Text style={styles.modalTitle}>אישור מחיקת בניין</Text>
                        <Text style={styles.modalDesc}>
                            פעולה זו לא ניתנת לביטול! אנא הזן סיסמת מנהל. מחק את הבניין {buildingToDelete?.name}.
                        </Text>
                        
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="סיסמת מנהל"
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
                                disabled={isDeleting}
                            >
                                <Text style={styles.cancelBtnText}>ביטול</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.modalBtn, styles.confirmBtn]} 
                                onPress={executeDeletion}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>מחק בניין</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    backBtnWrapper: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    searchWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#18181b',
        marginHorizontal: 16,
        marginBottom: 24,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.2)',
        height: 60,
        shadowColor: '#f97316',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#ffffff',
    },
    searchIcon: {
        marginLeft: 12,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100, // Space for FAB
    },
    cardContainer: {
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.15)',
        shadowColor: '#f97316',
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
        backgroundColor: '#f97316',
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 18,
        marginTop: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        backgroundColor: '#f97316',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f97316',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 8,
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#18181b',
        borderRadius: 24,
        padding: 30,
        width: '100%',
        maxWidth: 380,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.25)',
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
        backgroundColor: '#09090b',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.2)',
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
        backgroundColor: '#27272a',
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
    }
});
