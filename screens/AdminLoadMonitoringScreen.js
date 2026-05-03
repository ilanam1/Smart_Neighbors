import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  TriangleAlert,
  Shield,
  ShieldBan,
  BarChart3,
  Activity,
  Building2,
  Lightbulb,
  Clock3,
} from "lucide-react-native";

import {
  getAdminLoadMonitoringData,
  flagUserForReview,
  unflagUser,
  blockUser,
  unblockUser,
} from "../API/adminLoadMonitoringApi";

export default function AdminLoadMonitoringScreen({ navigation, route }) {
  const adminUser = route?.params?.adminUser;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [daysBack, setDaysBack] = useState(7);

  const [selectedUser, setSelectedUser] = useState(null);
  const [reason, setReason] = useState("");
  const [modalMode, setModalMode] = useState(null);

  const maxDayCount = useMemo(() => {
    const values = data?.usageByDay?.map((x) => x.count) || [];
    return Math.max(...values, 1);
  }, [data]);

  const maxTypeCount = useMemo(() => {
    const values = data?.usageByType?.map((x) => x.count) || [];
    return Math.max(...values, 1);
  }, [data]);

  const maxBuildingScore = useMemo(() => {
    const values = data?.topBuildingsByActivity?.map((x) => x.loadScore) || [];
    return Math.max(...values, 1);
  }, [data]);

  const loadData = async (range = daysBack) => {
    try {
      setLoading(true);
      const result = await getAdminLoadMonitoringData(adminUser, range);
      setData(result);
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה בטעינת נתוני השימוש והתנועה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminUser?.id) {
      Alert.alert("שגיאה", "לא התקבלו פרטי אדמין");
      navigation.goBack();
      return;
    }

    loadData(daysBack);
  }, []);

  const changeDaysBack = async (value) => {
    setDaysBack(value);
    await loadData(value);
  };

  const openUserActionModal = (user, mode) => {
    setSelectedUser(user);
    setModalMode(mode);
    setReason("");
  };

  const handleUserAction = async () => {
    if (!selectedUser || !modalMode) return;

    try {
      setLoading(true);

      if (modalMode === "flag") {
        await flagUserForReview(adminUser, selectedUser.auth_uid, reason);
      } else if (modalMode === "unflag") {
        await unflagUser(adminUser, selectedUser.auth_uid);
      } else if (modalMode === "block") {
        await blockUser(adminUser, selectedUser.auth_uid, reason);
      } else if (modalMode === "unblock") {
        await unblockUser(adminUser, selectedUser.auth_uid);
      }

      setSelectedUser(null);
      setModalMode(null);
      await loadData(daysBack);
      Alert.alert("הצלחה", "הפעולה בוצעה בהצלחה");
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "הפעולה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  function renderSeverityColor(severity) {
    if (severity === "HIGH") return styles.insightHigh;
    if (severity === "MEDIUM") return styles.insightMedium;
    return styles.insightInfo;
  }

  function renderProgressBar(value, maxValue, color = "#22d3ee") {
    const width = `${Math.min((value / Math.max(maxValue, 1)) * 100, 100)}%`;

    return (
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width, backgroundColor: color }]} />
      </View>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowRight size={24} color="#f8fafc" />
          </TouchableOpacity>

          <View style={styles.headerTextBox}>
            <Text style={styles.header}>דוחות שימוש ותנועה</Text>
            <Text style={styles.subHeader}>
              ניתוח פעילות מערכת, עומסים ותובנות לשיפור ביצועים
            </Text>
          </View>

          <View style={{ width: 24 }} />
        </View>

        <View style={styles.filterRow}>
          {[1, 7, 30].map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterBtn, daysBack === value && styles.filterBtnActive]}
              onPress={() => changeDaysBack(value)}
            >
              <Text
                style={[
                  styles.filterText,
                  daysBack === value && styles.filterTextActive,
                ]}
              >
                {value === 1 ? "24 שעות" : `${value} ימים`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && (
          <ActivityIndicator size="small" color="#38bdf8" style={{ marginBottom: 12 }} />
        )}

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Activity size={20} color="#22d3ee" />
            <Text style={styles.kpiValue}>{data?.kpis?.totalActions || 0}</Text>
            <Text style={styles.kpiLabel}>סה״כ פעולות</Text>
          </View>

          <View style={styles.kpiCard}>
            <Clock3 size={20} color="#a78bfa" />
            <Text style={styles.kpiValue}>{data?.kpis?.totalActions24h || 0}</Text>
            <Text style={styles.kpiLabel}>פעולות ב-24 שעות</Text>
          </View>

          <View style={styles.kpiCard}>
            <Building2 size={20} color="#10b981" />
            <Text style={styles.kpiValue}>{data?.kpis?.activeBuildings || 0}</Text>
            <Text style={styles.kpiLabel}>בניינים פעילים</Text>
          </View>

          <View style={styles.kpiCard}>
            <TriangleAlert size={20} color="#fb7185" />
            <Text style={styles.kpiValue}>{data?.kpis?.overloadedBuildings || 0}</Text>
            <Text style={styles.kpiLabel}>בניינים בעומס</Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <BarChart3 size={22} color="#22d3ee" />
            <Text style={styles.scoreTitle}>ציון עומס מערכת</Text>
          </View>

          <Text style={styles.scoreValue}>{data?.kpis?.totalLoadScore || 0}</Text>
          <Text style={styles.scoreDescription}>
            הציון מחושב לפי משקל הפעולות במערכת: בקשות, מטרדים והשאלות ציוד.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>שימוש לפי סוג פעולה</Text>
        <View style={styles.sectionCard}>
          {data?.usageByType?.map((item) => (
            <View key={item.type} style={styles.metricRow}>
              <View style={styles.metricTopRow}>
                <Text style={styles.metricValue}>
                  {item.count} פעולות · {item.percent}%
                </Text>
                <Text style={styles.metricLabel}>{item.label}</Text>
              </View>

              {renderProgressBar(item.count, maxTypeCount, "#22d3ee")}

              <Text style={styles.metricSmallText}>
                ב-24 שעות האחרונות: {item.count24h}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>תנועה לפי ימים</Text>
        <View style={styles.sectionCard}>
          {data?.usageByDay?.length ? (
            data.usageByDay.map((item) => (
              <View key={item.day} style={styles.metricRow}>
                <View style={styles.metricTopRow}>
                  <Text style={styles.metricValue}>
                    {item.count} פעולות · עומס {item.loadScore}
                  </Text>
                  <Text style={styles.metricLabel}>{item.label}</Text>
                </View>

                {renderProgressBar(item.count, maxDayCount, "#10b981")}

                <Text style={styles.metricSmallText}>
                  בקשות: {item.requests} · מטרדים: {item.disturbances} · ציוד:{" "}
                  {item.equipmentLoans}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>אין נתוני פעילות בטווח הזמן שנבחר.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>בניינים מובילים בפעילות</Text>
        <View style={styles.sectionCard}>
          {data?.topBuildingsByActivity?.length ? (
            data.topBuildingsByActivity.map((item, index) => (
              <View key={item.buildingId} style={styles.metricRow}>
                <View style={styles.metricTopRow}>
                  <Text style={styles.metricValue}>
                    #{index + 1} · {item.totalActions7d} פעולות
                  </Text>
                  <Text style={styles.metricLabel}>{item.buildingName}</Text>
                </View>

                {renderProgressBar(item.loadScore, maxBuildingScore, "#a78bfa")}

                <Text style={styles.metricSmallText}>
                  ציון עומס: {item.loadScore} · בקשות פתוחות: {item.openRequests} ·
                  מטרדים פתוחים: {item.openDisturbances}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>אין בניינים פעילים בטווח הזמן שנבחר.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>תובנות לשיפור ביצועים</Text>
        {data?.performanceInsights?.length ? (
          data.performanceInsights.map((insight, index) => (
            <View
              key={`${insight.type}-${index}`}
              style={[styles.insightCard, renderSeverityColor(insight.severity)]}
            >
              <Lightbulb size={20} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightMessage}>{insight.message}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>אין כרגע תובנות ביצועים.</Text>
        )}

        <Text style={styles.sectionTitle}>התראות עומס</Text>
        {data?.alerts?.length ? (
          data.alerts.map((alert, index) => (
            <View
              key={`${alert.type}-${index}`}
              style={[
                styles.alertCard,
                alert.severity === "HIGH" ? styles.alertHigh : styles.alertMedium,
              ]}
            >
              <TriangleAlert size={18} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>אין כרגע התראות עומס חריגות.</Text>
        )}

        <Text style={styles.sectionTitle}>עומס לפי בניין</Text>
        {data?.buildingLoad?.map((item) => (
          <View key={item.buildingId} style={styles.buildingCard}>
            <View style={styles.rowBetween}>
              <View style={[styles.badge, item.isOverloaded ? styles.badgeDanger : styles.badgeOk]}>
                <Text style={styles.badgeText}>
                  {item.isOverloaded ? "עומס חריג" : "תקין"}
                </Text>
              </View>

              <Text style={styles.buildingTitle}>{item.buildingName}</Text>
            </View>

            <Text style={styles.cardText}>סה״כ פעולות: {item.totalActions7d}</Text>
            <Text style={styles.cardText}>ציון עומס: {item.loadScore}</Text>
            <Text style={styles.cardText}>בקשות ב-24 שעות: {item.requests24h}</Text>
            <Text style={styles.cardText}>מטרדים ב-24 שעות: {item.disturbances24h}</Text>
            <Text style={styles.cardText}>השאלות ציוד ב-24 שעות: {item.equipmentLoans24h}</Text>
            <Text style={styles.cardText}>בקשות פתוחות: {item.openRequests}</Text>
            <Text style={styles.cardText}>מטרדים פתוחים: {item.openDisturbances}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>משתמשים חריגים</Text>
        {data?.suspiciousUsers?.length ? (
          data.suspiciousUsers.map((user) => (
            <View key={user.auth_uid} style={styles.userCard}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.cardText}>אימייל: {user.email}</Text>
              <Text style={styles.cardText}>בניין: {user.buildingName}</Text>
              <Text style={styles.cardText}>בקשות ב-24 שעות: {user.requests24h}</Text>
              <Text style={styles.cardText}>מטרדים ב-24 שעות: {user.disturbances24h}</Text>
              <Text style={styles.cardText}>השאלות ציוד ב-24 שעות: {user.equipmentLoans24h}</Text>
              <Text style={styles.cardText}>סה״כ פעולות: {user.total24h}</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.flagBtn]}
                  onPress={() =>
                    openUserActionModal(user, user.is_flagged ? "unflag" : "flag")
                  }
                >
                  <Shield size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    {user.is_flagged ? "הסר סימון" : "סמן לבדיקה"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.blockBtn]}
                  onPress={() =>
                    openUserActionModal(user, user.is_blocked ? "unblock" : "block")
                  }
                >
                  <ShieldBan size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    {user.is_blocked ? "בטל חסימה" : "חסום"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>לא זוהו משתמשים חריגים כרגע.</Text>
        )}

        <Modal visible={!!modalMode} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {modalMode === "flag" && "סימון משתמש לבדיקה"}
                {modalMode === "block" && "חסימת משתמש"}
                {modalMode === "unflag" && "הסרת סימון"}
                {modalMode === "unblock" && "ביטול חסימה"}
              </Text>

              <Text style={styles.cardText}>משתמש: {selectedUser?.name || "-"}</Text>

              {(modalMode === "flag" || modalMode === "block") && (
                <TextInput
                  style={styles.input}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="סיבה (אופציונלי)"
                  placeholderTextColor="#94a3b8"
                  textAlign="right"
                />
              )}

              <View style={styles.modalBtnsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setModalMode(null);
                    setSelectedUser(null);
                  }}
                >
                  <Text style={styles.actionBtnText}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleUserAction}>
                  <Text style={styles.actionBtnText}>אישור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#051121",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerTextBox: {
    flex: 1,
    alignItems: "center",
  },
  header: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  subHeader: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  filterRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginBottom: 16,
    justifyContent: "center",
  },
  filterBtn: {
    backgroundColor: "#0c1f38",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterBtnActive: {
    backgroundColor: "#22d3ee",
    borderColor: "#22d3ee",
  },
  filterText: {
    color: "#cbd5e1",
    fontWeight: "800",
    fontSize: 12,
  },
  filterTextActive: {
    color: "#051121",
  },

  kpiGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: "#0c1f38",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  kpiValue: {
    color: "#22d3ee",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },
  kpiLabel: {
    color: "#cbd5e1",
    marginTop: 6,
    fontWeight: "700",
    textAlign: "center",
  },

  scoreCard: {
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    borderColor: "rgba(34, 211, 238, 0.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    alignItems: "center",
  },
  scoreHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  scoreTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900",
  },
  scoreValue: {
    color: "#67e8f9",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  scoreDescription: {
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 6,
    fontSize: 12,
    lineHeight: 19,
  },

  sectionTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 12,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: "#0c1f38",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    marginBottom: 8,
  },

  metricRow: {
    marginBottom: 14,
  },
  metricTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
    gap: 8,
  },
  metricLabel: {
    color: "#f8fafc",
    fontWeight: "900",
    textAlign: "right",
    flex: 1,
  },
  metricValue: {
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: 12,
  },
  metricSmallText: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 6,
    textAlign: "right",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "#1e293b",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  insightCard: {
    flexDirection: "row-reverse",
    gap: 10,
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  insightInfo: {
    backgroundColor: "rgba(14, 116, 144, 0.55)",
    borderColor: "#06b6d4",
  },
  insightMedium: {
    backgroundColor: "rgba(120, 53, 15, 0.75)",
    borderColor: "#f59e0b",
  },
  insightHigh: {
    backgroundColor: "rgba(127, 29, 29, 0.75)",
    borderColor: "#ef4444",
  },
  insightTitle: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "right",
  },
  insightMessage: {
    color: "#e2e8f0",
    textAlign: "right",
    marginTop: 4,
    lineHeight: 20,
  },

  alertCard: {
    flexDirection: "row-reverse",
    gap: 10,
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  alertHigh: {
    backgroundColor: "#7f1d1d",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  alertMedium: {
    backgroundColor: "#78350f",
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  alertTitle: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "right",
  },
  alertMessage: {
    color: "#fde68a",
    textAlign: "right",
    marginTop: 4,
    lineHeight: 20,
  },

  buildingCard: {
    backgroundColor: "#0c1f38",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    marginBottom: 10,
  },
  userCard: {
    backgroundColor: "#0c1f38",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  buildingTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    textAlign: "right",
    flex: 1,
  },
  userName: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    textAlign: "right",
    marginBottom: 8,
  },
  cardText: {
    color: "#cbd5e1",
    textAlign: "right",
    marginTop: 4,
    lineHeight: 20,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeOk: {
    backgroundColor: "#166534",
  },
  badgeDanger: {
    backgroundColor: "#991b1b",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },

  actionsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  flagBtn: {
    backgroundColor: "#2563eb",
  },
  blockBtn: {
    backgroundColor: "#dc2626",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "900",
  },
  empty: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 20,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
    textAlign: "right",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    color: "#fff",
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modalBtnsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#475569",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
});