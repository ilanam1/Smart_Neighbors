import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { Trash2, Search, ArrowRight, User, Mail, SearchX, MapPin } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getSupabase } from '../DataBase/supabase';

export default function DeleteUserScreen({ navigation, route }) {
    const { adminUser } = route.params || {};
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const supabase = getSupabase();

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        try {
            if (!adminUser) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.rpc('get_all_profiles_as_admin', {
                admin_req_number: adminUser.admin_number,
                admin_req_password: adminUser.password
            });

            if (error) {
                console.error('Error fetching users:', error);
                Alert.alert('שגיאה', 'לא ניתן למשוך משתמשים: ' + (error.message || 'שגיאת שרת לא ידועה'));
            } else {
                setUsers(data || []);
            }
        } catch (e) {
            console.error('Exception fetching users:', e);
            Alert.alert('שגיאה', e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteUser(targetUser) {
        Alert.alert(
            "אישור מחיקה סופית",
            `האם אתה בטוח שברצונך למחוק לצמיתות את ${targetUser.first_name || 'משתמש זה'}?\nפעולה זו תמחק את כל נתוניו ולא ניתנת לביטול.`,
            [
                { text: "ביטול", style: "cancel" },
                {
                    text: "הבנתי, מחק סופית",
                    style: 'destructive',
                    onPress: () => performDelete(targetUser)
                }
            ]
        );
    }

    async function performDelete(targetUser) {
        if (!adminUser) {
            Alert.alert("שגיאה אימות", "חסרים פרטי מנהל. התחבר מחדש.");
            return;
        }

        // Optimistic UI update
        setUsers(prev => prev.filter(u => u.id !== targetUser.id));

        try {
            const { data, error } = await supabase.rpc('delete_user_as_admin', {
                target_user_id: targetUser.auth_uid,
                admin_req_number: adminUser.admin_number,
                admin_req_password: adminUser.password
            });

            if (error) {
                console.error('Delete RPC Error:', error);
                Alert.alert('שגיאה במחיקה', error.message);
                fetchUsers(); // Revert on fail
            } else {
                Alert.alert('הצלחה', `המשתמש הוסר בהצלחה מהמערכת.`);
            }
        } catch (e) {
            console.error('Delete Exception:', e);
            Alert.alert('שגיאה מהותית', e.message);
            fetchUsers();
        }
    }

    const filteredUsers = users.filter(user => {
        const q = searchQuery.toLowerCase();
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(q) || email.includes(q);
    });

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
                onPress={() => handleDeleteUser(item)}
                activeOpacity={0.7}
            >
                <Trash2 size={20} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.infoBlock}>
                <View style={styles.titleRow}>
                    <Text style={styles.bName}>
                        {item.first_name} {item.last_name}
                        {item.is_house_committee ? ' (ועד בית)' : ''}
                    </Text>
                    <User size={16} color="#fbbf24" style={{ marginLeft: 8 }} />
                </View>
                
                <View style={styles.addressRow}>
                    <Text style={styles.bAddress} numberOfLines={1}>{item.email}</Text>
                    <Mail size={14} color="#06b6d4" style={{ marginLeft: 6 }} />
                </View>

                {item.address && (
                    <View style={[styles.addressRow, { marginTop: 6 }]}>
                        <Text style={[styles.bAddress, { fontSize: 12 }]} numberOfLines={1}>
                            כתובת: {item.address}
                        </Text>
                        <MapPin size={12} color="#06b6d4" style={{ marginLeft: 6 }} />
                    </View>
                )}
            </View>
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
                    <ArrowRight size={24} color="#cbd5e1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ניהול משתמשי מערכת</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchWrapper}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="חפש משתמשים לפי שם או אימייל..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    textAlign="right"
                />
                <Search size={20} color="#22d3ee" style={styles.searchIcon} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#22d3ee" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <User size={64} color="#1e293b" />
                            <Text style={styles.emptyText}>לא נמצאו משתמשים תואמים לחיפוש.</Text>
                        </View>
                    }
                />
            )}
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
        backgroundColor: '#0a1b31',
        marginHorizontal: 16,
        marginBottom: 24,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        height: 60,
        shadowColor: '#00f2ff',
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
        paddingBottom: 60,
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
        height: 60,
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 18,
        marginTop: 16,
    }
});
