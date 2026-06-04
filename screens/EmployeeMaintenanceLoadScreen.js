import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Image, Dimensions } from 'react-native';
import ActivityIndicator from '../components/CustomLoader';
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
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
  const navigation = useNavigation();
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
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Image
          source={require('../assets/app_internal_bg.png')}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: Dimensions.get('screen').width,
            height: Dimensions.get('screen').height,
          }}
          resizeMode="cover"
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>טוען תחזית עומסי בניינים...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Image
          source={require('../assets/app_internal_bg.png')}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: Dimensions.get('screen').width,
            height: Dimensions.get('screen').height,
          }}
          resizeMode="cover"
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Text style={styles.errorTitle}>שגיאה</Text>
            <Text style={styles.errorText}>{error}</Text>

            <TouchableOpacity style={styles.retryButton} onPress={loadPredictions}>
              <Text style={styles.retryButtonText}>נסה שוב</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Image
          source={require('../assets/app_internal_bg.png')}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: Dimensions.get('screen').width,
            height: Dimensions.get('screen').height,
          }}
          resizeMode="cover"
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Text style={styles.emptyTitle}>אין תחזיות זמינות</Text>
            <Text style={styles.emptyText}>
              לא נמצאו תחזיות עומס תחזוקתי. יש לוודא שהמודל הורץ ושנוצרו נתונים בטבלה החדשה.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const weekStart = items[0]?.target_week_start;
  const weekEnd = items[0]?.target_week_end;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Image
        source={require('../assets/app_internal_bg.png')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: Dimensions.get('screen').width,
          height: Dimensions.get('screen').height,
        }}
        resizeMode="cover"
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronRight size={28} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>תחזית עומס תחזוקתי</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.container}>
          <View style={styles.headerBox}>
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
              <Text style={[styles.summaryNumber, { color: "#ef4444" }]}>{summary.high}</Text>
              <Text style={styles.summaryLabel}>עומס גבוה</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: "#f97316" }]}>{summary.medium}</Text>
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
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

                  <Text style={styles.cardSectionTitle}>תחומי טיפול צפויים</Text>
                  <Text style={styles.bodyText}>
                    {formatIssueTypes(item.expected_issue_types)}
                  </Text>

                  <Text style={styles.cardSectionTitle}>הסבר</Text>
                  <Text style={styles.bodyText}>
                    {item.explanation || "לא קיים הסבר עבור תחזית זו."}
                  </Text>

                  <Text style={styles.cardSectionTitle}>המלצה לתכנון משמרת</Text>
                  <Text style={styles.bodyText}>
                    {item.recommended_staffing_action ||
                      "אין המלצה זמינה עבור תחזית זו."}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      </SafeAreaView>
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
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: 'transparent',
  },
  loadingText: {
    color: "#cbd5e1",
    marginTop: 12,
    fontSize: 15,
    textAlign: "center",
  },
  headerBox: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    marginTop: 2,
    textAlign: "right",
  },
  employeeText: {
    color: "#f97316",
    fontSize: 13,
    marginTop: 6,
    textAlign: "right",
    fontWeight: "700",
  },
  description: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "right",
  },
  summaryBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    color: "#cbd5e1",
    fontSize: 20,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#94a3b8",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  filterButtonActive: {
    backgroundColor: "#f97316",
    borderColor: "#f97316",
  },
  filterButtonText: {
    color: "#cbd5e1",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  list: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderRightWidth: 4,
  },
  highCard: {
    borderColor: "#f97316",
    borderRightColor: "#f97316",
  },
  mediumCard: {
    borderColor: "rgba(249, 115, 22, 0.6)",
    borderRightColor: "rgba(249, 115, 22, 0.6)",
  },
  lowCard: {
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRightColor: "rgba(255, 255, 255, 0.3)",
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
    borderWidth: 1,
  },
  highBadge: {
    color: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  mediumBadge: {
    color: "#f97316",
    backgroundColor: "rgba(249, 115, 22, 0.16)",
    borderColor: "rgba(249, 115, 22, 0.3)",
  },
  lowBadge: {
    color: "#cbd5e1",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  metricsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
  cardSectionTitle: {
    color: "#cbd5e1",
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
    color: "#ef4444",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  errorText: {
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#f97316",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyFilterText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 24,
  },
});