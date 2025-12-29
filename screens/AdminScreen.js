import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LogOut, Trash2 } from 'lucide-react-native';

export default function AdminScreen({ user, onSignOut, navigation }) {

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: onSignOut, style: 'destructive' }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <LogOut size={24} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.welcomeText}>Welcome, {user?.full_name || 'Admin'}!</Text>
                    <Text style={styles.subText}>You are logged in as an administrator.</Text>
                    <Text style={styles.infoText}>Admin Number: {user?.admin_number}</Text>
                </View>

                {/* Admin Features Grid */}
                <View style={styles.grid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('DeleteUsers', { adminUser: user })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                            <Trash2 size={24} color="#ef4444" />
                        </View>
                        <Text style={styles.actionTitle}>Manage Users</Text>
                        <Text style={styles.actionDesc}>View and delete users</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        backgroundColor: '#ffffff',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    subText: {
        fontSize: 16,
        color: '#4b5563',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#6b7280',
        fontFamily: 'monospace'
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40
    },
    placeholderText: {
        color: '#9ca3af',
        fontSize: 16,
        fontStyle: 'italic'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16
    },
    actionCard: {
        backgroundColor: '#fff',
        width: '47%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
        textAlign: 'center'
    },
    actionDesc: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center'
    }
});
