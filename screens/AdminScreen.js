import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { LogOut, ShieldCheck, PlusCircle, Building2, LayoutDashboard, Users, Briefcase } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

export default function AdminScreen({ user, onSignOut, navigation }) {

    const handleLogout = () => {
        Alert.alert(
            "התנתקות",
            "האם אתה בטוח שברצונך להתנתק מהמערכת?",
            [
                { text: "ביטול", style: "cancel" },
                { text: "התנתק", onPress: onSignOut, style: 'destructive' }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.8}>
                        <LogOut size={20} color="#fb7185" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleRow}>
                        <Text style={styles.headerTitle}>לוח בקרת מנהל</Text>
                        <LayoutDashboard size={20} color="#22d3ee" style={{marginLeft: 8}} />
                    </View>
                </View>

                {/* Welcome Card */}
                <View style={styles.cardWrapper}>
                    <LinearGradient
                        colors={['#0c1f38', '#0a1b31']}
                        start={{ x: 1, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.profileCard}
                    >
                        {/* Fake Blur glow via absolute View */}
                        <View style={styles.blurGlow} />
                        
                        <View style={styles.profileInfo}>
                            <Text style={styles.welcomeText}>
                                ברוך הבא, <Text style={styles.welcomeName}>{user?.full_name || 'מנהל'}</Text>
                            </Text>
                            <Text style={styles.subText}>אתה מחובר כרגע כמנהל מערכת ראשי</Text>
                            
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badgeId}>{user?.admin_number}</Text>
                                <Text style={styles.badgeLabel}>מספר מנהל:</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Section Title */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>פעולות ניהול מערכת</Text>
                </View>

                {/* Actions Grid */}
                <View style={styles.grid}>
                    {/* הבניינים שלנו */}
                    <TouchableOpacity
                        style={styles.actionCardHalf}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('AdminBuildings', { adminUser: user })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <Building2 size={28} color="#f59e0b" />
                        </View>
                        <Text style={styles.actionTitle}>הבניינים שלנו</Text>
                        <Text style={styles.actionDesc}>צפייה ומחיקת בניינים</Text>
                    </TouchableOpacity>

                    {/* אישור ועדי בית */}
                    <TouchableOpacity
                        style={styles.actionCardHalf}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('AdminPendingCommittees', { adminUser: user })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                            <ShieldCheck size={28} color="#06b6d4" />
                        </View>
                        <Text style={styles.actionTitle}>אישור ועדי בית</Text>
                        <Text style={styles.actionDesc}>אשר נציגי בניין חדשים</Text>
                    </TouchableOpacity>

                    {/* ניהול משתמשים - Half Width now */}
                    <TouchableOpacity
                        style={styles.actionCardHalf}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('DeleteUsers', { adminUser: user })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                            <Users size={28} color="#f43f5e" />
                        </View>
                        <Text style={styles.actionTitle}>ניהול משתמשים</Text>
                        <Text style={styles.actionDesc}>צפייה ומחיקת משתמשים</Text>
                    </TouchableOpacity>

                    {/* חברות שירות - Half Width */}
                    <TouchableOpacity
                        style={styles.actionCardHalf}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('AdminServiceCompanies', { adminUser: user })}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                            <Briefcase size={28} color="#06b6d4" />
                        </View>
                        <Text style={styles.actionTitle}>חברות שירות</Text>
                        <Text style={styles.actionDesc}>מאגר ספקי שירות</Text>
                    </TouchableOpacity>
                </View>

                {/* Add Building CTA */}
                <TouchableOpacity
                    style={styles.addBuildingBtn}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('AdminAddBuilding', { adminUser: user })}
                >
                    <View style={styles.addBuildingContent}>
                        <View style={styles.textContainerReverse}>
                            <Text style={styles.addBuildingTitle}>הוספת בניין לשירות</Text>
                            <Text style={styles.addBuildingSubtitle}>הקמת בניין חדש במאגר המערכת</Text>
                        </View>
                        <View style={styles.addBuildingIconWrapper}>
                            <PlusCircle size={28} color="#34d399" />
                        </View>
                    </View>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#051121',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 65,
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    logoutButton: {
        padding: 10,
        backgroundColor: '#1a2b41',
        borderRadius: 14,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    cardWrapper: {
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    profileCard: {
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.4)',
        position: 'relative',
        overflow: 'hidden',
    },
    blurGlow: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        // Note: Real blur is hard without @react-native-community/blur so we use a translucent circle
    },
    profileInfo: {
        alignItems: 'center',
        zIndex: 10,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: '900',
        color: '#ffffff',
        marginBottom: 6,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    welcomeName: {
        color: '#22d3ee',
    },
    subText: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 16,
        textAlign: 'center',
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        gap: 6,
    },
    badgeLabel: {
        fontSize: 13,
        color: '#64748b',
    },
    badgeId: {
        fontSize: 14,
        color: '#67e8f9',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#e2e8f0',
        paddingRight: 8,
    },
    grid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    actionCardHalf: {
        backgroundColor: '#0c1f38',
        width: '48%',
        paddingVertical: 26,
        paddingHorizontal: 12,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.3)',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    actionCardFullSpan: {
        backgroundColor: '#0c1f38',
        width: '100%',
        paddingVertical: 26,
        paddingHorizontal: 12,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.3)',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
        marginTop: 4,
    },
    iconCircle: {
        padding: 14,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 2,
        textAlign: 'center',
    },
    actionDesc: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
    },
    addBuildingBtn: {
        backgroundColor: '#0c1f38',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        padding: 20,
        shadowColor: '#10b981',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    addBuildingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    textContainerReverse: {
        alignItems: 'flex-end',
        marginRight: 16,
        flex: 1,
    },
    addBuildingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34d399',
        marginBottom: 2,
    },
    addBuildingSubtitle: {
        fontSize: 13,
        color: '#94a3b8',
    },
    addBuildingIconWrapper: {
        padding: 14,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 20,
    }
});
