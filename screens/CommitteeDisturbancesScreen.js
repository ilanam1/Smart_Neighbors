import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { getSupabase } from "../DataBase/supabase";
import { listProviders } from "../API/serviceProvidersApi";
import { getBuildingDisturbanceReports } from "../API/disturbancesApi";
import { createJobRequest, getJobsForReport } from "../API/jobRequestsApi";
import { createBuildingMaintenanceNotification } from "../API/notificationsApi";

const STATUS_LABEL = {
  OPEN: "ממתין לטיפול",
  IN_PROGRESS: "בטיפול עובד",
  RESOLVED: "נפתר",
  REJECTED: "נדחה",
};

const JOB_STATUS_LABEL = {
  PENDING: "ממתין לאישור עובד",
  ACCEPTED: "העובד בדרך/אישר",
  DONE: "העובד ביצע",
  REJECTED: "העובד דחה",
};


const getCurrentAuthUser = async () => {
  const supabase = getSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("שגיאה בזיהוי המשתמש המחובר");
  }

  return user;
};

export default function CommitteeDisturbancesScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [employees, setEmployees] = useState([]);

  // Modal State
  const [open, setOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const [lastJobs, setLastJobs] = useState({});

  const loadReports = async () => {
    const data = await getBuildingDisturbanceReports();
    setItems(data || []);
  };

  const loadEmployees = async () => {
    // This fetches assigned employees to the building
    const data = await listProviders();
    setEmployees(data || []);
  };

  const loadLastJobFor = async (reportId) => {
    const data = await getJobsForReport(reportId);
    const last = data?.[0] || null;
    setLastJobs((prev) => ({ ...prev, [reportId]: last }));
  };

  const loadAll = async () => {
    setError(null);
    setLoading(true);
    try {
      await Promise.all([loadReports(), loadEmployees()]);
    } catch (e) {
      console.error(e);
      setError(e.message || "שגיאה בטעינת נתוני המטרדים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadAll();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      for (const r of items) {
        if (r?.id) {
          await loadLastJobFor(r.id);
        }
      }
    })();
  }, [items]);

  const openOrderModal = (report, lastJob = null) => {
    setSelectedReport(report);
    setSelectedEmployeeId(null);
    setInstructions(lastJob?.instructions || "");
    setScheduleTime(lastJob?.schedule_time || "");
    setOpen(true);
  };

  const handleCreateOrder = async () => {
    if (!selectedReport?.id) return;
    if (!selectedEmployeeId) {
      Alert.alert("שגיאה", "בחר עובד לביצוע המשימה");
      return;
    }

    try {
      setLoading(true);

      await createJobRequest({
        reportId: selectedReport.id,
        employeeId: selectedEmployeeId,
        instructions: instructions.trim() || null,
        scheduleTime: scheduleTime.trim() || null
      });



      const currentUser = await getCurrentAuthUser();

      const maintenanceDateText = scheduleTime?.trim()
        ? `בתאריך/זמן: ${scheduleTime.trim()}`
        : "בזמן הקרוב";

      await createBuildingMaintenanceNotification({
        buildingId: selectedReport.building_id,
        senderId: currentUser.id,
        title: "הודעת תחזוקה לבניין 🔧",
        message: `צפויה עבודת תחזוקה בבניין בנושא ${selectedReport.type}. ${maintenanceDateText}.`,
        relatedData: {
          report_id: selectedReport.id,
          disturbance_type: selectedReport.type,
          disturbance_status: selectedReport.status,
          schedule_time: scheduleTime?.trim() || null,
          location: selectedReport.location || null,
          description: selectedReport.description || null,
        },
        excludeUserId: currentUser.id,
      });

      setOpen(false);
      await loadReports(); // To see the IN_PROGRESS status
      await loadLastJobFor(selectedReport.id);
      Alert.alert("הצלחה", "קריאת שירות נשלחה בהצלחה לעובד!");
    } catch (e) {
      console.error(e);
      Alert.alert("שגיאה", e.message || "אירעה שגיאה ביצירת הקריאה");
    } finally {
      setLoading(false);
    }
  };

  const renderReportTitle = (item) => {
    return item.title || (item.type ? `מטרד: ${item.type}` : "דיווח מטרד");
  };

  const renderReportMeta = (item) => {
    const date = item.created_at?.slice(0, 10) || "";
    const loc = item.location || item.address || "";
    const sev = item.severity ? `חומרה: ${item.severity}` : "";
    return [loc, sev, date].filter(Boolean).join(" · ");
  };

  if (loading && items.length === 0) return <ActivityIndicator style={{ marginTop: 20 }} color="#38bdf8" />;
  if (error) return <Text style={styles.error}>שגיאה: {error}</Text>;
  if (!items.length && !loading) {
    return <Text style={styles.empty}>אין עדיין דיווחי מטרדים בבניין שלך.</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const lastJob = lastJobs[item.id] || null;

          return (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.title}>{renderReportTitle(item)}</Text>
                <View style={[styles.statusBadge, item.status === 'RESOLVED' && styles.statusBadgeResolved]}>
                  <Text style={styles.statusBadgeText}>{STATUS_LABEL[item.status] || item.status}</Text>
                </View>
              </View>
              <Text style={styles.body}>{item.description}</Text>
              <Text style={styles.meta}>{renderReportMeta(item)}</Text>

              <View style={styles.divider} />

              {!lastJob ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => openOrderModal(item)}
                >
                  <Text style={styles.primaryBtnText}>פתח קריאת שירות לעובד</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.assignmentBox}>
                  <Text style={styles.assignmentTitle}>הקצאה פעילה:</Text>
                  <Text style={styles.assignmentText}>
                    עובד מבצע: {lastJob.service_employees?.full_name || "לא ידוע"} {lastJob.service_employees?.phone ? `(${lastJob.service_employees.phone})` : ""}
                  </Text>
                  <Text style={styles.assignmentText}>
                    תיאור: {lastJob.instructions || "אין תיאור"}
                  </Text>
                  <Text style={styles.assignmentText}>
                    זמן לביצוע: {lastJob.schedule_time || "לא מוגדר"}
                  </Text>
                  <Text style={[styles.assignmentText, { color: '#38bdf8', marginTop: 4 }]}>
                    סטטוס הקריאה: {JOB_STATUS_LABEL[lastJob.status] || lastJob.status}
                  </Text>

                  {lastJob.status === 'DONE' && (
                    <Text style={{ textAlign: "right", color: "#10b981", fontWeight: "700", marginTop: 4 }}>
                      המשימה הושלמה בהצלחה.
                    </Text>
                  )}
                  
                  {lastJob.status === 'REJECTED' && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, { marginTop: 10 }]}
                      onPress={() => openOrderModal(item, lastJob)}
                    >
                      <Text style={styles.primaryBtnText}>הקצאה חלופית (העובד סירב)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal visible={open} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>הפניית מטרד לטיפול עובד</Text>

            <Text style={styles.modalSub}>
              עבור: {selectedReport ? renderReportTitle(selectedReport) : ""}
            </Text>

            <Text style={styles.label}>1. בחר עובד מצוות הבניין</Text>
            {employees.length === 0 ? (
              <Text style={{ textAlign: 'right', color: '#ef4444', marginBottom: 10 }}>
                אין לך עובדים מקושרים לבניין. הוסף נותן שירות במסך ניהול ספקים.
              </Text>
            ) : (
                <View style={styles.providersWrap}>
                {employees.map((p) => {
                    const selected = selectedEmployeeId === p.id;
                    return (
                    <TouchableOpacity
                        key={p.id}
                        onPress={() => setSelectedEmployeeId(p.id)}
                        style={[
                        styles.providerChip,
                        selected && styles.providerChipSelected,
                        ]}
                    >
                        <Text
                        style={[
                            styles.providerChipText,
                            selected && styles.providerChipTextSelected,
                        ]}
                        >
                        {p.name} ({p.category})
                        </Text>
                    </TouchableOpacity>
                    );
                })}
                </View>
            )}

            <Text style={styles.label}>2. תיאור העבודה לעובד (אופציונלי)</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="לדוגמה: לנקות את חדר המדרגות בקומה 2"
              placeholderTextColor="#64748b"
              multiline
              textAlign="right"
            />

            <Text style={styles.label}>3. מתי ואיך לטפל?</Text>
            <TextInput
              style={[styles.input, { height: 50 }]}
              value={scheduleTime}
              onChangeText={setScheduleTime}
              placeholder="לדוגמה: היום אחהצ / בהקדם האפשרי"
              placeholderTextColor="#64748b"
              textAlign="right"
            />

            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={styles.secondaryModalBtn}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.secondaryModalBtnText}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, opacity: employees.length === 0 ? 0.5 : 1 }]}
                onPress={handleCreateOrder}
                disabled={employees.length === 0 || loading}
              >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.primaryBtnText}>שלח קריאה לעובד היעודי</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  list: { padding: 16, paddingBottom: 60 },
  card: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: { fontWeight: "800", fontSize: 17, textAlign: "right", color: "#f8fafc", flex: 1 },
  body: { marginTop: 6, color: "#cbd5e1", textAlign: "right", fontSize: 15 },
  meta: { marginTop: 8, fontSize: 13, color: "#94a3b8", textAlign: "right" },

  statusBadge: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeResolved: { backgroundColor: '#166534' },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: "#334155", marginVertical: 12 },

  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "800" },

  assignmentBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1e293b' },
  assignmentTitle: { textAlign: "right", color: "#94a3b8", fontWeight: "800", fontSize: 13, marginBottom: 4 },
  assignmentText: { textAlign: "right", color: "#f8fafc", fontWeight: "500", fontSize: 14, marginTop: 2 },

  error: { marginTop: 20, textAlign: "center", color: "#f87171" },
  empty: { marginTop: 20, textAlign: "center", color: "#94a3b8" },

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
  modalTitle: { fontSize: 20, fontWeight: "900", textAlign: "right", color: "#f8fafc" },
  modalSub: { marginTop: 6, color: "#94a3b8", textAlign: "right", fontSize: 13 },

  label: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "right",
    fontWeight: "800",
    color: "#e2e8f0",
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 12,
    textAlign: "right",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
  },

  providersWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  providerChip: {
    borderWidth: 1,
    borderColor: "#475569",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#0f172a'
  },
  providerChipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  providerChipText: { fontWeight: "800", color: "#94a3b8" },
  providerChipTextSelected: { color: "white" },

  modalBtnsRow: { flexDirection: "row-reverse", gap: 12, marginTop: 24 },
  secondaryModalBtn: {
    backgroundColor: "#334155",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  secondaryModalBtnText: { fontWeight: "900", color: "#f8fafc" },
});