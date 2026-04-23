import React, { useEffect, useState } from "react";
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
import { ArrowRight, TriangleAlert, Shield, ShieldBan } from "lucide-react-native";
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

  const [selectedUser, setSelectedUser] = useState(null);
  const [reason, setReason] = useState("");
  const [modalMode, setModalMode] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getAdminLoadMonitoringData(adminUser, 7);
      setData(result);
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה בטעינת נתוני הניטור");
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

    loadData();
  }, []);

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
      await loadData();
      Alert.alert("הצלחה", "הפעולה בוצעה בהצלחה");
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "הפעולה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowRight size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.header}>ניטור עומסים והתנהגות חריגה</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data?.kpis?.openRequests || 0}</Text>
            <Text style={styles.kpiLabel}>בקשות פתוחות</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data?.kpis?.openDisturbances || 0}</Text>
            <Text style={styles.kpiLabel}>מטרדים פתוחים</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data?.kpis?.overloadedBuildings || 0}</Text>
            <Text style={styles.kpiLabel}>בניינים בעומס</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data?.kpis?.suspiciousUsers || 0}</Text>
            <Text style={styles.kpiLabel}>משתמשים חריגים</Text>
          </View>
        </View>

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

            <Text style={styles.cardText}>בקשות ב-24 שעות: {item.requests24h}</Text>
            <Text style={styles.cardText}>מטרדים ב-24 שעות: {item.disturbances24h}</Text>
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

              <Text style={styles.cardText}>
                משתמש: {selectedUser?.name || "-"}
              </Text>

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
  safe: { flex: 1, backgroundColor: "#051121" },
  container: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  header: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
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
  },
  kpiLabel: {
    color: "#cbd5e1",
    marginTop: 6,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 12,
    marginBottom: 12,
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
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  badgeOk: { backgroundColor: "#166534" },
  badgeDanger: { backgroundColor: "#991b1b" },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
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
  flagBtn: { backgroundColor: "#2563eb" },
  blockBtn: { backgroundColor: "#dc2626" },
  actionBtnText: { color: "#fff", fontWeight: "900" },
  empty: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 10,
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