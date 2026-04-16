import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react-native";
import { getInspectionById, completeInspection, skipInspection } from "../API/inspectionsApi";

export default function EmployeeInspectionDetailsScreen({ route, navigation }) {
  const { inspectionId, employeeId } = route.params;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notes, setNotes] = useState("");
  const [createIssue, setCreateIssue] = useState(false);
  const [issueType, setIssueType] = useState("OTHER");
  const [issueSeverity, setIssueSeverity] = useState("MEDIUM");

  const loadInspection = async () => {
    try {
      setLoading(true);
      const data = await getInspectionById(inspectionId);
      setItem(data);
      setNotes(data?.notes || "");
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה בטעינת הביקורת");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspection();
  }, []);

  const handleComplete = async () => {
    try {
      setLoading(true);

      await completeInspection({
        inspectionId,
        employeeId,
        resultStatus: createIssue ? "ISSUE_FOUND" : "OK",
        notes,
        createIssueReport: createIssue,
        issueType,
        issueSeverity,
      });

      Alert.alert("הצלחה", "הביקורת הושלמה בהצלחה ונוצרה הביקורת הבאה.", [
        {
          text: "אוקיי",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה בהשלמת הביקורת");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      await skipInspection(inspectionId, employeeId, notes);

      Alert.alert("עודכן", "הביקורת סומנה כדולגה.", [
        {
          text: "אוקיי",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה בדילוג על הביקורת");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>לא נמצאו פרטי ביקורת.</Text>
      </SafeAreaView>
    );
  }

  const template = item.inspection_templates;
  const building = item.buildings;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronRight size={28} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פרטי ביקורת</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{template?.name || "ביקורת תקופתית"}</Text>
          <Text style={styles.text}>בניין: {building?.name || "לא ידוע"}</Text>
          <Text style={styles.text}>כתובת: {building?.address || "לא צוינה"}</Text>
          <Text style={styles.text}>תיאור: {template?.description || "אין תיאור"}</Text>
          <Text style={styles.text}>
            תאריך יעד: {new Date(item.due_date).toLocaleString("he-IL")}
          </Text>
        </View>

        <Text style={styles.label}>הערות ביצוע</Text>
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="כתוב כאן מה נבדק, מה נמצא, או כל פרט חשוב..."
          placeholderTextColor="#94a3b8"
          multiline
          textAlign="right"
        />

        <View style={styles.switchRow}>
          <Switch value={createIssue} onValueChange={setCreateIssue} />
          <Text style={styles.switchLabel}>נמצאה תקלה ויש לפתוח דיווח אוטומטי</Text>
        </View>

        {createIssue && (
          <View style={styles.issueBox}>
            <Text style={styles.label}>סוג התקלה</Text>
            <View style={styles.chipsWrap}>
              {["NOISE", "CLEANLINESS", "SAFETY", "OTHER"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setIssueType(type)}
                  style={[styles.chip, issueType === type && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, issueType === type && styles.chipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>חומרה</Text>
            <View style={styles.chipsWrap}>
              {["LOW", "MEDIUM", "HIGH"].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  onPress={() => setIssueSeverity(severity)}
                  style={[styles.chip, issueSeverity === severity && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, issueSeverity === severity && styles.chipTextSelected]}>
                    {severity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
              <CheckCircle2 size={22} color="white" />
              <Text style={styles.completeBtnText}>סמן כבוצע</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <AlertTriangle size={20} color="#f59e0b" />
              <Text style={styles.skipBtnText}>דלג על ביקורת</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0f172a" },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 12,
  },
  text: {
    color: "#cbd5e1",
    textAlign: "right",
    marginBottom: 8,
    lineHeight: 22,
  },
  label: {
    color: "#e2e8f0",
    textAlign: "right",
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    minHeight: 110,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    color: "#f8fafc",
    textAlignVertical: "top",
  },
  switchRow: {
    marginTop: 16,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    color: "#f8fafc",
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  issueBox: {
    marginTop: 10,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 12,
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
  actions: {
    marginTop: 24,
    gap: 12,
  },
  completeBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  completeBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
  },
  skipBtn: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  skipBtnText: {
    color: "#f59e0b",
    fontWeight: "800",
    fontSize: 16,
  },
  errorText: {
    color: "#f87171",
    marginTop: 40,
    textAlign: "center",
    fontSize: 16,
  },
});