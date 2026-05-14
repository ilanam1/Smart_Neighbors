// screens/PublicProfileScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image, ScrollView, SafeAreaView, TouchableOpacity, Linking, StatusBar } from "react-native";
import { getSupabase } from "../DataBase/supabase";
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Phone, Mail } from "lucide-react-native";

export default function PublicProfileScreen({ navigation, route }) {
    const { authUid } = route.params;
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        navigation.setOptions({ title: 'פרופיל' });
        fetchProfile();
    }, [authUid]);

    const fetchProfile = async () => {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from("profiles")
                .select(`
                    first_name,
                    last_name,
                    email,
                    phone,
                    photo_url,
                    is_house_committee,
                    buildings ( name )
                `)
                .eq("auth_uid", authUid)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>לא נמצא פרופיל.</Text>
            </View>
        );
    }

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'שכן ללא שם';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            {/* Background */}
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%">
                <Defs>
                    <RadialGradient id="topGlow" cx="100%" cy="0%" rx="60%" ry="40%" fx="100%" fy="0%" gradientUnits="userSpaceOnUse">
                        <Stop offset="0" stopColor="#ff0080" stopOpacity="0.15" />
                        <Stop offset="1" stopColor="#000000" stopOpacity="0" />
                    </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGlow)" />
                </Svg>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.avatarContainer}>
                    {profile.photo_url ? (
                        <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitials}>{profile.first_name ? profile.first_name[0] : '👤'}</Text>
                        </View>
                    )}
                    {profile.is_house_committee && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>ועד הבית</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.nameText}>{fullName}</Text>
                {profile.buildings?.name && (
                    <Text style={styles.buildingText}>בניין: {profile.buildings.name}</Text>
                )}

                <View style={styles.infoCard}>
                    <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`mailto:${profile.email}`)}>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>אימייל</Text>
                            <Text style={styles.infoValue}>{profile.email}</Text>
                        </View>
                        <Mail color="#10b981" size={20} />
                    </TouchableOpacity>

                    {profile.phone && (
                        <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${profile.phone}`)}>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>טלפון</Text>
                                <Text style={styles.infoValue}>{profile.phone}</Text>
                            </View>
                            <Phone color="#10b981" size={20} />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    errorText: { color: '#ef4444', fontSize: 16 },
    scrollContent: { padding: 20, alignItems: 'center' },
    avatarContainer: { marginTop: 40, marginBottom: 20, alignItems: 'center', position: 'relative' },
    avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#10b981' },
    avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(148, 163, 184, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#10b981' },
    avatarInitials: { fontSize: 40, color: '#10b981', fontWeight: 'bold' },
    badge: { position: 'absolute', bottom: -10, backgroundColor: '#ff0080', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
    badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    nameText: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', marginBottom: 5 },
    buildingText: { fontSize: 16, color: '#94a3b8', marginBottom: 30 },
    infoCard: { width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.5)' },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(51, 65, 85, 0.5)' },
    infoTextContainer: { flex: 1, alignItems: 'flex-end', marginRight: 15 },
    infoLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
    infoValue: { fontSize: 16, color: '#f8fafc' },
});
