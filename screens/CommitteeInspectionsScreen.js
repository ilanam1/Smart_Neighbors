import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, CalendarDays, ShieldCheck } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { listProviders } from "../API/serviceProvidersApi";
import {
  listInspectionTemplates,
  createBuildingInspection,
  getBuildingInspections,
} from "../API/inspectionsApi";

const PRIORITY_LABELS = {
  LOW: "נמוכה",
  MEDIUM: "בינונית",
  HIGH: "גבוהה",
};

const STATUS_LABELS = {
  PENDING: "ממתין",
  COMPLETED: "בוצע",
  OVERDUE: "באיחור",
  SKIPPED: "דולג",
};

export default function CommitteeInspectionsScreen() {
  const navigation = useNavigation();

  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const loadAll = async () => {
    try {
      setLoading(true);
      const [inspectionsData, templatesData, employeesData] = await Promise.all([
        getBuildingInspections(),
        listInspectionTemplates(),
        listProviders(),
      ]);

      setItems(inspectionsData || []);
      setTemplates(templatesData || []);
      setEmployees(employeesData || []);

      if ((templatesData || []).length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(templatesData[0].id);
      }

      if ((employeesData || []).length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(employeesData[0].id);
      }
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה בטעינת מסך הביקורות");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreate = () => {
    const now = new Date();
    const defaultDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    setDueDate(defaultDate.toISOString().slice(0, 16));
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedTemplateId) {
      Alert.alert("שגיאה", "יש לבחור תבנית ביקורת");
      return;
    }

    if (!selectedEmployeeId) {
      Alert.alert("שגיאה", "יש לבחור עובד אחראי");
      return;
    }

    if (!dueDate.trim()) {
      Alert.alert("שגיאה", "יש להזין תאריך יעד");
      return;
    }

    try {
      setLoading(true);

      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        throw new Error("פורמט תאריך לא תקין");
      }

      await createBuildingInspection({
        templateId: selectedTemplateId,
        employeeId: selectedEmployeeId,
        dueDate: parsedDueDate.toISOString(),
      });

      setOpen(false);
      await loadAll();
      Alert.alert("הצלחה", "הביקורת התקופתית נוצרה בהצלחה");
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה ביצירת ביקורת");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const template = item.inspection_templates;
    const employee = item.service_employees;
    const effectiveStatus = item.effective_status || item.status;

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View
            style={[
              styles.statusBadge,
              effectiveStatus === "COMPLETED" && styles.statusCompleted,
              effectiveStatus === "OVERDUE" && styles.statusOverdue,
              effectiveStatus === "SKIPPED" && styles.statusSkipped,
            ]}
          >
            <Text style={styles.statusText}>{STATUS_LABELS[effectiveStatus] || effectiveStatus}</Text>
          </View>

          <Text style={styles.cardTitle}>{template?.name || "ביקורת ללא שם"}</Text>
        </View>

        <Text style={styles.cardText}>
          תיאור: {template?.description || "אין תיאור"}
        </Text>

        <Text style={styles.cardText}>
          עדיפות: {PRIORITY_LABELS[template?.priority] || template?.priority || "לא ידוע"}
        </Text>

        <Text style={styles.cardText}>
          עובד אחראי: {employee?.full_name || "לא שויך"}
        </Text>

        <Text style={styles.cardText}>
          תאריך יעד: {new Date(item.due_date).toLocaleString("he-IL")}
        </Text>

        {item.notes ? (
          <Text style={styles.cardText}>
            הערות אחרונות: {item.notes}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowRight size={24} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={styles.header}>ביקורות תקופתיות</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={openCreate}>
            <Text style={styles.primaryBtnText}>+ ביקורת חדשה</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color="#38bdf8" />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>אין ביקורות תקופתיות עדיין.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          />
        )}

        <Modal visible={open} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>הוספת ביקורת תקופתית</Text>

              <Text style={styles.label}>1. בחר סוג ביקורת</Text>
              <View style={styles.chipsWrap}>
                {templates.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSelectedTemplateId(t.id)}
                    style={[
                      styles.chip,
                      selectedTemplateId === t.id && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedTemplateId === t.id && styles.chipTextSelected,
                      ]}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>2. בחר עובד אחראי</Text>
              <View style={styles.chipsWrap}>
                {employees.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => setSelectedEmployeeId(e.id)}
                    style={[
                      styles.chip,
                      selectedEmployeeId === e.id && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedEmployeeId === e.id && styles.chipTextSelected,
                      ]}
                    >
                      {e.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>3. תאריך יעד (YYYY-MM-DDTHH:MM)</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="2026-04-20T10:00"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <View style={styles.modalBtnsRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setOpen(false)}>
                  <Text style={styles.secondaryBtnText}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate}>
                  <Text style={styles.primaryBtnText}>שמור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#0F172A",
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
  },
  empty: {
    marginTop: 20,
    textAlign: "center",
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
  },
  cardText: {
    color: "#cbd5e1",
    textAlign: "right",
    marginTop: 5,
  },
  statusBadge: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusCompleted: {
    backgroundColor: "#166534",
  },
  statusOverdue: {
    backgroundColor: "#991b1b",
  },
  statusSkipped: {
    backgroundColor: "#92400e",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
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
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 10,
  },
  label: {
    color: "#e2e8f0",
    textAlign: "right",
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  chipText: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  chipTextSelected: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#f8fafc",
  },
  modalBtnsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 18,
  },
  secondaryBtn: {
    backgroundColor: "#334155",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: "#f8fafc",
    fontWeight: "800",
  },
});