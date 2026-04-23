import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { getOpenRequests } from "../API/requestsApi";
import { getBuildingDisturbanceReports } from "../API/disturbancesApi";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  MessageSquarePlus,
  AlertTriangle,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  User,
  Zap,
  LayoutDashboard,
  FileText,
  Package,
  Inbox,
  MessageCircle
} from 'lucide-react-native';
import { getSupabase } from "../DataBase/supabase";
import { getRecentBuildingUpdates } from "../API/buildingUpdatesApi";
import NotificationsModal from '../components/NotificationsModal';
import { getMyNotifications } from '../API/notificationsApi';
const { width } = Dimensions.get('window');
const SPACING = 16;
const RADIUS = 24;
export default function HomeScreen({ navigation, user }) {
  // ===== STATE =====
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updatesError, setUpdatesError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isCommittee, setIsCommittee] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [requestsCount, setRequestsCount] = useState(0);
  const [disturbancesCount, setDisturbancesCount] = useState(0);

  const supabase = getSupabase();



  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }

  // ===== LOAD BUILDING UPDATES =====
  useEffect(() => {
    let mounted = true;
    async function loadUpdates() {
      try {
        setLoadingUpdates(true);
        const data = await getRecentBuildingUpdates(20);
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

  // ===== LOAD USER PROFILE =====
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    async function loadProfile() {
      try {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, photo_url, is_house_committee, committee_payment_link, building_id")          .eq("auth_uid", user.id)
          .maybeSingle();

        if (error) throw error;
        if (mounted) {
          setProfile(data);
          const isC = !!data?.is_house_committee;
          setIsCommittee(isC);
          if (isC && !data?.committee_payment_link) {
            navigation.navigate("CommitteePaymentSetup");
          }
        }
      } catch (e) {
        console.error(e.message);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }
    
    async function loadNotifications() {
        try {
            const notifs = await getMyNotifications(user.id);
            if (mounted) {
               setUnreadCount(notifs.filter(n => !n.is_read).length);
            }
        } catch (e) {}
    }

    loadProfile();
    loadNotifications();
    return () => (mounted = false);
  }, [user?.id]);

  const handleCloseNotifications = async () => {
      setShowNotifications(false);
      try {
          const notifs = await getMyNotifications(user.id);
          setUnreadCount(notifs.filter(n => !n.is_read).length);
      } catch (e) {}
  };

  // ===== LOAD COMMITTEE STATS =====
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      async function loadCommitteeStats() {
        if (!isCommittee || !profile?.building_id) return;
        try {
          const [reqs, dists] = await Promise.all([
            getOpenRequests(),
            getBuildingDisturbanceReports()
          ]);
          if (mounted) {
            setRequestsCount(reqs?.length || 0);
            setDisturbancesCount((dists || []).filter(d => d.status !== 'RESOLVED' && d.status !== 'REJECTED').length);
          }
        } catch (e) {
          console.log("Error loading stats:", e);
        }
      }
      loadCommitteeStats();
      return () => { mounted = false; };
    }, [isCommittee, profile?.building_id])
  );

  // ===== TICKER LOGIC =====
  useEffect(() => {
    if (!updates.length) return;
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % updates.length);
    }, 5000);
    return () => clearInterval(id);
  }, [updates]);

  const currentUpdate = updates.length ? updates[currentIndex] : null;

  function getInitials() {
    const first = profile?.first_name || "";
    const last = profile?.last_name || "";
    if (first || last) return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
    return (profile?.email || user?.email || "U").charAt(0).toUpperCase();
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Decor (Simulated) */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => navigation.navigate("ProfilePageScreen")}
            >
              {profileLoading ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : profile?.photo_url ? (
                <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarText}>{getInitials()}</Text>
              )}
            </TouchableOpacity>
            <View style={styles.userTextWrapper}>
              <Text style={styles.welcomeText}>שלום, {profile?.first_name || "שכן/ה"} 👋</Text>

            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotifications(true)}>
              <View>
                  <Bell size={20} color="#94a3b8" />
                  {unreadCount > 0 && (
                      <View style={{
                          position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', 
                          borderRadius: 6, minWidth: 12, height: 12, alignItems: 'center', justifyContent: 'center'
                      }}>
                          <Text style={{color: 'white', fontSize: 8, fontWeight: 'bold', paddingHorizontal: 2}}>{unreadCount}</Text>
                      </View>
                  )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.logoutBtn]} onPress={handleSignOut}>
              <LogOut size={20} color="#fb7185" />
            </TouchableOpacity>
          </View>
        </View>

        {/* HERO UPDATES CARD */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => navigation.navigate("BuildingUpdates")}
          activeOpacity={0.9}
        >
          <View style={styles.heroTagRow}>
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>לוח מודעות</Text>
            </View>
            <Text style={styles.heroTimeText}>חדש</Text>
          </View>

          {loadingUpdates ? (
            <ActivityIndicator color="white" style={{ marginVertical: 10 }} />
          ) : !currentUpdate ? (
            <Text style={styles.heroTitle}>אין עדכונים חדשים</Text>
          ) : (
            <>
              <Text style={styles.heroTitle}>
                {currentUpdate.title} {currentUpdate.is_important ? "🚨" : ""}
              </Text>
              <Text style={styles.heroBody} numberOfLines={2}>
                {currentUpdate.body}
              </Text>
            </>
          )}

          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>לכל העדכונים</Text>
            <ArrowUpRight size={14} color="white" />
          </View>

          <Bell style={styles.heroBgIcon} size={100} color="rgba(255,255,255,0.1)" />
        </TouchableOpacity>

        {/* BENTO GRID */}
        <View style={styles.grid}>
          {/* Create Request - Full Width */}
          <TouchableOpacity
            style={styles.fullBox}
            onPress={() => navigation.navigate("CreateRequest")}
          >
            <View style={styles.boxRow}>
              <View style={[styles.boxIconContainer, { backgroundColor: '#10b981' }]}>
                <MessageSquarePlus size={24} color="#0f172a" />
              </View>
              <View style={styles.boxTextContent}>
                <Text style={styles.boxTitle}>יצירת בקשה חדשה</Text>
                <Text style={styles.boxSub}>דיווח על תיקון או תחזוקה</Text>
              </View>
              <Plus size={20} color="#10b981" />
            </View>
          </TouchableOpacity>




          <TouchableOpacity
            style={styles.fullBox}
            onPress={() =>
              navigation.navigate("EquipmentCategories", {
                user,
                buildingId: profile?.building_id,
              })
            }
          >
            <View style={styles.boxRow}>
              <View style={[styles.boxIconContainer, { backgroundColor: "rgba(245, 158, 11, 0.15)", borderColor: "rgba(245, 158, 11, 0.25)" }]}>
                <Package size={24} color="#f59e0b" />
              </View>

              <View style={styles.boxTextContent}>
                <Text style={styles.boxTitle}>השאלת ציוד</Text>
                <Text style={styles.boxSub}>השאלת או הצעת ציוד לשכנים בבניין</Text>
              </View>

              <ChevronLeft size={20} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Messages / Chat - Full Width */}
          <TouchableOpacity
            style={styles.fullBox}
            onPress={() => 
                navigation.navigate("ChatList", { user: { ...user, building_id: profile?.building_id } })
            }
          >
            <View style={styles.boxRow}>
              <View style={[styles.boxIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.25)' }]}>
                <MessageCircle size={24} color="#8b5cf6" />
              </View>

              <View style={styles.boxTextContent}>
                <Text style={styles.boxTitle}>הודעות בניין ושיחות פרטיות</Text>
                <Text style={styles.boxSub}>שליחת הודעות לשכנים ולקבוצת הבניין</Text>
              </View>

              <ChevronLeft size={20} color="#64748b" />
            </View>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.fullBox}
            onPress={() =>
              navigation.navigate("IncomingLoanRequests", {
                user,
                buildingId: profile?.building_id,
              })
            }
          >
            <View style={styles.boxRow}>
              <View
                style={[
                  styles.boxIconContainer,
                  {
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    borderColor: "rgba(59, 130, 246, 0.25)",
                  },
                ]}
              >
                <Inbox size={24} color="#60a5fa" />
              </View>

              <View style={styles.boxTextContent}>
                <Text style={styles.boxTitle}>בקשות השאלה שקיבלתי</Text>
                <Text style={styles.boxSub}>אישור או דחייה של בקשות על הציוד שלך</Text>
              </View>

              <ChevronLeft size={20} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Square Boxes Row */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.squareBox, { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: 'rgba(37, 99, 235, 0.3)' }]}
              onPress={() => navigation.navigate("PayFees")}
            >
              <View style={[styles.squareIcon, { backgroundColor: '#2563eb' }]}>
                <CreditCard size={20} color="white" />
              </View>
              <View>
                <Text style={styles.boxTitle}>תשלומים</Text>
                <Text style={styles.boxSubSmall}>מיסי ועד וחשבונות</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.squareBox, { backgroundColor: 'rgba(225, 29, 72, 0.15)', borderColor: 'rgba(225, 29, 72, 0.3)' }]}
              onPress={() => navigation.navigate("ReportDisturbance")}
            >
              <View style={[styles.squareIcon, { backgroundColor: '#e11d48' }]}>
                <AlertTriangle size={20} color="white" />
              </View>
              <View>
                <Text style={styles.boxTitle}>דיווח מטרד</Text>
                <Text style={styles.boxSubSmall}>רעש, חניה או הפרעה</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Neighbors Feed - Full Width */}
          <TouchableOpacity
            style={styles.fullBox}
            onPress={() => navigation.navigate("PublicRequests")}
          >
            <View style={styles.boxRow}>
              <View style={styles.avatarOverlap}>
                <View style={styles.miniAvatar}><User size={12} color="#94a3b8" /></View>
                <View style={[styles.miniAvatar, { right: -10 }]}><User size={12} color="#94a3b8" /></View>
              </View>
              <View style={[styles.boxTextContent, { marginRight: 20 }]}>
                <Text style={styles.boxTitle}>הלוח הציבורי</Text>
                <Text style={styles.boxSub}>מה השכנים מבקשים כרגע</Text>
              </View>
              <ChevronLeft size={20} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* כרטיס מסמכי בניין - גישה לכל הדיירים */}
          <TouchableOpacity
            style={styles.fullBox}
            onPress={() =>
              navigation.navigate("BuildingDocuments", {
                user,
                isCommittee,
                buildingId: profile?.building_id,   // חשוב! אותו בניין של המשתמש
              })
            }
          >
            <View style={styles.boxRow}>
              <View style={styles.boxIconContainer}>
                <FileText size={24} color="#e5e7eb" />
              </View>
              <View style={styles.boxTextContent}>
                <Text style={styles.boxTitle}>מסמכי בניין</Text>
                <Text style={styles.boxSub}>צפייה בתקנון ומסמכים רשמיים</Text>
              </View>
            </View>
          </TouchableOpacity>



          <TouchableOpacity
            style={styles.fullBox}
            onPress={() => navigation.navigate("BuildingCalendar")}
          >
            <View style={styles.boxRow}>
              <View
                style={[
                  styles.boxIconContainer,
                  {
                    backgroundColor: "rgba(37, 99, 235, 0.15)",
                    borderColor: "rgba(37, 99, 235, 0.25)",
                  },
                ]}
              >
                <Text style={{ fontSize: 22 }}>📅</Text>
              </View>

              <View style={styles.boxTextContent}>
                <Text style={styles.boxTitle}>לוח אירועי הבניין</Text>
                <Text style={styles.boxSub}>צפייה באירועים ובביקורות הקרובות</Text>
              </View>

              <ChevronLeft size={20} color="#64748b" />
            </View>
          </TouchableOpacity>



          {!isCommittee && (
            <TouchableOpacity
              style={styles.fullBox}
              onPress={() =>
                navigation.navigate("BuildingRules", {
                  user,
                  isCommittee,
                })
              }
            >
              <View style={styles.boxRow}>
                <View style={[styles.boxIconContainer, { backgroundColor: "#38bdf8" }]}>
                  <FileText size={24} color="#0f172a" />
                </View>

                <View style={styles.boxTextContent}>
                  <Text style={styles.boxTitle}>חוקי ונהלי הבניין</Text>
                  <Text style={styles.boxSub}>צפייה בנהלים של ועד הבית</Text>
                </View>

                <ChevronLeft size={20} color="#64748b" />
              </View>
            </TouchableOpacity>
          )}


        </View>

        {/* COMMITTEE SECTION */}
        {isCommittee && (
          <View style={styles.committeeContainer}>
            <View style={styles.committeeHeader}>
              <View style={styles.committeeIconBg}>
                <ShieldCheck size={18} color="#10b981" />
              </View>
              <Text style={styles.committeeTitle}>ניהול ועד הבית</Text>
            </View>

            <TouchableOpacity
              style={styles.committeeMainBtn}
              onPress={() => navigation.navigate("BuildingUpdates", { isCommittee: true })}
            >
              <Text style={styles.committeeMainBtnText}>ניהול ויצירת עדכוני בניין</Text>
              <Zap size={16} color="#0f172a" />
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.committeeSubBtn}
              onPress={() => navigation.navigate("CommitteeRequests")}
            >
              <Text style={styles.committeeStatNum}>{requestsCount}</Text>
              <Text style={styles.committeeStatLabel}>בקשות דיירים</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.committeeSubBtn, { marginTop: 12 }]}
              onPress={() => navigation.navigate("CommitteeDisturbances")}
            >
              <Text style={[styles.committeeStatNum, { color: '#fb7185' }]}>{disturbancesCount}</Text>
              <Text style={styles.committeeStatLabel}>דיווחי מטרדים</Text>
            </TouchableOpacity>





            <TouchableOpacity
              style={[styles.committeeMainBtn, { marginTop: 12 }]}
              onPress={() =>
                navigation.navigate("BuildingRules", {
                  user,
                  isCommittee,
                })
              }
            >
              <Text style={styles.committeeMainBtnText}>עריכת נהלים וחוקי שימוש</Text>
              <FileText size={16} color="#0f172a" />
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.committeeMainBtn}
              onPress={() =>
                navigation.navigate("CommitteeProviders", {
                  user,
                  isCommittee,
                })
              }
            >
              <Text style={styles.committeeMainBtnText}>בחירת ספקים</Text>
              <FileText size={16} color="#0f172a" />
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.forecastButton}
              onPress={() => navigation.navigate("CommitteeWeeklyForecast")}
            >
              <Text style={styles.forecastButtonText}>
                📊 תחזית תקלות שבועית
              </Text>
            </TouchableOpacity>



            <TouchableOpacity
              style={styles.forecastButton}
              onPress={() => navigation.navigate("CommitteeInsights")}
            >
              <Text style={styles.forecastButtonText}>
                📊 סטטיסטיקות ניהול הבניין
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.forecastButton}
              onPress={() => navigation.navigate("CommitteeInspections")}
            >
              <Text style={styles.forecastButtonText}>
                🛡️ ביקורות תקופתיות
              </Text>
            </TouchableOpacity>




            <TouchableOpacity
              style={styles.forecastButton}
              onPress={() => navigation.navigate("CommitteeMonthlyFee")}
            >
              <Text style={styles.forecastButtonText}>
                💰 ניהול סכום חודשי
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forecastButton}
              onPress={() => navigation.navigate("CommitteePaymentsManagement")}
            >
              <Text style={styles.forecastButtonText}>
                🧾 ניהול תשלומי ועד
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.forecastButton, { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
              onPress={() => navigation.navigate("CommitteePendingUsers", { buildingId: profile.building_id })}
            >
              <Text style={[styles.forecastButtonText, { color: '#f59e0b' }]}>
                ⏳ דיירים ממתינים לאישור
              </Text>
            </TouchableOpacity>



          </View>

        )}
      </ScrollView>

      <NotificationsModal 
          visible={showNotifications} 
          onClose={handleCloseNotifications} 
          userId={user?.id} 
          navigation={navigation} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    paddingHorizontal: SPACING,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 12) + 12 : 12,
    paddingBottom: 28,
  },
  bgGlowTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    zIndex: 0,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    zIndex: 0,
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING,
  },
  userInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  userTextWrapper: {
    alignItems: 'flex-end',
  },
  welcomeText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    borderColor: 'rgba(251, 113, 133, 0.2)',
  },
  heroCard: {
    backgroundColor: '#059669', // Emerald 600
    borderRadius: RADIUS,
    padding: SPACING,
    marginBottom: SPACING,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#064e3b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  heroTagRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  heroTimeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },
  heroTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 8,
  },
  heroBody: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 20,
  },
  heroFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  heroFooterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroBgIcon: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    transform: [{ rotate: '15deg' }],
  },
  grid: {
    gap: 16,
  },
  fullBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: RADIUS,
    padding: SPACING,
  },
  boxRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boxIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.12)', // חדש
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',     // חדש
  },
  boxTextContent: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 16,
  },
  boxTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  boxSub: {
    color: '#94a3b8',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 16,
  },
  squareBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS,
    padding: SPACING,
    borderWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  squareIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxSubSmall: {
    color: 'rgba(248, 250, 252, 0.5)',
    fontSize: 10,
    textAlign: 'right',
  },
  avatarOverlap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  committeeContainer: {
    marginTop: SPACING,
    padding: SPACING,
    backgroundColor: 'rgba(30, 41, 59, 0.35)',   // יותר כמו שאר הכרטיסים
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  committeeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  committeeIconBg: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  committeeTitle: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '800',
  },
  committeeMainBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  committeeMainBtnText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 14,
  },
  committeeSubBtn: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  committeeStatNum: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 'bold',
  },
  committeeStatLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  footerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  footerText: {
    color: '#64748b',
    fontSize: 10,
  },


  forecastButton: {
  backgroundColor: "#1e3a8a",
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 12,
  marginHorizontal: 16,
  marginTop: 12,
  alignItems: "center",
  justifyContent: "center",
},

forecastButtonText: {
  color: "#f8fafc",
  fontSize: 16,
  fontWeight: "800",
},

});