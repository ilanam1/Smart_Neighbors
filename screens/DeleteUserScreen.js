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
import { Trash2, Search, ArrowLeft } from 'lucide-react-native';
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
                Alert.alert('Error', 'Could not fetch users: ' + (error.message || 'Unknown RPC error'));
            } else {
                setUsers(data || []);
            }
        } catch (e) {
            console.error('Exception fetching users:', e);
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteUser(targetUser) {
        Alert.alert(
            "Confirm Deletion",
            `Are you sure you want to permanently delete ${targetUser.first_name || 'this user'}? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: 'destructive',
                    onPress: () => performDelete(targetUser)
                }
            ]
        );
    }

    async function performDelete(targetUser) {
        if (!adminUser) {
            Alert.alert("Error", "Admin credentials missing. Please relogin.");
            return;
        }


        setUsers(prev => prev.filter(u => u.id !== targetUser.id));

        try {
            const { data, error } = await supabase.rpc('delete_user_as_admin', {
                target_user_id: targetUser.auth_uid,
                admin_req_number: adminUser.admin_number,
                admin_req_password: adminUser.password
            });

            if (error) {
                console.error('Delete RPC Error:', error);
                Alert.alert('Delete Failed', error.message);
                fetchUsers();
            } else {
                console.log('Delete success:', data);

            }
        } catch (e) {
            console.error('Delete Exception:', e);
            Alert.alert('Error', e.message);
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
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>
                    {item.first_name} {item.last_name}
                </Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userDetail}>{item.address}</Text>
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteUser(item)}
            >
                <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Users</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Search size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No users found.</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    backButton: {
        padding: 8,
        marginLeft: -8
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 2,
    },
    userDetail: {
        fontSize: 12,
        color: '#9ca3af',
    },
    deleteButton: {
        padding: 10,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        marginLeft: 12,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#9ca3af',
        fontSize: 16,
    },
});
