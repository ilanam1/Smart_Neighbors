// screens/ProfilePageScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { getSupabase } from "../DataBase/supabase";

export default function ProfilePageScreen({ route }) {
  const supabase = getSupabase();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("User not logged in");

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "first_name, last_name, email, photo_url, is_house_committee"
          )
          .eq("auth_uid", user.id)
          .maybeSingle();

        if (error) throw error;
        if (mounted) setProfile(data);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => (mounted = false);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.screen}>
        {/* AVATAR */}
        <View style={styles.avatarContainer}>
          {profile?.photo_url ? (
            <Image
              source={{ uri: profile.photo_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {profile?.first_name?.[0] || "?"}
              </Text>
            </View>
          )}
        </View>

        {/* NAME */}
        <Text style={styles.name}>
          {profile?.first_name} {profile?.last_name}
        </Text>

        {/* EMAIL */}
        <Text style={styles.email}>{profile?.email}</Text>

        {/* ROLE */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {profile?.is_house_committee ? "חבר ועד בית" : "דייר"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: "700",
    color: "#374151",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 8,
  },
  email: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  badge: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#e0e7ff",
  },
  badgeText: {
    color: "#3730a3",
    fontWeight: "600",
  },
});
