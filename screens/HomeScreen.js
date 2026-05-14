import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { getOpenRequests } from "../API/requestsApi";
import { getBuildingDisturbanceReports } from "../API/disturbancesApi";
import { getBuildingWallet, getBuildingMonthlySummary } from "../API/paymentsApi";
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
  LayoutAnimation,
  UIManager,
} from "react-native";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  MessageSquarePlus,
  AlertTriangle,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  User,
  Zap,
  LayoutDashboard,
  FileText,
  Package,
  Inbox,
  MessageCircle,
  ClipboardList,
  BarChart2,
  Shield,
  DollarSign,
  Receipt,
  Clock,
  Wrench,
  Users,
  Calendar,
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
  const [walletTotal, setWalletTotal] = useState(null);
  const [monthPaidCount, setMonthPaidCount] = useState(null);
  const [committeeExpanded, setCommitteeExpanded] = useState(false);
  const [equipmentExpanded, setEquipmentExpanded] = useState(false);
  const [communityExpanded, setCommunityExpanded] = useState(false);

  const supabase = getSupabase();



  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }

  function toggleCommittee() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCommitteeExpanded(prev => !prev);
  }

  function toggleEquipment() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEquipmentExpanded(prev => !prev);
  }

  function toggleCommunity() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCommunityExpanded(prev => !prev);
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
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let mounted = true;
      async function loadProfile() {
        try {
          setProfileLoading(true);
          const { data, error } = await supabase
            .from("profiles")
            .select("first_name, last_name, email, photo_url, is_house_committee, building_id")
            .eq("auth_uid", user.id)
            .maybeSingle();

          if (error) throw error;
          if (mounted) {
            setProfile(data);
            const isC = !!data?.is_house_committee;
            setIsCommittee(isC);
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
      return () => { mounted = false; };
    }, [user?.id])
  );

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
          const [reqs, dists, wallet, monthlySummary] = await Promise.all([
            getOpenRequests(),
            getBuildingDisturbanceReports(),
            getBuildingWallet().catch(() => null),
            getBuildingMonthlySummary().catch(() => null),
          ]);
          if (mounted) {
            setRequestsCount(reqs?.length || 0);
            setDisturbancesCount((dists || []).filter(d => d.status !== 'RESOLVED' && d.status !== 'REJECTED').length);
            setWalletTotal(wallet?.total_collected ?? 0);
            setMonthPaidCount(monthlySummary?.paid_count ?? 0);
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
              {isCommittee && walletTotal !== null && (
                <TouchableOpacity
                  style={styles.walletChip}
                  onPress={() => navigation.navigate("CommitteePaymentsManagement")}
                  activeOpacity={0.75}
                >
                  <Text style={styles.walletChipText}>
                    קופת הבניין - {Number(walletTotal).toLocaleString('he-IL')} שקלים
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconBtn, styles.logoutBtn]} onPress={handleSignOut}>
              <LogOut size={18} color="#fb7185" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => navigation.navigate("ChatList", { user: { ...user, building_id: profile?.building_id } })}
            >
              <MessageCircle size={18} color="#8b5cf6" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotifications(true)}>
              <View>
                  <Bell size={18} color="#94a3b8" />
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




          {/* EQUIPMENT SECTION – accordion */}
          <View style={styles.fullBox}>
            <TouchableOpacity
              style={styles.boxRow}
              onPress={toggleEquipment}
              activeOpacity={0.8}
            >
              <View style={[styles.boxIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
                <Package size={20} color="#f59e0b" />
              </View>
              <View style={styles.boxTextContent}>
                <Text style={styles.boxTitle}>השאלת ציוד</Text>
                <Text style={styles.boxSub}>בקש, הצע ואשר ציוד בבניין</Text>
              </View>
              <View style={[
                styles.committeeChevron,
                equipmentExpanded && styles.committeeChevronOpen
              ]}>
                <ChevronDown size={18} color="#f59e0b" />
              </View>
            </TouchableOpacity>

            {equipmentExpanded && (
              <View style={styles.committeeBody}>
                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("EquipmentCategories", { user, buildingId: profile?.building_id })}
                >
                  <Package size={16} color="#f59e0b" />
                  <Text style={styles.cmRowText}>חיפוש או הצעת ציוד</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("IncomingLoanRequests", { user, buildingId: profile?.building_id })}
                >
                  <Inbox size={16} color="#f59e0b" />
                  <Text style={styles.cmRowText}>בקשות השאלה שקיבלתי</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Square Boxes Row */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.squareBox, { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: 'rgba(37, 99, 235, 0.3)' }]}
              onPress={() => navigation.navigate("PayFees")}
            >
              <View style={[styles.squareIcon, { backgroundColor: '#2563eb' }]}>
                <CreditCard size={18} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.squareBoxTitle}>תשלומים</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.squareBox, { backgroundColor: 'rgba(225, 29, 72, 0.15)', borderColor: 'rgba(225, 29, 72, 0.3)' }]}
              onPress={() => navigation.navigate("ReportDisturbance")}
            >
              <View style={[styles.squareIcon, { backgroundColor: '#e11d48' }]}>
                <AlertTriangle size={18} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.squareBoxTitle}>דיווח מטרד</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Neighbors Feed - Full Width */}
          {/* COMMUNITY SECTION – accordion */}
          <View style={styles.fullBox}>
            <TouchableOpacity
              style={styles.boxRow}
              onPress={toggleCommunity}
              activeOpacity={0.8}
            >
              <View style={[styles.boxIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.25)' }]}>
                <Users size={20} color="#3b82f6" />
              </View>
              <View style={styles.boxTextContent}>
                <Text style={styles.boxTitle}>קהילה ומידע</Text>
                <Text style={styles.boxSub}>לוח ציבורי, מסמכים ואירועים</Text>
              </View>
              <View style={[
                styles.committeeChevron,
                communityExpanded && styles.committeeChevronOpen
              ]}>
                <ChevronDown size={18} color="#3b82f6" />
              </View>
            </TouchableOpacity>

            {communityExpanded && (
              <View style={styles.committeeBody}>
                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("PublicRequests")}
                >
                  <Users size={16} color="#3b82f6" />
                  <Text style={styles.cmRowText}>הלוח הציבורי</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("BuildingDocuments", { user, isCommittee, buildingId: profile?.building_id })}
                >
                  <FileText size={16} color="#3b82f6" />
                  <Text style={styles.cmRowText}>מסמכי בניין</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("BuildingCalendar")}
                >
                  <Calendar size={16} color="#3b82f6" />
                  <Text style={styles.cmRowText}>לוח אירועי הבניין</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                {!isCommittee && (
                  <TouchableOpacity
                    style={styles.cmRow}
                    onPress={() => navigation.navigate("BuildingRules", { user, isCommittee })}
                  >
                    <FileText size={16} color="#3b82f6" />
                    <Text style={styles.cmRowText}>חוקי ונהלי הבניין</Text>
                    <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* COMMITTEE SECTION – accordion */}
        {isCommittee && (
          <View style={styles.committeeContainer}>

            {/* ── Header תמיד גלוי – לחיצה פותחת/סוגרת ── */}
            <TouchableOpacity
              style={styles.committeeHeaderRow}
              onPress={toggleCommittee}
              activeOpacity={0.8}
            >
              <View style={styles.committeeHeaderLeft}>
                <View style={styles.committeeIconBg}>
                  <ShieldCheck size={16} color="#10b981" />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.committeeTitle}>ניהול ועד הבית</Text>
                  <Text style={styles.committeeSubtitle}>
                    {requestsCount > 0 ? `${requestsCount} בקשות` : 'אין בקשות'}
                    {disturbancesCount > 0 ? `  ·  ${disturbancesCount} מטרדים` : ''}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.committeeChevron,
                committeeExpanded && styles.committeeChevronOpen
              ]}>
                <ChevronDown size={18} color="#10b981" />
              </View>
            </TouchableOpacity>

            {/* ── Body – נפתח בלחיצה ── */}
            {committeeExpanded && (
              <View style={styles.committeeBody}>

                {/* קבוצה 1 – דיירים ושוטף */}
                <Text style={styles.committeeGroupLabel}>פעילות שוטפת</Text>
                <View style={styles.committeeRow}>
                  <TouchableOpacity
                    style={[styles.cmBtn, { flex: 1 }]}
                    onPress={() => navigation.navigate("CommitteeRequests")}
                  >
                    <ClipboardList size={18} color="#60a5fa" />
                    <Text style={styles.cmBtnNum}>{requestsCount}</Text>
                    <Text style={styles.cmBtnLabel}>בקשות{"\n"}דיירים</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cmBtn, { flex: 1 }]}
                    onPress={() => navigation.navigate("CommitteeDisturbances")}
                  >
                    <AlertTriangle size={18} color="#fb7185" />
                    <Text style={[styles.cmBtnNum, { color: '#fb7185' }]}>{disturbancesCount}</Text>
                    <Text style={styles.cmBtnLabel}>מטרדים{"\n"}פתוחים</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cmBtn, { flex: 1 }]}
                    onPress={() => navigation.navigate("CommitteePendingUsers", { buildingId: profile.building_id })}
                  >
                    <Clock size={18} color="#fcd34d" />
                    <Text style={[styles.cmBtnNum, { color: '#fcd34d' }]}>!</Text>
                    <Text style={styles.cmBtnLabel}>ממתינים{"\n"}לאישור</Text>
                  </TouchableOpacity>
                </View>

                {/* קבוצה 2 – ניהול */}
                <Text style={styles.committeeGroupLabel}>ניהול</Text>
                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("BuildingUpdates", { isCommittee: true })}
                >
                  <Zap size={16} color="#10b981" />
                  <Text style={styles.cmRowText}>עדכוני בניין</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("BuildingRules", { user, isCommittee })}
                >
                  <FileText size={16} color="#10b981" />
                  <Text style={styles.cmRowText}>נהלים וחוקים</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("CommitteeProviders", { user, isCommittee })}
                >
                  <Wrench size={16} color="#10b981" />
                  <Text style={styles.cmRowText}>ספקי שירות</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("CommitteeInspections")}
                >
                  <Shield size={16} color="#10b981" />
                  <Text style={styles.cmRowText}>ביקורות תקופתיות</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                {/* קבוצה 3 – כספים */}
                <Text style={styles.committeeGroupLabel}>כספים</Text>
                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("CommitteeMonthlyFee")}
                >
                  <DollarSign size={16} color="#34d399" />
                  <Text style={styles.cmRowText}>קביעת סכום חודשי</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("CommitteePaymentsManagement")}
                >
                  <Receipt size={16} color="#34d399" />
                  <Text style={styles.cmRowText}>ניהול תשלומים וקופה</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                {/* קבוצה 4 – ניתוחים */}
                <Text style={styles.committeeGroupLabel}>ניתוחים</Text>
                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("CommitteeWeeklyForecast")}
                >
                  <BarChart2 size={16} color="#818cf8" />
                  <Text style={styles.cmRowText}>תחזית תקלות שבועית</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmRow}
                  onPress={() => navigation.navigate("CommitteeInsights")}
                >
                  <BarChart2 size={16} color="#818cf8" />
                  <Text style={styles.cmRowText}>סטטיסטיקות ניהול</Text>
                  <ChevronLeft size={14} color="#475569" style={{ marginRight: 'auto' }} />
                </TouchableOpacity>

              </View>
            )}
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
    width: 36,
    height: 36,
    borderRadius: 10,
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
    padding: 12,
  },
  boxRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boxIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    fontSize: 14,
    fontWeight: '700',
  },
  boxSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 16,
  },
  squareBox: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 10,
  },
  squareBoxTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  squareIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
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


  // ── Accordion ועד הבית ─────────────────────────────────
  committeeHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  committeeHeaderLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  committeeSubtitle: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
  committeeChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  committeeChevronOpen: {
    transform: [{ rotate: '180deg' }],
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  committeeBody: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(51,65,85,0.6)',
    paddingTop: 12,
  },
  committeeGroupLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
    paddingRight: 2,
  },
  committeeRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 4,
  },
  cmBtn: {
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  cmBtnNum: {
    color: '#60a5fa',
    fontSize: 20,
    fontWeight: '800',
  },
  cmBtnLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  cmRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51,65,85,0.4)',
  },
  cmRowText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
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

  // ── chip קטן ליד השם (ועד בית בלבד) ───────────────────
  walletChip: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(5, 46, 22, 0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  walletChipText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
  },

});