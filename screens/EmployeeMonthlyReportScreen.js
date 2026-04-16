import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, CalendarDays, FileText, Building2, Wrench } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { getEmployeeMonthlyReport } from "../API/jobRequestsApi";

const JOB_STATUS_LABELS = {
  PENDING: "ממתין",
  ACCEPTED: "אושר",
  DONE: "בוצע",
  REJECTED: "נדחה",
};

const DISTURBANCE_TYPE_LABELS = {
  NOISE: "רעש",
  CLEANLINESS: "לכלוך / אשפה",
  SAFETY: "בטיחות / ונדליזם",
  OTHER: "אחר",
};

function formatMonthLabel(year, month) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

function getCurrentMonthYear() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function getPreviousMonth(year, month) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

function getNextMonth(year, month) {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

function countBy(items, keyGetter) {
  const map = {};
  for (const item of items) {
    const key = keyGetter(item);
    if (!key) continue;
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

function getTopEntry(map) {
  const entries = Object.entries(map);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { key: entries[0][0], count: entries[0][1] };
}

function StatCard({ title, value, color = "#38bdf8" }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function SmallInsight({ label, value }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightValue}>{value}</Text>
      <Text style={styles.insightLabel}>{label}</Text>
    </View>
  );
}

export default function EmployeeMonthlyReportScreen({ route }) {
  const navigation = useNavigation();
  const { employeeId, employeeName } = route.params || {};

  const current = getCurrentMonthYear();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReport = async (selectedYear = year, selectedMonth = month) => {
    try {
      setLoading(true);
      const data = await getEmployeeMonthlyReport(employeeId, selectedYear, selectedMonth);
      setItems(data || []);
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "לא ניתן היה לטעון את הדוח החודשי");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadReport(year, month);
    }
  }, [employeeId, year, month]);

  const analytics = useMemo(() => {
    const totalJobs = items.length;
    const doneJobs = items.filter((item) => item.status === "DONE").length;
    const rejectedJobs = items.filter((item) => item.status === "REJECTED").length;
    const openJobs = items.filter(
      (item) => item.status === "PENDING" || item.status === "ACCEPTED"
    ).length;

    const buildingCounts = countBy(items, (item) => item.buildings?.name || "בניין לא ידוע");
    const typeCounts = countBy(
      items,
      (item) => item.disturbance_reports?.type || "OTHER"
    );
    const statusCounts = countBy(items, (item) => item.status);

    const topBuilding = getTopEntry(buildingCounts);
    const topType = getTopEntry(typeCounts);

    return {
      totalJobs,
      doneJobs,
      rejectedJobs,
      openJobs,
      buildingCounts,
      typeCounts,
      statusCounts,
      topBuilding,
      topType,
    };
  }, [items]);

  const handlePrevMonth = () => {
    const prev = getPreviousMonth(year, month);
    setYear(prev.year);
    setMonth(prev.month);
  };

  const handleNextMonth = () => {
    const next = getNextMonth(year, month);
    setYear(next.year);
    setMonth(next.month);
  };

  const renderJobCard = ({ item }) => {
    const buildingName = item.buildings?.name || "בניין לא ידוע";
    const jobStatus = JOB_STATUS_LABELS[item.status] || item.status;
    const disturbanceType =
      DISTURBANCE_TYPE_LABELS[item.disturbance_reports?.type] ||
      item.disturbance_reports?.type ||
      "לא ידוע";

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobCardHeader}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{jobStatus}</Text>
          </View>
          <Text style={styles.jobBuilding}>{buildingName}</Text>
        </View>

        <Text style={styles.jobText}>סוג תקלה: {disturbanceType}</Text>
        <Text style={styles.jobText}>
          הוראות עבודה: {item.instructions || "אין הוראות"}
        </Text>
        <Text style={styles.jobText}>
          זמן לביצוע: {item.schedule_time || "לא הוגדר"}
        </Text>
        <Text style={styles.jobDate}>
          נוצר בתאריך: {new Date(item.created_at).toLocaleString("he-IL")}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronRight size={28} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>דו"ח חודשי</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.topCard}>
          <View style={styles.iconCircle}>
            <FileText size={28} color="#3b82f6" />
          </View>
          <Text style={styles.mainTitle}>דו"ח חודשי על תקלות ועבודות</Text>
          <Text style={styles.subTitle}>
            {employeeName ? `עבור ${employeeName}` : "עבור נותן השירות המחובר"}
          </Text>

          <View style={styles.monthSelector}>
            <TouchableOpacity style={styles.monthBtn} onPress={handleNextMonth}>
              <Text style={styles.monthBtnText}>החודש הבא</Text>
            </TouchableOpacity>

            <View style={styles.monthLabelWrap}>
              <CalendarDays size={16} color="#94a3b8" />
              <Text style={styles.monthLabel}>{formatMonthLabel(year, month)}</Text>
            </View>

            <TouchableOpacity style={styles.monthBtn} onPress={handlePrevMonth}>
              <Text style={styles.monthBtnText}>החודש הקודם</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard title="סה״כ עבודות" value={analytics.totalJobs} color="#38bdf8" />
              <StatCard title="עבודות שבוצעו" value={analytics.doneJobs} color="#10b981" />
              <StatCard title="עבודות שנדחו" value={analytics.rejectedJobs} color="#ef4444" />
              <StatCard title="עדיין פתוחות" value={analytics.openJobs} color="#f59e0b" />
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>סיכום חודשי</Text>

              <SmallInsight
                label="הבניין עם הכי הרבה עבודות"
                value={
                  analytics.topBuilding
                    ? `${analytics.topBuilding.key} (${analytics.topBuilding.count})`
                    : "אין נתונים"
                }
              />

              <SmallInsight
                label="סוג התקלה הנפוץ ביותר"
                value={
                  analytics.topType
                    ? `${DISTURBANCE_TYPE_LABELS[analytics.topType.key] || analytics.topType.key} (${analytics.topType.count})`
                    : "אין נתונים"
                }
              />
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>פירוט לפי בניינים</Text>
              {Object.keys(analytics.buildingCounts).length === 0 ? (
                <Text style={styles.emptyText}>אין נתונים לחודש זה.</Text>
              ) : (
                Object.entries(analytics.buildingCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([building, count]) => (
                    <View key={building} style={styles.breakdownRow}>
                      <Text style={styles.breakdownValue}>{count}</Text>
                      <Text style={styles.breakdownLabel}>{building}</Text>
                    </View>
                  ))
              )}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>פירוט לפי סוגי תקלות</Text>
              {Object.keys(analytics.typeCounts).length === 0 ? (
                <Text style={styles.emptyText}>אין נתונים לחודש זה.</Text>
              ) : (
                Object.entries(analytics.typeCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <View key={type} style={styles.breakdownRow}>
                      <Text style={styles.breakdownValue}>{count}</Text>
                      <Text style={styles.breakdownLabel}>
                        {DISTURBANCE_TYPE_LABELS[type] || type}
                      </Text>
                    </View>
                  ))
              )}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.sectionHeader}>
                <Wrench size={18} color="#3b82f6" />
                <Text style={styles.sectionTitle}>רשימת עבודות בחודש זה</Text>
              </View>

              {items.length === 0 ? (
                <Text style={styles.emptyText}>לא נמצאו עבודות בחודש שנבחר.</Text>
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id}
                  renderItem={renderJobCard}
                  scrollEnabled={false}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
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
  topCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(59,130,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#f8fafc",
    textAlign: "center",
  },
  subTitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  monthSelector: {
    marginTop: 16,
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  monthBtn: {
    backgroundColor: "#334155",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  monthBtnText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 13,
  },
  monthLabelWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  monthLabel: {
    color: "#e2e8f0",
    fontWeight: "800",
    fontSize: 16,
  },
  statsGrid: {
    marginTop: 16,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "right",
  },
  statTitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#cbd5e1",
    textAlign: "right",
    fontWeight: "700",
  },
  summaryCard: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#f8fafc",
    textAlign: "right",
    marginBottom: 10,
  },
  insightRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  insightLabel: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  insightValue: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 10,
  },
  breakdownRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  breakdownLabel: {
    color: "#e2e8f0",
    fontSize: 14,
    textAlign: "right",
    flex: 1,
  },
  breakdownValue: {
    color: "#38bdf8",
    fontWeight: "900",
    fontSize: 15,
    marginLeft: 12,
  },
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 6,
  },
  jobCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 10,
  },
  jobCardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  jobBuilding: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
  },
  jobText: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "right",
    marginBottom: 6,
    lineHeight: 20,
  },
  jobDate: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
});