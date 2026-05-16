import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { getServiceEmployeeBuildingLoadPredictions } from "../API/serviceEmployeeMaintenanceLoadApi";

const LOAD_LABELS = {
  LOW: "נמוך",
  MEDIUM: "בינוני",
  HIGH: "גבוה",
};

const TYPE_LABELS = {
  NOISE: "רעש",
  CLEANLINESS: "ניקיון / אשפה",
  SAFETY: "בטיחות",
  OTHER: "אחר",
};

export default function EmployeeMaintenanceLoadScreen({ route }) {
  const { employeeId, employeeName } = route.params || {};

  const [items, setItems] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadPredictions = async () => {
    if (!employeeId) {
      setError("לא התקבל מזהה נותן שירות.");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await getServiceEmployeeBuildingLoadPredictions(employeeId);
      setItems(data || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "שגיאה בטעינת תחזית עומסי הבניינים");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const data = await getServiceEmployeeBuildingLoadPredictions(employeeId);
      setItems(data || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "שגיאה בריענון תחזית עומסי הבניינים");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadPredictions();
    }
  }, [employeeId]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === "ALL") {
      return items;
    }

    return items.filter((item) => item.load_level === selectedFilter);
  }, [items, selectedFilter]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      high: items.filter((item) => item.load_level === "HIGH").length,
      medium: items.filter((item) => item.load_level === "MEDIUM").length,
      low: items.filter((item) => item.load_level === "LOW").length,
      estimatedStaff: items.reduce(
        (sum, item) => sum + Number(item.estimated_staff_members || 0),
        0
      ),
    };
  }, [items]);

  const getCardStyle = (level) => {
    switch (level) {
      case "HIGH":
        return styles.highCard;
      case "MEDIUM":
        return styles.mediumCard;
      default:
        return styles.lowCard;
    }
  };

  const getBadgeStyle = (level) => {
    switch (level) {
      case "HIGH":
        return styles.highBadge;
      case "MEDIUM":
        return styles.mediumBadge;
      default:
        return styles.lowBadge;
    }
  };

  const formatPercent = (value) => {
    const num = Number(value || 0);
    return `${Math.round(num * 100)}%`;
  };

  const formatIssueTypes = (types) => {
    if (!types || !Array.isArray(types) || !types.length) {
      return "לא זוהו תחומי טיפול צפויים";
    }

    return types.map((type) => TYPE_LABELS[type] || type).join(", ");
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>טוען תחזית עומסי בניינים...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>שגיאה</Text>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity style={styles.retryButton} onPress={loadPredictions}>
          <Text style={styles.retryButtonText}>נסה שוב</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>אין תחזיות זמינות</Text>
        <Text style={styles.emptyText}>
          לא נמצאו תחזיות עומס תחזוקתי. יש לוודא שהמודל הורץ ושנוצרו נתונים בטבלה החדשה.
        </Text>
      </View>
    );
  }

  const weekStart = items[0]?.target_week_start;
  const weekEnd = items[0]?.target_week_end;

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>תחזית עומס תחזוקתי</Text>

        <Text style={styles.subtitle}>
          שבוע חזוי: {weekStart} עד {weekEnd}
        </Text>

        {!!employeeName && (
          <Text style={styles.employeeText}>נותן שירות: {employeeName}</Text>
        )}

        <Text style={styles.description}>
          המסך מציג אילו בניינים צפויים לעומס תחזוקתי ומסייע לתכנון משמרות וטיפול מקדים.
        </Text>
      </View>

      <View style={styles.summaryBox}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>בניינים</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{summary.high}</Text>
          <Text style={styles.summaryLabel}>עומס גבוה</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{summary.medium}</Text>
          <Text style={styles.summaryLabel}>עומס בינוני</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{summary.estimatedStaff}</Text>
          <Text style={styles.summaryLabel}>אנשי צוות</Text>
        </View>
      </View>

      <View style={styles.filtersRow}>
        <FilterButton
          label="הכל"
          active={selectedFilter === "ALL"}
          onPress={() => setSelectedFilter("ALL")}
        />

        <FilterButton
          label="גבוה"
          active={selectedFilter === "HIGH"}
          onPress={() => setSelectedFilter("HIGH")}
        />

        <FilterButton
          label="בינוני"
          active={selectedFilter === "MEDIUM"}
          onPress={() => setSelectedFilter("MEDIUM")}
        />

        <FilterButton
          label="נמוך"
          active={selectedFilter === "LOW"}
          onPress={() => setSelectedFilter("LOW")}
        />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyFilterText}>
            אין בניינים שתואמים לסינון הנוכחי.
          </Text>
        }
        renderItem={({ item }) => {
          const buildingName = item.buildings?.name || "בניין ללא שם";

          const buildingAddress = [
            item.buildings?.address,
            item.buildings?.city,
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <View style={[styles.card, getCardStyle(item.load_level)]}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeWrapper}>
                  <Text style={[styles.badge, getBadgeStyle(item.load_level)]}>
                    עומס {LOAD_LABELS[item.load_level] || item.load_level}
                  </Text>
                </View>

                <View style={styles.buildingInfo}>
                  <Text style={styles.buildingName}>{buildingName}</Text>

                  {!!buildingAddress && (
                    <Text style={styles.buildingAddress}>
                      {buildingAddress}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>
                    {formatPercent(item.total_load_score)}
                  </Text>
                  <Text style={styles.metricLabel}>ציון עומס</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>
                    {item.estimated_staff_members}
                  </Text>
                  <Text style={styles.metricLabel}>אנשי צוות</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>
                    {item.predicted_issues_count}
                  </Text>
                  <Text style={styles.metricLabel}>תחומי טיפול</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>תחומי טיפול צפויים</Text>
              <Text style={styles.bodyText}>
                {formatIssueTypes(item.expected_issue_types)}
              </Text>

              <Text style={styles.sectionTitle}>הסבר</Text>
              <Text style={styles.bodyText}>
                {item.explanation || "לא קיים הסבר עבור תחזית זו."}
              </Text>

              <Text style={styles.sectionTitle}>המלצה לתכנון משמרת</Text>
              <Text style={styles.bodyText}>
                {item.recommended_staffing_action ||
                  "אין המלצה זמינה עבור תחזית זו."}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

function FilterButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterButtonText,
          active && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },

  centerContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    color: "#cbd5e1",
    marginTop: 12,
    fontSize: 15,
    textAlign: "center",
  },

  headerBox: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },

  title: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "right",
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 6,
    textAlign: "right",
  },

  employeeText: {
    color: "#38bdf8",
    fontSize: 13,
    marginTop: 6,
    textAlign: "right",
    fontWeight: "700",
  },

  description: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "right",
  },

  summaryBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 8,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryNumber: {
    color: "#38bdf8",
    fontSize: 20,
    fontWeight: "900",
  },

  summaryLabel: {
    color: "#cbd5e1",
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },

  filtersRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 6,
  },

  filterButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },

  filterButtonActive: {
    backgroundColor: "#38bdf8",
    borderColor: "#38bdf8",
  },

  filterButtonText: {
    color: "#cbd5e1",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
  },

  filterButtonTextActive: {
    color: "#0f172a",
  },

  list: {
    padding: 16,
    paddingBottom: 30,
  },

  card: {
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
  },

  highCard: {
    backgroundColor: "#3f1518",
    borderColor: "#ef4444",
  },

  mediumCard: {
    backgroundColor: "#3b2f0b",
    borderColor: "#f59e0b",
  },

  lowCard: {
    backgroundColor: "#132a13",
    borderColor: "#2d6a4f",
  },

  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  buildingInfo: {
    flex: 1,
  },

  buildingName: {
    color: "#f8fafc",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "right",
  },

  buildingAddress: {
    color: "#cbd5e1",
    fontSize: 13,
    marginTop: 4,
    textAlign: "right",
  },

  badgeWrapper: {
    alignItems: "flex-start",
  },

  badge: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "900",
  },

  highBadge: {
    color: "#fee2e2",
    backgroundColor: "#991b1b",
  },

  mediumBadge: {
    color: "#fef3c7",
    backgroundColor: "#92400e",
  },

  lowBadge: {
    color: "#dcfce7",
    backgroundColor: "#166534",
  },

  metricsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 14,
  },

  metricBox: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },

  metricValue: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
  },

  metricLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 3,
    textAlign: "center",
  },

  sectionTitle: {
    color: "#e2e8f0",
    marginTop: 13,
    marginBottom: 5,
    textAlign: "right",
    fontWeight: "900",
    fontSize: 14,
  },

  bodyText: {
    color: "#f8fafc",
    textAlign: "right",
    lineHeight: 21,
    fontSize: 14,
  },

  errorTitle: {
    color: "#f87171",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  errorText: {
    color: "#fecaca",
    textAlign: "center",
    lineHeight: 22,
  },

  retryButton: {
    marginTop: 16,
    backgroundColor: "#38bdf8",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },

  retryButtonText: {
    color: "#0f172a",
    fontWeight: "900",
  },

  emptyTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },

  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },

  emptyFilterText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 24,
  },
});