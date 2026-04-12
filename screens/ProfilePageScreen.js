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
  Alert,
  Modal,
  TextInput
} from "react-native";
import { getSupabase } from "../DataBase/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { listMfaFactors, unenrollMfa } from "../API/mfaApi";
import { Eye, EyeOff, Lock } from "lucide-react-native";

// --- Masking Utils ---
const maskEmail = (email) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? name.slice(0, 2) + '*'.repeat(name.length - 2) : name + '**';
    return `${maskedName}@${domain}`;
};
const maskPhone = (phone) => {
    if (!phone) return '';
    return '*'.repeat(Math.max(phone.length - 3, 0)) + phone.slice(-3);
};
const maskId = (id) => {
    if (!id) return '';
    return '*'.repeat(Math.max(id.length - 3, 0)) + id.slice(-3);
};

export default function ProfilePageScreen({ navigation }) {
  const supabase = getSupabase();

  const [profile, setProfile] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [mfaFactor, setMfaFactor] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  // Security Locking
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("User not logged in");
        if (mounted) setCurrentUserEmail(user.email);

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

  const handleUnlockInfo = async () => {
    if (!unlockPassword) return;
    setUnlockLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: currentUserEmail || profile?.email,
        password: unlockPassword,
      });

      if (error) throw error;
      
      setIsUnlocked(true);
      setUnlockModalVisible(false);
      setUnlockPassword("");
    } catch (e) {
      Alert.alert("שגיאה", "סיסמה שגויה. נסה שוב.");
    } finally {
      setUnlockLoading(false);
    }
  };

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
        <Text style={styles.email}>
          {isUnlocked ? profile?.email : maskEmail(profile?.email)}
        </Text>

        {/* ROLE */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {profile?.is_house_committee ? "חבר ועד בית" : "דייר"}
          </Text>
        </View>

        {/* SECTION: PERSONAL INFO */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>פרטים אישיים</Text>
            <TouchableOpacity onPress={() => isUnlocked ? setIsUnlocked(false) : setUnlockModalVisible(true)} style={styles.unlockToggle}>
              {isUnlocked ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#3b82f6" />}
            </TouchableOpacity>
          </View>

          <ProfileRow 
            label="תעודת זהות" 
            value={!profile?.id_number ? "—" : (isUnlocked ? profile.id_number : maskId(profile.id_number))} 
          />
          <ProfileRow 
            label="טלפון" 
            value={!profile?.phone ? "—" : (isUnlocked ? profile.phone : maskPhone(profile.phone))} 
          />
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

      {/* Security Check Modal */}
      <Modal
        visible={unlockModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUnlockModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Lock size={24} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>אימות אבטחה</Text>
            </View>
            <Text style={styles.modalSubtitle}>הזן את סיסמת החשבון שלך כדי לחשוף את הפרטים הרגישים.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="סיסמה"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={unlockPassword}
              onChangeText={setUnlockPassword}
              textAlign="right"
              autoFocus
            />

            {unlockLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => { setUnlockModalVisible(false); setUnlockPassword(''); }}>
                  <Text style={styles.modalBtnCancelText}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSubmit]} onPress={handleUnlockInfo}>
                  <Text style={styles.modalBtnSubmitText}>אמת וחשוף</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

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

  /* ---------- MODAL & UNLOCK STYLES ---------- */
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unlockToggle: {
    padding: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
    textAlign: 'right',
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 20,
    height: 50,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnSubmit: {
    backgroundColor: '#3b82f6',
  },
  modalBtnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  modalBtnSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalBtnCancelText: {
    color: '#ef4444',
    fontWeight: 'bold',
  }
});
