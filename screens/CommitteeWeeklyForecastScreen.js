import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { getWeeklyDisturbancePredictions } from "../API/weeklyPredictionsApi";

const TYPE_LABELS = {
  NOISE: "רעש",
  CLEANLINESS: "לכלוך / אשפה",
  SAFETY: "בטיחות / ונדליזם",
  OTHER: "אחר",
};

const RISK_LABELS = {
  LOW: "נמוך",
  MEDIUM: "בינוני",
  HIGH: "גבוה",
};

export default function CommitteeWeeklyForecastScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadPredictions = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getWeeklyDisturbancePredictions();
      setItems(data || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "שגיאה בטעינת התחזית השבועית");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getWeeklyDisturbancePredictions();
      setItems(data || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "שגיאה בריענון התחזית");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const riskCardStyle = (riskLevel) => {
    switch (riskLevel) {
      case "HIGH":
        return styles.highRisk;
      case "MEDIUM":
        return styles.mediumRisk;
      default:
        return styles.lowRisk;
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 30 }} color="#38bdf8" />;
  }

  if (error) {
    return <Text style={styles.error}>שגיאה: {error}</Text>;
  }

  if (!items.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>
          עדיין אין תחזיות זמינות. יש להריץ תחילה את מנגנון האימון והחיזוי.
        </Text>
      </View>
    );
  }

  const weekStart = items[0]?.target_week_start;
  const weekEnd = items[0]?.target_week_end;

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.header}>תחזית שבועית למטרדים</Text>
        <Text style={styles.subHeader}>
          שבוע חזוי: {weekStart} עד {weekEnd}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, riskCardStyle(item.risk_level)]}>
            <View style={styles.rowBetween}>
              <Text style={styles.typeText}>
                {TYPE_LABELS[item.disturbance_type] || item.disturbance_type}
              </Text>
              <Text style={styles.riskText}>
                רמת סיכון: {RISK_LABELS[item.risk_level] || item.risk_level}
              </Text>
            </View>

            <Text style={styles.probability}>
              הסתברות חזויה: {Math.round(Number(item.probability) * 100)}%
            </Text>

            <Text style={styles.sectionTitle}>הסבר</Text>
            <Text style={styles.body}>{item.explanation}</Text>

            <Text style={styles.sectionTitle}>המלצה</Text>
            <Text style={styles.body}>{item.recommended_action}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  headerBox: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  header: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "right",
  },
  subHeader: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 6,
    textAlign: "right",
  },
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  lowRisk: {
    backgroundColor: "#132a13",
    borderColor: "#2d6a4f",
  },
  mediumRisk: {
    backgroundColor: "#3b2f0b",
    borderColor: "#f59e0b",
  },
  highRisk: {
    backgroundColor: "#3f1518",
    borderColor: "#ef4444",
  },
  rowBetween: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  typeText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
  },
  riskText: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  probability: {
    color: "#e2e8f0",
    marginTop: 8,
    textAlign: "right",
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#cbd5e1",
    marginTop: 10,
    marginBottom: 4,
    textAlign: "right",
    fontWeight: "900",
  },
  body: {
    color: "#f8fafc",
    textAlign: "right",
    lineHeight: 20,
  },
  error: {
    marginTop: 20,
    color: "#f87171",
    textAlign: "center",
  },
  empty: {
    marginTop: 30,
    color: "#94a3b8",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});