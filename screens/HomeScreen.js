// screens/HomeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { getSupabase } from "../DataBase/supabase";
import { getRecentBuildingUpdates } from "../buildingUpdatesApi";

export default function HomeScreen({ navigation, user }) {
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updatesError, setUpdatesError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [isCommittee, setIsCommittee] = useState(false);

  const supabase = getSupabase();

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }
/*
  // ===== LOAD BUILDING UPDATES =====
  useEffect(() => {
    let mounted = true;

    async function loadUpdates() {
      try {
        setLoadingUpdates(true);
        const data = await getWeeklyBuildingUpdates();
        if (mounted) {
          setUpdates(data);
          setCurrentIndex(0);
        }
      } catch (err) {
        if (mounted) setUpdatesError(err.message);
      } finally {
        if (mounted) setLoadingUpdates(false);
      }
    }

    loadUpdates();
    return () => (mounted = false);
  }, []);


*/


  // ===== LOAD USER PROFILE =====
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    async function loadProfile() {
      try {
        setProfileLoading(true);

        const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, photo_url, is_house_committee,committee_payment_link")
        .eq("auth_uid", user.id)
        .maybeSingle();

        if (error) throw error;

        if (mounted) {
          setProfile(data);
          const isC = !!data?.is_house_committee;
          setIsCommittee(isC);

          // אם הוא ועד בית ואין לו עדיין קישור – נשלח אותו למסך ההגדרה
          if (isC && !data?.committee_payment_link) {
            navigation.navigate('CommitteePaymentSetup');
          }
        }
          
      } catch (e) {
        if (mounted) setProfileError(e.message);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => (mounted = false);
  }, [user?.id]);

  // ===== INITIALS HELPER =====
  function getInitials() {
    const first = profile?.first_name || "";
    const last = profile?.last_name || "";
    if (first || last) return `${first[0] || ""}${last[0] || ""}`.toUpperCase();

    const email = profile?.email || user?.email || "";
    return email.charAt(0).toUpperCase();
  }

  // ===== ROTATING TICKER =====
  useEffect(() => {
    if (!updates.length) return;

    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % updates.length);
    }, 4000);

    return () => clearInterval(id);
  }, [updates]);

  const currentUpdate = updates.length ? updates[currentIndex] : null;

  function shortenText(text) {
    if (!text) return "";
    return text.length > 90 ? text.slice(0, 90) + "..." : text;
  }

  // ===== RENDER =====
  return (
    <View style={styles.screen}>
      
      {/* HEADER WITH AVATAR */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appTitle}>Smart Neighbors</Text>
          <Text style={styles.welcomeText}>
            שלום {profile?.first_name || user?.email || "שכן/ה"} 👋
          </Text>
        </View>

        <TouchableOpacity style={styles.avatarWrapper}>
          {profileLoading ? (
            <ActivityIndicator size="small" />
          ) : profile?.photo_url ? (
            <Image
              source={{ uri: profile.photo_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

{/* 
      <View style={styles.tickerContainer}>
        <Text style={styles.tickerLabel}>עדכוני הבניין:</Text>

        {loadingUpdates ? (
          <ActivityIndicator size="small" color="#4f46e5" />
        ) : updatesError ? (
          <Text style={styles.tickerError}>{updatesError}</Text>
        ) : !currentUpdate ? (
          <Text style={styles.tickerEmpty}>כרגע אין עדכונים.</Text>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate("BuildingUpdates")}
            activeOpacity={0.8}
          >
            <Text style={styles.tickerTitle}>
              {currentUpdate.title}
              {currentUpdate.is_important ? " ⚠️" : ""}
            </Text>
            <Text style={styles.tickerBody}>
              {shortenText(currentUpdate.body)}
            </Text>
            <Text style={styles.tickerHint}>הקשה לפתיחת כל העדכונים</Text>
          </TouchableOpacity>
        )}
      </View>
*/}
      {/* MAIN BUTTONS */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.featureButton}
          onPress={() => navigation.navigate("CreateRequest")}
        >
          <Text style={styles.featureText}>יצירת בקשה חדשה</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureButton}
          onPress={() => navigation.navigate("ReportDisturbance")}
        >
          <Text style={styles.featureText}>דיווח על מטרד/רעש</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureButton}
          onPress={() => navigation.navigate("PayFees")}
        >
          <Text style={styles.featureText}>תשלום מיסי ועד</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureButtonSecondary}
          onPress={() => navigation.navigate("BuildingUpdates")}
        >
          <Text style={styles.featureTextSecondary}>
            סיכום שבועי / כל העדכונים
          </Text>
        </TouchableOpacity>



          <TouchableOpacity
            style={styles.featureButtonSecondary}
            onPress={() => navigation.navigate("PublicRequests")}
          >
            <Text style={styles.featureTextSecondary}>
              צפייה בבקשות מהשכנים
            </Text>
          </TouchableOpacity>
      </View>

      {/* אזור מיוחד לוועד הבית */}
      {isCommittee && (
        <View style={styles.committeeSection}>
          <Text style={styles.committeeTitle}>אזור ועד הבית</Text>

          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => navigation.navigate("CommitteeRequests")}
          >
            <Text style={styles.featureText}>צפייה בכל בקשות הדיירים</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => navigation.navigate("CommitteeDisturbances")}
          >
            <Text style={styles.featureText}>צפייה בכל דיווחי המטרדים</Text>
          </TouchableOpacity>

         <TouchableOpacity
            style={styles.featureButtonSecondary}
            onPress={() => navigation.navigate("BuildingUpdates", { isCommittee: true })}
          >
            <Text style={styles.featureTextSecondary}>
              ניהול ויצירת עדכוני בניין
            </Text>
          </TouchableOpacity>
        </View>
      )}


      {/* LOGOUT BUTTON */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutText}>התנתקות</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
    paddingTop: 60,
  },

  /* HEADER + AVATAR */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },

  welcomeText: {
    fontSize: 16,
    color: "#374151",
    marginTop: 4,
  },

  avatarWrapper: { padding: 4 },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontWeight: "700",
    color: "#374151",
  },

  /* TICKER */
  tickerContainer: {
    backgroundColor: "#e0e7ff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  tickerLabel: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#1e3a8a",
    fontSize: 15,
  },
  tickerTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  tickerBody: {
    fontSize: 14,
    color: "#374151",
    marginTop: 2,
  },
  tickerHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
  },
  tickerEmpty: { color: "#6b7280" },
  tickerError: { color: "red" },

  /* MAIN BUTTONS */
  buttonsRow: {
    marginTop: 10,
    gap: 14,
  },
  featureButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  featureText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  featureButtonSecondary: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  featureTextSecondary: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16,
  },

  /* LOGOUT BUTTON */
  logoutButton: {
    marginTop: 30,
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },


  committeeSection: {
  marginTop: 24,
  padding: 16,
  borderRadius: 10,
  backgroundColor: '#fff7ed',
  borderWidth: 1,
  borderColor: '#fed7aa',
  gap: 10,
},
committeeTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#c2410c',
  marginBottom: 8,
},

});
