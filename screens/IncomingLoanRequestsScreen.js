import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Package,
} from "lucide-react-native";
import {
  getIncomingLoanRequests,
  approveLoanRequest,
  rejectLoanRequest,
} from "../API/equipmentLoansApi";
import { getSupabase } from "../DataBase/supabase";

export default function IncomingLoanRequestsScreen({ route }) {
  const { user } = route.params || {};

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOnId, setActingOnId] = useState(null);
  const [error, setError] = useState("");
  const [profilesMap, setProfilesMap] = useState({});

  const supabase = getSupabase();

  const loadRequests = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const data = await getIncomingLoanRequests(user?.id);
      const requestsData = data || [];
      setRequests(requestsData);

      const borrowerIds = [
        ...new Set(
          requestsData
            .map((item) => item.borrower_id)
            .filter(Boolean)
        ),
      ];

      if (borrowerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("auth_uid, first_name, last_name, email")
          .in("auth_uid", borrowerIds);

        if (profilesError) throw profilesError;

        const mapped = {};
        (profilesData || []).forEach((profile) => {
          mapped[profile.auth_uid] = profile;
        });
        setProfilesMap(mapped);
      } else {
        setProfilesMap({});
      }
    } catch (err) {
      console.error("Incoming loan requests load error:", err);
      setError("אירעה שגיאה בטעינת הבקשות.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  function getBorrowerDisplayName(borrowerId) {
    const profile = profilesMap[borrowerId];
    if (!profile) return "דייר מהבניין";

    const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return fullName || profile.email || "דייר מהבניין";
  }

  function getStatusLabel(status) {
    switch (status) {
      case "pending":
        return "ממתין לאישור";
      case "approved":
        return "אושר";
      case "rejected":
        return "נדחה";
      case "returned":
        return "הוחזר";
      case "cancelled":
        return "בוטל";
      default:
        return status || "לא ידוע";
    }
  }

  function getStatusStyle(status) {
    switch (status) {
      case "pending":
        return styles.statusPending;
      case "approved":
        return styles.statusApproved;
      case "rejected":
        return styles.statusRejected;
      case "returned":
        return styles.statusReturned;
      case "cancelled":
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  }

  async function handleApprove(loanId) {
    try {
      setActingOnId(loanId);
      await approveLoanRequest(loanId);
      Alert.alert("הצלחה", "בקשת ההשאלה אושרה בהצלחה.");
      await loadRequests(true);
    } catch (err) {
      console.error("Approve loan error:", err);
      Alert.alert("שגיאה", err?.message || "לא ניתן היה לאשר את הבקשה.");
    } finally {
      setActingOnId(null);
    }
  }

  async function handleReject(loanId) {
    try {
      setActingOnId(loanId);
      await rejectLoanRequest(loanId);
      Alert.alert("בוצע", "בקשת ההשאלה נדחתה.");
      await loadRequests(true);
    } catch (err) {
      console.error("Reject loan error:", err);
      Alert.alert("שגיאה", err?.message || "לא ניתן היה לדחות את הבקשה.");
    } finally {
      setActingOnId(null);
    }
  }

  function confirmApprove(loanId) {
    Alert.alert(
      "אישור בקשה",
      "האם לאשר את בקשת ההשאלה הזאת?",
      [
        { text: "ביטול", style: "cancel" },
        { text: "אישור", onPress: () => handleApprove(loanId) },
      ]
    );
  }

  function confirmReject(loanId) {
    Alert.alert(
      "דחיית בקשה",
      "האם לדחות את בקשת ההשאלה הזאת?",
      [
        { text: "ביטול", style: "cancel" },
        { text: "דחה", style: "destructive", onPress: () => handleReject(loanId) },
      ]
    );
  }

  function renderRequest({ item }) {
    const borrowerName = getBorrowerDisplayName(item.borrower_id);
    const isPending = item.status === "pending";
    const isActing = actingOnId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>

          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>
              {item.building_equipment?.title || "פריט ללא שם"}
            </Text>
            <Text style={styles.itemSub}>בקשת השאלה על ציוד שלך</Text>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>מבקש ההשאלה</Text>
          <Text style={styles.infoValue}>{borrowerName}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>טווח התאריכים</Text>
          <Text style={styles.infoValue}>
            {item.start_date} ← {item.end_date}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>תיאור הפריט</Text>
          <Text style={styles.infoValue}>
            {item.building_equipment?.description || "לא נוסף תיאור לפריט"}
          </Text>
        </View>

        {isPending && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.rejectButton, isActing && styles.disabledButton]}
              onPress={() => confirmReject(item.id)}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <XCircle size={16} color="#fff" />
                  <Text style={styles.rejectButtonText}>דחה</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.approveButton, isActing && styles.disabledButton]}
              onPress={() => confirmApprove(item.id)}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <>
                  <CheckCircle2 size={16} color="#0f172a" />
                  <Text style={styles.approveButtonText}>אשר</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>בקשות השאלה שקיבלתי</Text>
        <Text style={styles.headerSubTitle}>
          כאן תוכל לאשר או לדחות בקשות על הפריטים שפרסמת
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : requests.length === 0 ? (
        <View style={styles.emptyBox}>
          <Package size={34} color="#94a3b8" />
          <Text style={styles.emptyTitle}>אין כרגע בקשות השאלה</Text>
          <Text style={styles.emptySub}>
            כאשר שכן יבקש להשאיל פריט שלך, הבקשה תופיע כאן
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRequests(true)}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 8,
    marginBottom: 18,
    alignItems: "flex-end",
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "right",
  },
  headerSubTitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
    textAlign: "right",
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.7)",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  itemHeader: {
    flex: 1,
    alignItems: "flex-end",
    marginLeft: 12,
  },
  itemTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  itemSub: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPending: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
  },
  statusApproved: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  statusRejected: {
    backgroundColor: "rgba(244, 63, 94, 0.18)",
  },
  statusReturned: {
    backgroundColor: "rgba(59, 130, 246, 0.18)",
  },
  statusCancelled: {
    backgroundColor: "rgba(100, 116, 139, 0.25)",
  },
  statusDefault: {
    backgroundColor: "rgba(100, 116, 139, 0.25)",
  },
  statusText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  infoBlock: {
    marginBottom: 12,
    alignItems: "flex-end",
  },
  infoLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 4,
    textAlign: "right",
  },
  infoValue: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "right",
  },
  actionsRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#10b981",
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row-reverse",
    gap: 8,
  },
  approveButtonText: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 14,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#f43f5e",
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row-reverse",
    gap: 8,
  },
  rejectButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  emptyBox: {
    marginTop: 40,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(30, 41, 59, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.6)",
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySub: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    color: "#fb7185",
    textAlign: "center",
    marginTop: 30,
    fontSize: 15,
  },
});