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
import {
  getAssignmentsForReport,
  createAssignment,
  updateAssignmentStatus,
} from "../API/disturbanceAssignmentsApi";

const STATUS_LABEL = {
  REQUESTED: "הוזמן",
  IN_PROGRESS: "בטיפול",
  DONE: "טופל",
  CANCELED: "בוטל",
};

export default function CommitteeDisturbancesScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [providers, setProviders] = useState([]);

  // modal להזמנה
  const [open, setOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [note, setNote] = useState("");

  // cache להזמנה אחרונה לכל report
  const [lastAssignments, setLastAssignments] = useState({}); // reportId -> assignment object

  const supabase = getSupabase();

  const loadReports = async () => {
    const { data, error } = await supabase
      .from("disturbance_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setItems(data || []);
  };

  const loadProviders = async () => {
    const data = await listProviders({ onlyActive: true });
    setProviders(data);
  };

  const loadLastAssignmentFor = async (reportId) => {
    // נביא את ההזמנה האחרונה (אם קיימת)
    const data = await getAssignmentsForReport(reportId);
    const last = data?.[0] || null;
    setLastAssignments((prev) => ({ ...prev, [reportId]: last }));
  };

  const loadAll = async () => {
    setError(null);
    setLoading(true);
    try {
      await Promise.all([loadReports(), loadProviders()]);
    } catch (e) {
      setError(e.message);
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
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    // לאחר טעינת דיווחים: נטען הזמנה אחרונה לכל אחד (בקטן, לא מושלם אבל עובד)
    (async () => {
      for (const r of items) {
        if (r?.id) await loadLastAssignmentFor(r.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const openOrderModal = (report) => {
    setSelectedReport(report);
    setSelectedProviderId(null);
    setNote("");
    setOpen(true);
  };

  const handleCreateOrder = async () => {
    if (!selectedReport?.id) return;
    if (!selectedProviderId) {
      Alert.alert("שגיאה", "בחר ספק");
      return;
    }

    try {
      setLoading(true);
      await createAssignment({
        reportId: selectedReport.id,
        providerId: selectedProviderId,
        note: note.trim() || null,
      });

      setOpen(false);
      await loadLastAssignmentFor(selectedReport.id);
      Alert.alert("הצלחה", "הספק הוזמן בהצלחה");
    } catch (e) {
      Alert.alert("שגיאה", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, assignmentId, status) => {
    try {
      setLoading(true);
      await updateAssignmentStatus(assignmentId, {
        status,
        note: null,
      });
      await loadLastAssignmentFor(reportId);
    } catch (e) {
      Alert.alert("שגיאה", e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderReportTitle = (item) => {
    // אצלך יש description/type/severity/location. אם יש title/address זה גם יתפס.
    return item.title || (item.type ? `מטרד: ${item.type}` : "דיווח מטרד");
  };

  const renderReportMeta = (item) => {
    const date = item.created_at?.slice(0, 10) || "";
    const loc = item.location || item.address || "";
    const sev = item.severity ? `חומרה: ${item.severity}` : "";
    return [loc, sev, date].filter(Boolean).join(" · ");
  };

  const providerNameById = useMemo(() => {
    const map = {};
    for (const p of providers) map[p.id] = p;
    return map;
  }, [providers]);

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
  if (error) return <Text style={styles.error}>שגיאה: {error}</Text>;
  if (!items.length)
    return <Text style={styles.empty}>אין עדיין דיווחי מטרדים.</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const last = lastAssignments[item.id] || null;
          const provider = last?.service_providers || (last?.provider_id ? providerNameById[last.provider_id] : null);

          return (
            <View style={styles.card}>
              <Text style={styles.title}>{renderReportTitle(item)}</Text>
              <Text style={styles.body}>{item.description}</Text>
              <Text style={styles.meta}>{renderReportMeta(item)}</Text>

              <View style={styles.divider} />

              {!last ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => openOrderModal(item)}
                >
                  <Text style={styles.primaryBtnText}>הזמן ספק לטיפול</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.assignmentBox}>
                  <Text style={styles.assignmentText}>
                    ספק: {provider?.name || "לא ידוע"}{" "}
                    {provider?.phone ? `· ${provider.phone}` : ""}
                  </Text>
                  <Text style={styles.assignmentText}>
                    סטטוס: {STATUS_LABEL[last.status] || last.status}
                  </Text>

                  <View style={styles.statusRow}>
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() => handleUpdateStatus(item.id, last.id, "IN_PROGRESS")}
                    >
                      <Text style={styles.smallBtnText}>בטיפול</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() => handleUpdateStatus(item.id, last.id, "DONE")}
                    >
                      <Text style={styles.smallBtnText}>טופל</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.smallBtn, styles.dangerBtn]}
                      onPress={() => handleUpdateStatus(item.id, last.id, "CANCELED")}
                    >
                      <Text style={styles.smallBtnText}>ביטול</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.smallBtn, styles.secondaryBtn]}
                      onPress={() => openOrderModal(item)}
                    >
                      <Text style={[styles.smallBtnText, { color: "#f8fafc" }]}>
                        הזמנה חדשה
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Modal הזמנת ספק */}
      <Modal visible={open} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>הזמנת ספק</Text>

            <Text style={styles.modalSub}>
              {selectedReport ? renderReportTitle(selectedReport) : ""}
            </Text>

            <Text style={styles.label}>בחר ספק</Text>
            <View style={styles.providersWrap}>
              {providers.map((p) => {
                const selected = selectedProviderId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProviderId(p.id)}
                    style={[styles.providerChip, selected && styles.providerChipSelected]}
                  >
                    <Text style={[styles.providerChipText, selected && styles.providerChipTextSelected]}>
                      {p.name} ({p.category})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>הערה לספק (אופציונלי)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={note}
              onChangeText={setNote}
              multiline
              textAlign="right"
            />

            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={[styles.secondaryModalBtn]}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.secondaryModalBtnText}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }]}
                onPress={handleCreateOrder}
              >
                <Text style={styles.primaryBtnText}>הזמן</Text>
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
  list: { padding: 16 },
  card: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: { fontWeight: "700", fontSize: 16, textAlign: "right", color: "#f8fafc" },
  body: { marginTop: 4, color: "#e2e8f0", textAlign: "right" },
  meta: { marginTop: 6, fontSize: 12, color: "#94a3b8", textAlign: "right" },

  divider: { height: 1, backgroundColor: "#334155", marginVertical: 10 },

  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "800" },

  assignmentBox: { gap: 6 },
  assignmentText: { textAlign: "right", color: "#f8fafc", fontWeight: "700" },
  statusRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 6 },

  smallBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  secondaryBtn: { backgroundColor: "#334155" },
  dangerBtn: { backgroundColor: "#b91c1c", borderColor: "#b91c1c" },
  smallBtnText: { color: "white", fontWeight: "800" },

  error: { marginTop: 20, textAlign: "center", color: "#f87171" },
  empty: { marginTop: 20, textAlign: "center", color: "#94a3b8" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#1e293b", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155" },
  modalTitle: { fontSize: 18, fontWeight: "900", textAlign: "right", color: "#f8fafc" },
  modalSub: { marginTop: 6, color: "#94a3b8", textAlign: "right" },

  label: { marginTop: 12, marginBottom: 6, textAlign: "right", fontWeight: "800", color: "#e2e8f0" },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 10,
    textAlign: "right",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
  },

  providersWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  providerChip: { borderWidth: 1, borderColor: "#475569", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 18 },
  providerChipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  providerChipText: { fontWeight: "800", color: "#e2e8f0" },
  providerChipTextSelected: { color: "white" },

  modalBtnsRow: { flexDirection: "row-reverse", gap: 10, marginTop: 14 },
  secondaryModalBtn: { backgroundColor: "#334155", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  secondaryModalBtnText: { fontWeight: "900", color: "#f8fafc" },
});
