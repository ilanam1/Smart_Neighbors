import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart3, TrendingUp, PackageSearch } from "lucide-react-native";
import { getEquipmentPopularityForecast } from "../API/adminEquipmentReportsApi";

export default function AdminEquipmentPopularityReportScreen({ route }) {
  const { buildingId, buildingName } = route.params || {};

  const [daysBack, setDaysBack] = useState(90);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport(selectedDays = daysBack) {
    try {
      setLoading(true);
      setError("");

      const data = await getEquipmentPopularityForecast(buildingId, selectedDays);
      setRows(data || []);
    } catch (err) {
      console.error("Equipment forecast report error:", err);
      setError("אירעה שגיאה בטעינת דוח פופולריות הציוד.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(daysBack);
  }, [buildingId]);

  function changeRange(value) {
    setDaysBack(value);
    loadReport(value);
  }

  const topCategory = rows?.[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BarChart3 size={28} color="#22d3ee" />
          <Text style={styles.title}>דוח פופולריות ציוד</Text>
          <Text style={styles.subtitle}>
            חיזוי קטגוריות מבוקשות לפי היסטוריית השאלות בבניין
          </Text>
        </View>

        <View style={styles.filtersRow}>
          {[30, 90, 180].map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterButton, daysBack === value && styles.filterButtonActive]}
              onPress={() => changeRange(value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  daysBack === value && styles.filterButtonTextActive,
                ]}
              >
                {value} ימים
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#22d3ee" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <PackageSearch size={42} color="#94a3b8" />
            <Text style={styles.emptyTitle}>אין עדיין מספיק נתוני השאלות</Text>
            <Text style={styles.emptySubtitle}>
              לאחר שיצטברו בקשות השאלה, המערכת תציג תחזית פופולריות.
            </Text>
          </View>
        ) : (
          <>
            {topCategory && (
              <View style={styles.highlightCard}>
                <TrendingUp size={24} color="#10b981" />
                <Text style={styles.highlightTitle}>הקטגוריה המובילה</Text>
                <Text style={styles.highlightName}>{topCategory.category_name}</Text>
                <Text style={styles.highlightText}>
                  ציון ביקוש: {topCategory.demand_score} · {topCategory.forecast_label}
                </Text>
              </View>
            )}

            {rows.map((item, index) => (
              <View key={item.category_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.rank}>#{index + 1}</Text>
                  <View style={styles.cardTitleBox}>
                    <Text style={styles.categoryName}>{item.category_name}</Text>
                    <Text style={styles.forecastLabel}>{item.forecast_label}</Text>
                  </View>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.total_requests}</Text>
                    <Text style={styles.statLabel}>בקשות</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.recent_requests}</Text>
                    <Text style={styles.statLabel}>בחודש האחרון</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.active_items}</Text>
                    <Text style={styles.statLabel}>פריטים בבניין</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{item.success_rate || 0}%</Text>
                    <Text style={styles.statLabel}>אחוז הצלחה</Text>
                  </View>
                </View>

                <View style={styles.scoreBox}>
                  <Text style={styles.scoreText}>ציון ביקוש חכם: {item.demand_score}</Text>
                </View>

                <Text style={styles.recommendation}>{item.recommendation}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#051121" },
  content: { padding: 18, paddingBottom: 40 },

  header: {
    alignItems: "center",
    marginBottom: 22,
  },
  title: {
    color: "#f8fafc",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },

  filtersRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#0c1f38",
    borderWidth: 1,
    borderColor: "rgba(51,65,85,0.7)",
  },
  filterButtonActive: {
    backgroundColor: "#22d3ee",
  },
  filterButtonText: {
    color: "#cbd5e1",
    fontWeight: "800",
  },
  filterButtonTextActive: {
    color: "#051121",
  },

  highlightCard: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.35)",
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    marginBottom: 18,
  },
  highlightTitle: {
    color: "#a7f3d0",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  highlightName: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  highlightText: {
    color: "#cbd5e1",
    fontSize: 13,
    marginTop: 5,
  },

  card: {
    backgroundColor: "#0c1f38",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(51,65,85,0.55)",
  },
  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  rank: {
    color: "#22d3ee",
    fontSize: 18,
    fontWeight: "900",
  },
  cardTitleBox: {
    alignItems: "flex-end",
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    color: "#f8fafc",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "right",
  },
  forecastLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },

  statsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
  },
  statBox: {
    width: "47%",
    backgroundColor: "rgba(15,23,42,0.7)",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },

  scoreBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(34,211,238,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.25)",
    alignItems: "flex-end",
  },
  scoreText: {
    color: "#67e8f9",
    fontWeight: "900",
    textAlign: "right",
  },
  recommendation: {
    color: "#cbd5e1",
    fontSize: 13,
    marginTop: 12,
    lineHeight: 21,
    textAlign: "right",
  },

  emptyBox: {
    alignItems: "center",
    marginTop: 50,
    padding: 20,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
  },
  emptySubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    color: "#fb7185",
    textAlign: "center",
    marginTop: 30,
    fontWeight: "700",
  },
});