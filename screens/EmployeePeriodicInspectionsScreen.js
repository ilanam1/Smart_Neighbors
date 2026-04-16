import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, ShieldCheck, Clock } from "lucide-react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { getEmployeePeriodicInspections } from "../API/inspectionsApi";

const STATUS_LABELS = {
  PENDING: "ממתין",
  COMPLETED: "בוצע",
  OVERDUE: "באיחור",
  SKIPPED: "דולג",
};

const PRIORITY_LABELS = {
  LOW: "נמוכה",
  MEDIUM: "בינונית",
  HIGH: "גבוהה",
};

export default function EmployeePeriodicInspectionsScreen({ route }) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { employeeId } = route.params;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const data = await getEmployeePeriodicInspections(employeeId);
      setItems(data || []);
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה בטעינת הביקורות");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadInspections();
    }
  }, [isFocused]);

  const renderItem = ({ item }) => {
    const template = item.inspection_templates;
    const building = item.buildings;
    const effectiveStatus = item.effective_status || item.status;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("EmployeeInspectionDetails", {
            inspectionId: item.id,
            employeeId,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.statusBadge,
              effectiveStatus === "OVERDUE" && styles.statusOverdue,
              effectiveStatus === "COMPLETED" && styles.statusCompleted,
              effectiveStatus === "SKIPPED" && styles.statusSkipped,
            ]}
          >
            <Text style={styles.statusText}>
              {STATUS_LABELS[effectiveStatus] || effectiveStatus}
            </Text>
          </View>

          <Text style={styles.title}>{template?.name || "ביקורת"}</Text>
        </View>

        <Text style={styles.text}>בניין: {building?.name || "לא ידוע"}</Text>
        <Text style={styles.text}>
          עדיפות: {PRIORITY_LABELS[template?.priority] || template?.priority || "לא ידוע"}
        </Text>
        <Text style={styles.text}>
          תאריך יעד: {new Date(item.due_date).toLocaleString("he-IL")}
        </Text>

        <View style={styles.bottomRow}>
          <Clock size={14} color="#94a3b8" />
          <Text style={styles.bottomText}>לחץ לפתיחת הביקורת</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronRight size={28} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ביקורות תקופתיות</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <ShieldCheck size={48} color="#475569" />
            <Text style={styles.emptyText}>אין לך ביקורות תקופתיות כרגע.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingBottom: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f8fafc",
    textAlign: "right",
  },
  text: {
    color: "#cbd5e1",
    textAlign: "right",
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  bottomText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusOverdue: {
    backgroundColor: "#991b1b",
  },
  statusCompleted: {
    backgroundColor: "#166534",
  },
  statusSkipped: {
    backgroundColor: "#92400e",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});