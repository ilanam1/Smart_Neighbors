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
  TouchableOpacity,
  Alert
} from "react-native";
import { getSupabase } from "../DataBase/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { listMfaFactors, unenrollMfa } from "../API/mfaApi";

export default function ProfilePageScreen({ navigation }) {
  const supabase = getSupabase();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [mfaFactor, setMfaFactor] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);

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
            `
            first_name,
            last_name,
            email,
            phone,
            address,
            zip_code,
            date_of_birth,
            id_number,
            photo_url,
            is_house_committee,
            committee_payment_link
          `
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

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      async function checkMfa() {
        try {
          const res = await listMfaFactors();
          if (mounted && res && res.totp && res.totp.length > 0) {
            // Find the active verified factor
            const verifiedFactory = res.totp.find(f => f.status === 'verified');
            setMfaFactor(verifiedFactory || null);
          } else {
            if (mounted) setMfaFactor(null);
          }
        } catch (e) {
          console.log("Error loading MFA factors", e);
        }
      }
      checkMfa();
      return () => { mounted = false; };
    }, [])
  );

  const handleDisableMfa = () => {
    Alert.alert("ביטול 2FA", "האם אתה בטוח שברצונך לבטל את האימות הדו-שלבי?", [
      { text: "ביטול", style: "cancel" },
      { 
        text: "כן, בטל", 
        style: "destructive", 
        onPress: async () => {
          try {
            setMfaLoading(true);
            await unenrollMfa(mfaFactor.id);
            setMfaFactor(null);
            Alert.alert("בוצע", "האימות הדו-שלבי בוטל בהצלחה.");
          } catch (e) {
            Alert.alert("שגיאה", "לא הצלחנו לבטל את ה-2FA: " + e.message);
          } finally {
            setMfaLoading(false);
          }
        }
      }
    ]);
  };

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
            <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
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

        {/* SECTION: PERSONAL INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטים אישיים</Text>

          <ProfileRow label="תעודת זהות" value={profile?.id_number || "—"} />
          <ProfileRow label="טלפון" value={profile?.phone || "—"} />
          <ProfileRow
            label="תאריך לידה"
            value={profile?.date_of_birth ? profile.date_of_birth.split('-').reverse().join('/') : "—"}
          />
        </View>

        {/* SECTION: ADDRESS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>כתובת</Text>

          <ProfileRow label="כתובת" value={profile?.address || "—"} />
          <ProfileRow label="מיקוד" value={profile?.zip_code || "—"} />
        </View>

        {/* SECTION: SECURITY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>אבטחה</Text>

          <TouchableOpacity
            style={styles.securityRow}
            onPress={() => navigation.navigate("VerifyEmail")}
          >
            <Text style={styles.securityRowText}>שינוי סיסמה</Text>
            <Text style={styles.securityRowArrow}>{"<"}</Text>
          </TouchableOpacity>
          
          {mfaFactor ? (
            <TouchableOpacity
              style={styles.securityRow}
              onPress={handleDisableMfa}
              disabled={mfaLoading}
            >
              <Text style={[styles.securityRowText, { color: '#ef4444' }]}>ביטול אימות דו-שלבי (2FA)</Text>
              {mfaLoading ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={styles.securityRowArrow}>{"<"}</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.securityRow}
              onPress={() => navigation.navigate("MfaSetupScreen")}
            >
              <Text style={[styles.securityRowText, { color: '#10b981' }]}>הגדר אימות דו-שלבי (2FA)</Text>
              <Text style={styles.securityRowArrow}>{"<"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SECTION: COMMITTEE */}
        {profile?.is_house_committee && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ועד הבית</Text>

            <ProfileRow
              label="קישור תשלום"
              value={profile?.committee_payment_link || "לא הוגדר"}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- SMALL COMPONENT ---------- */
function ProfileRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  /* ---------- SCREEN ---------- */
  screen: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#0F172A", // dark background
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---------- AVATAR ---------- */
  avatarContainer: {
    alignItems: "center",
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
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: "700",
    color: "#e5e7eb",
  },

  /* ---------- HEADER TEXT ---------- */
  name: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    color: "#f9fafb",
  },
  email: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },

  /* ---------- BADGE ---------- */
  badge: {
    alignSelf: "center",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1e40af",
  },
  badgeText: {
    color: "#bfdbfe",
    fontWeight: "600",
  },

  /* ---------- SECTIONS ---------- */
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#f9fafb",
    textAlign: "right",
  },

  /* ---------- PROFILE ROWS ---------- */
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  rowLabel: {
    color: "#9ca3af",
    fontWeight: "500",
    textAlign: "right",
  },
  rowValue: {
    color: "#f9fafb",
    maxWidth: "60%",
    textAlign: "left",
  },

  /* ---------- SECURITY ROW ---------- */
  securityRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    marginTop: 4,
  },
  securityRowText: {
    color: "#9ca3af",
    fontWeight: "500",
  },
  securityRowArrow: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "700",
  },

  /* ---------- GRID (HOME STYLE) ---------- */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
  },

  card: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 120,
    justifyContent: "space-between",
  },

  cardTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  cardSubtitle: {
    color: "#e5e7eb",
    fontSize: 13,
    marginTop: 4,
  },
});
