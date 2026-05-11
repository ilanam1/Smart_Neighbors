import React, { useEffect, useState } from "react";
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
  Linking,
} from "react-native";
import { FileText } from "lucide-react-native";
import { getSupabase } from "../DataBase/supabase";
import { listProviders } from "../API/serviceProvidersApi";
import { getBuildingDisturbanceReports } from "../API/disturbancesApi";
import {
  createJobRequest,
  getJobsForReport,
  createJobCompletionDocumentSignedUrl,
} from "../API/jobRequestsApi";
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

const DOCUMENT_TYPE_LABEL = {
  INVOICE: "חשבונית",
  RECEIPT: "קבלה",
  REPAIR_PROOF: "אסמכתא",
  OTHER: "מסמך",
};

const SEVERITY_LABEL = {
  LOW: "נמוכה",
  MEDIUM: "בינונית",
  HIGH: "גבוהה",
};

const SEVERITY_COLOR = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
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

  const [open, setOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const [lastJobs, setLastJobs] = useState({});
  const [showResolved, setShowResolved] = useState(false);

  const loadReports = async () => {
    const data = await getBuildingDisturbanceReports();
    setItems(data || []);
  };

  const loadEmployees = async () => {
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

  const openCompletionDocument = async (doc) => {
    try {
      if (!doc?.file_path) {
        Alert.alert("שגיאה", "לא נמצא נתיב לאסמכתא");
        return;
      }

      const signedUrl = await createJobCompletionDocumentSignedUrl(doc.file_path);

      if (!signedUrl) {
        Alert.alert("שגיאה", "לא ניתן לפתוח את האסמכתא");
        return;
      }

      const supported = await Linking.canOpenURL(signedUrl);

      if (!supported) {
        Alert.alert("שגיאה", "המכשיר לא מצליח לפתוח את הקובץ");
        return;
      }

      await Linking.openURL(signedUrl);
    } catch (e) {
      Alert.alert("שגיאה", e.message || "שגיאה בפתיחת האסמכתא");
    }
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
        scheduleTime: scheduleTime.trim() || null,
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
      await loadReports();
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


  const renderSmartSeverityBox = (item) => {
  if (!item.predicted_severity) {
    return null;
  }

  const selected = item.severity;
  const predicted = item.predicted_severity;
  const confidence = item.severity_confidence
    ? Math.round(Number(item.severity_confidence) * 100)
    : null;

  const isDifferent = selected !== predicted;

  return (
    <View
      style={[
        styles.smartBox,
        isDifferent ? styles.smartBoxWarning : styles.smartBoxOk,
      ]}
    >
      <Text style={styles.smartTitle}>המלצת מערכת חכמה</Text>

      <Text style={styles.smartText}>
        חומרת דייר: {SEVERITY_LABEL[selected] || selected}
      </Text>

      <Text
        style={[
          styles.smartPrediction,
          { color: SEVERITY_COLOR[predicted] || "#38bdf8" },
        ]}
      >
        המלצת המערכת: {SEVERITY_LABEL[predicted] || predicted}
        {confidence ? ` (${confidence}% ביטחון)` : ""}
      </Text>

      {isDifferent && (
        <Text style={styles.smartWarningText}>
          שים לב: המערכת מזהה פער בין חומרת הדייר לבין חומרת התקלה המשוערת.
        </Text>
      )}

      {!!item.severity_recommendation_reason && (
        <Text style={styles.smartReason}>
          הסבר: {item.severity_recommendation_reason}
        </Text>
      )}
    </View>
  );
};

  const renderDocuments = (lastJob) => {
    const documents = lastJob?.job_completion_documents || [];

    if (lastJob?.status !== "DONE") {
      return null;
    }

    if (!documents.length) {
      return (
        <View style={styles.noDocumentBox}>
          <Text style={styles.noDocumentText}>
            המשימה סומנה כבוצעה, אך לא נמצאה אסמכתא שמורה.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.documentBox}>
        <Text style={styles.documentTitle}>אסמכתאות תיקון</Text>

        {documents.map((doc) => (
          <TouchableOpacity
            key={doc.id}
            style={styles.documentButton}
            onPress={() => openCompletionDocument(doc)}
          >
            <FileText size={18} color="#38bdf8" />

            <View style={{ flex: 1 }}>
              <Text style={styles.documentButtonText}>
                {DOCUMENT_TYPE_LABEL[doc.document_type] || "מסמך"}:{" "}
                {doc.file_name || "פתח אסמכתא"}
              </Text>

              {!!doc.note && (
                <Text style={styles.documentNote}>הערה: {doc.note}</Text>
              )}

              {!!doc.uploaded_at && (
                <Text style={styles.documentDate}>
                  הועלה בתאריך: {doc.uploaded_at.slice(0, 10)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading && items.length === 0) {
    return (
      <ActivityIndicator style={{ marginTop: 20 }} color="#38bdf8" />
    );
  }

  if (error) {
    return <Text style={styles.error}>שגיאה: {error}</Text>;
  }

  if (!items.length && !loading) {
    return <Text style={styles.empty}>אין עדיין דיווחי מטרדים בבניין שלך.</Text>;
  }

  const filteredItems = items.filter((item) =>
    showResolved ? true : item.status !== "RESOLVED" && item.status !== "REJECTED"
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.counterText}>מציג: {filteredItems.length} מטרדים</Text>

        <TouchableOpacity
          onPress={() => setShowResolved(!showResolved)}
          style={styles.historyToggle}
        >
          <Text style={styles.historyToggleText}>
            {showResolved ? "הסתר מטרדים שטופלו" : "הצג הכל (כולל היסטוריה)"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const lastJob = lastJobs[item.id] || null;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.title}>{renderReportTitle(item)}</Text>

                <View
                  style={[
                    styles.statusBadge,
                    item.status === "RESOLVED" && styles.statusBadgeResolved,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {STATUS_LABEL[item.status] || item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.body}>{item.description}</Text>
              <Text style={styles.meta}>{renderReportMeta(item)}</Text>
              {renderSmartSeverityBox(item)}

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
                    עובד מבצע: {lastJob.service_employees?.full_name || "לא ידוע"}{" "}
                    {lastJob.service_employees?.phone
                      ? `(${lastJob.service_employees.phone})`
                      : ""}
                  </Text>

                  <Text style={styles.assignmentText}>
                    תיאור: {lastJob.instructions || "אין תיאור"}
                  </Text>

                  <Text style={styles.assignmentText}>
                    זמן לביצוע: {lastJob.schedule_time || "לא מוגדר"}
                  </Text>

                  <Text
                    style={[
                      styles.assignmentText,
                      { color: "#38bdf8", marginTop: 4 },
                    ]}
                  >
                    סטטוס הקריאה: {JOB_STATUS_LABEL[lastJob.status] || lastJob.status}
                  </Text>

                  {lastJob.status === "DONE" && (
                    <Text style={styles.doneText}>המשימה הושלמה בהצלחה.</Text>
                  )}

                  {renderDocuments(lastJob)}

                  {lastJob.status === "REJECTED" && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, { marginTop: 10 }]}
                      onPress={() => openOrderModal(item, lastJob)}
                    >
                      <Text style={styles.primaryBtnText}>
                        הקצאה חלופית (העובד סירב)
                      </Text>
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
              <Text style={styles.noEmployeesText}>
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
                style={[
                  styles.primaryBtn,
                  { flex: 1, opacity: employees.length === 0 ? 0.5 : 1 },
                ]}
                onPress={handleCreateOrder}
                disabled={employees.length === 0 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryBtnText}>שלח קריאה לעובד הייעודי</Text>
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

  topRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  counterText: {
    color: "#94a3b8",
    fontSize: 13,
  },

  historyToggle: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  historyToggleText: {
    color: "#38bdf8",
    fontWeight: "bold",
    fontSize: 13,
  },

  list: {
    padding: 16,
    paddingBottom: 60,
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },

  cardTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontWeight: "800",
    fontSize: 17,
    textAlign: "right",
    color: "#f8fafc",
    flex: 1,
  },

  body: {
    marginTop: 6,
    color: "#cbd5e1",
    textAlign: "right",
    fontSize: 15,
  },

  meta: {
    marginTop: 8,
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "right",
  },

  statusBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  statusBadgeResolved: {
    backgroundColor: "#166534",
  },

  statusBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },

  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 12,
  },

  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryBtnText: {
    color: "white",
    fontWeight: "800",
  },

  assignmentBox: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  assignmentTitle: {
    textAlign: "right",
    color: "#94a3b8",
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 4,
  },

  assignmentText: {
    textAlign: "right",
    color: "#f8fafc",
    fontWeight: "500",
    fontSize: 14,
    marginTop: 2,
  },

  doneText: {
    textAlign: "right",
    color: "#10b981",
    fontWeight: "800",
    marginTop: 8,
  },

  documentBox: {
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 12,
  },

  documentTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 8,
  },

  documentButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },

  documentButtonText: {
    color: "#38bdf8",
    fontWeight: "800",
    textAlign: "right",
  },

  documentNote: {
    color: "#cbd5e1",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },

  documentDate: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "right",
    marginTop: 3,
  },

  noDocumentBox: {
    marginTop: 12,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#92400e",
    padding: 10,
  },

  noDocumentText: {
    color: "#fbbf24",
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
  },

  error: {
    marginTop: 20,
    textAlign: "center",
    color: "#f87171",
  },

  empty: {
    marginTop: 20,
    textAlign: "center",
    color: "#94a3b8",
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
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
    color: "#f8fafc",
  },

  modalSub: {
    marginTop: 6,
    color: "#94a3b8",
    textAlign: "right",
    fontSize: 13,
  },

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

  noEmployeesText: {
    textAlign: "right",
    color: "#ef4444",
    marginBottom: 10,
  },

  providersWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  providerChip: {
    borderWidth: 1,
    borderColor: "#475569",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#0f172a",
  },

  providerChipSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  providerChipText: {
    fontWeight: "800",
    color: "#94a3b8",
  },

  providerChipTextSelected: {
    color: "white",
  },

  modalBtnsRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 24,
  },

  secondaryModalBtn: {
    backgroundColor: "#334155",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  secondaryModalBtnText: {
    fontWeight: "900",
    color: "#f8fafc",
  },


  smartBox: {
  marginTop: 12,
  borderRadius: 12,
  padding: 12,
  borderWidth: 1,
},

smartBoxOk: {
  backgroundColor: "rgba(34, 197, 94, 0.08)",
  borderColor: "#166534",
},

smartBoxWarning: {
  backgroundColor: "rgba(245, 158, 11, 0.1)",
  borderColor: "#92400e",
},

smartTitle: {
  color: "#f8fafc",
  fontWeight: "900",
  textAlign: "right",
  marginBottom: 6,
},

smartText: {
  color: "#cbd5e1",
  textAlign: "right",
  fontSize: 13,
  marginTop: 2,
},

smartPrediction: {
  textAlign: "right",
  fontWeight: "900",
  fontSize: 14,
  marginTop: 4,
},

smartWarningText: {
  color: "#fbbf24",
  textAlign: "right",
  fontWeight: "800",
  fontSize: 13,
  marginTop: 6,
},

smartReason: {
  color: "#94a3b8",
  textAlign: "right",
  fontSize: 12,
  marginTop: 6,
  lineHeight: 18,
},
});