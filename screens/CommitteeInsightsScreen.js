import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { getBuildingDisturbanceReports } from "../API/disturbancesApi";
import { getAllBuildingRequests } from "../API/requestsApi";

const DISTURBANCE_TYPE_LABELS = {
  NOISE: "רעש",
  CLEANLINESS: "לכלוך / אשפה",
  SAFETY: "בטיחות / ונדליזם",
  OTHER: "אחר",
};

const DISTURBANCE_SEVERITY_LABELS = {
  LOW: "נמוכה",
  MEDIUM: "בינונית",
  HIGH: "גבוהה",
};

const REQUEST_CATEGORY_LABELS = {
  ITEM_LOAN: "השאלת ציוד",
  PHYSICAL_HELP: "עזרה פיזית",
  INFO: "מידע",
  OTHER: "אחר",
};

const REQUEST_STATUS_LABELS = {
  OPEN: "פתוחה",
  CANCELLED: "בוטלה",
  EXPIRED: "פגה",
  COMPLETED: "טופלה",
};

const DISTURBANCE_STATUS_LABELS = {
  OPEN: "פתוח",
  IN_PROGRESS: "בטיפול",
  RESOLVED: "נפתר",
  REJECTED: "נדחה",
};

const WEEKDAY_LABELS = [
  "יום א'",
  "יום ב'",
  "יום ג'",
  "יום ד'",
  "יום ה'",
  "יום ו'",
  "שבת",
];

function safeDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function countBy(items, getKey) {
  const map = {};
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

function getTopEntry(countMap) {
  const entries = Object.entries(countMap);
  if (!entries.length) return null;

  entries.sort((a, b) => b[1] - a[1]);
  return {
    key: entries[0][0],
    count: entries[0][1],
  };
}

function formatHours(hours) {
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return "אין מספיק נתונים";
  }

  if (hours < 24) {
    return `${hours.toFixed(1)} שעות`;
  }

  const days = hours / 24;
  return `${days.toFixed(1)} ימים`;
}

function calcAverageResolutionHours(items, options = {}) {
  const {
    startField = "created_at",
    endField = "updated_at",
    resolvedStatuses = [],
  } = options;

  const resolvedItems = items.filter((item) =>
    resolvedStatuses.includes(item.status)
  );

  if (!resolvedItems.length) return null;

  const diffs = resolvedItems
    .map((item) => {
      const start = safeDate(item[startField]);
      const end = safeDate(item[endField]);
      if (!start || !end) return null;

      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return diffHours >= 0 ? diffHours : null;
    })
    .filter((v) => v !== null);

  if (!diffs.length) return null;

  const avg = diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
  return avg;
}

function getMaxCount(countMap) {
  const values = Object.values(countMap);
  if (!values.length) return 1;
  return Math.max(...values, 1);
}

function SimpleBarChart({ title, dataMap, labelsMap = {}, emptyText = "אין נתונים להצגה" }) {
  const entries = Object.entries(dataMap || {});
  const maxCount = getMaxCount(dataMap || {});

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>

      {!entries.length ? (
        <Text style={styles.emptyChart}>{emptyText}</Text>
      ) : (
        entries
          .sort((a, b) => b[1] - a[1])
          .map(([key, value]) => {
            const widthPercent = `${(value / maxCount) * 100}%`;
            const label = labelsMap[key] || key;

            return (
              <View key={key} style={styles.barRow}>
                <Text style={styles.barLabel}>{label}</Text>

                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: widthPercent }]} />
                </View>

                <Text style={styles.barValue}>{value}</Text>
              </View>
            );
          })
      )}
    </View>
  );
}

function StatCard({ label, value, subValue }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {!!subValue && <Text style={styles.statSub}>{subValue}</Text>}
    </View>
  );
}

export default function CommitteeInsightsScreen() {
  const [disturbances, setDisturbances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function loadAll() {
    try {
      setError(null);
      setLoading(true);

      const [disturbanceData, requestData] = await Promise.all([
        getBuildingDisturbanceReports(),
        getAllBuildingRequests(),
      ]);

      setDisturbances(disturbanceData || []);
      setRequests(requestData || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "שגיאה בטעינת הסטטיסטיקות");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      const [disturbanceData, requestData] = await Promise.all([
        getBuildingDisturbanceReports(),
        getAllBuildingRequests(),
      ]);

      setDisturbances(disturbanceData || []);
      setRequests(requestData || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "שגיאה ברענון הנתונים");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const analytics = useMemo(() => {
    const totalDisturbances = disturbances.length;
    const totalRequests = requests.length;

    const openDisturbances = disturbances.filter(
      (item) => item.status === "OPEN" || item.status === "IN_PROGRESS"
    ).length;

    const resolvedDisturbances = disturbances.filter(
      (item) => item.status === "RESOLVED"
    ).length;

    const openRequests = requests.filter((item) => item.status === "OPEN").length;
    const completedRequests = requests.filter(
      (item) => item.status === "COMPLETED"
    ).length;

    const disturbanceTypeCounts = countBy(disturbances, (item) => item.type);
    const disturbanceSeverityCounts = countBy(disturbances, (item) => item.severity);
    const disturbanceStatusCounts = countBy(disturbances, (item) => item.status);

    const requestCategoryCounts = countBy(requests, (item) => item.category);
    const requestStatusCounts = countBy(requests, (item) => item.status);

    const weekdayCounts = countBy(disturbances, (item) => {
      const d = safeDate(item.created_at || item.occurred_at);
      if (!d) return null;
      return String(d.getDay());
    });

    const hourCounts = countBy(disturbances, (item) => {
      const d = safeDate(item.created_at || item.occurred_at);
      if (!d) return null;
      return `${String(d.getHours()).padStart(2, "0")}:00`;
    });

    const topDisturbanceType = getTopEntry(disturbanceTypeCounts);
    const topRequestCategory = getTopEntry(requestCategoryCounts);
    const busiestDay = getTopEntry(weekdayCounts);
    const busiestHour = getTopEntry(hourCounts);

    const avgRequestResolutionHours = calcAverageResolutionHours(requests, {
      startField: "created_at",
      endField: "closed_at",
      resolvedStatuses: ["COMPLETED"],
    });

    const avgDisturbanceResolutionHours = calcAverageResolutionHours(disturbances, {
      startField: "created_at",
      endField: "updated_at",
      resolvedStatuses: ["RESOLVED"],
    });

    const totalHighSeverity = disturbances.filter(
      (item) => item.severity === "HIGH"
    ).length;

    const highSeverityRate = totalDisturbances
      ? ((totalHighSeverity / totalDisturbances) * 100).toFixed(1)
      : "0.0";

    return {
      totalDisturbances,
      totalRequests,
      openDisturbances,
      resolvedDisturbances,
      openRequests,
      completedRequests,
      disturbanceTypeCounts,
      disturbanceSeverityCounts,
      disturbanceStatusCounts,
      requestCategoryCounts,
      requestStatusCounts,
      topDisturbanceType,
      topRequestCategory,
      busiestDay,
      busiestHour,
      avgRequestResolutionHours,
      avgDisturbanceResolutionHours,
      highSeverityRate,
    };
  }, [disturbances, requests]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>טוען נתוני סטטיסטיקה...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>שגיאה: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.header}>דשבורד סטטיסטיקות ועד הבית</Text>
      <Text style={styles.subHeader}>
        מבט חכם על מטרדים ובקשות לצורך זיהוי דפוסים ושיפור ניהול הבניין
      </Text>

      <View style={styles.statsGrid}>
        <StatCard label="סה״כ מטרדים" value={analytics.totalDisturbances} />
        <StatCard label="סה״כ בקשות" value={analytics.totalRequests} />
        <StatCard label="מטרדים פתוחים" value={analytics.openDisturbances} />
        <StatCard label="בקשות פתוחות" value={analytics.openRequests} />
        <StatCard label="מטרדים שנפתרו" value={analytics.resolvedDisturbances} />
        <StatCard label="בקשות שטופלו" value={analytics.completedRequests} />
        <StatCard label="אחוז מטרדים חמורים" value={`${analytics.highSeverityRate}%`} />
        <StatCard
          label="שעת עומס נפוצה"
          value={analytics.busiestHour ? analytics.busiestHour.key : "אין"}
        />
      </View>

      <View style={styles.insightBox}>
        <Text style={styles.insightTitle}>תובנות מרכזיות</Text>

        <Text style={styles.insightText}>
          סוג המטרד הנפוץ ביותר:{" "}
          {analytics.topDisturbanceType
            ? `${DISTURBANCE_TYPE_LABELS[analytics.topDisturbanceType.key] || analytics.topDisturbanceType.key} (${analytics.topDisturbanceType.count})`
            : "אין מספיק נתונים"}
        </Text>

        <Text style={styles.insightText}>
          סוג הבקשה הנפוץ ביותר:{" "}
          {analytics.topRequestCategory
            ? `${REQUEST_CATEGORY_LABELS[analytics.topRequestCategory.key] || analytics.topRequestCategory.key} (${analytics.topRequestCategory.count})`
            : "אין מספיק נתונים"}
        </Text>

        <Text style={styles.insightText}>
          היום העמוס ביותר בדיווחי מטרד:{" "}
          {analytics.busiestDay
            ? `${WEEKDAY_LABELS[Number(analytics.busiestDay.key)]} (${analytics.busiestDay.count})`
            : "אין מספיק נתונים"}
        </Text>

        <Text style={styles.insightText}>
          זמן טיפול ממוצע בבקשות שהושלמו:{" "}
          {formatHours(analytics.avgRequestResolutionHours)}
        </Text>

        <Text style={styles.insightText}>
          זמן פתרון ממוצע למטרדים שנפתרו:{" "}
          {formatHours(analytics.avgDisturbanceResolutionHours)}
        </Text>
      </View>

      <SimpleBarChart
        title="התפלגות מטרדים לפי סוג"
        dataMap={analytics.disturbanceTypeCounts}
        labelsMap={DISTURBANCE_TYPE_LABELS}
      />

      <SimpleBarChart
        title="התפלגות מטרדים לפי חומרה"
        dataMap={analytics.disturbanceSeverityCounts}
        labelsMap={DISTURBANCE_SEVERITY_LABELS}
      />

      <SimpleBarChart
        title="התפלגות מטרדים לפי סטטוס"
        dataMap={analytics.disturbanceStatusCounts}
        labelsMap={DISTURBANCE_STATUS_LABELS}
      />

      <SimpleBarChart
        title="התפלגות בקשות לפי קטגוריה"
        dataMap={analytics.requestCategoryCounts}
        labelsMap={REQUEST_CATEGORY_LABELS}
      />

      <SimpleBarChart
        title="התפלגות בקשות לפי סטטוס"
        dataMap={analytics.requestStatusCounts}
        labelsMap={REQUEST_STATUS_LABELS}
      />

      <SimpleBarChart
        title="עומס דיווחי מטרד לפי יום בשבוע"
        dataMap={analytics.disturbanceTypeCounts && Object.fromEntries(
          Object.entries(countBy(disturbances, (item) => {
            const d = safeDate(item.created_at || item.occurred_at);
            if (!d) return null;
            return String(d.getDay());
          })).sort((a, b) => Number(a[0]) - Number(b[0]))
        )}
        labelsMap={{
          0: "יום א'",
          1: "יום ב'",
          2: "יום ג'",
          3: "יום ד'",
          4: "יום ה'",
          5: "יום ו'",
          6: "שבת",
        }}
      />

      <SimpleBarChart
        title="עומס דיווחי מטרד לפי שעה"
        dataMap={countBy(disturbances, (item) => {
          const d = safeDate(item.created_at || item.occurred_at);
          if (!d) return null;
          return `${String(d.getHours()).padStart(2, "0")}:00`;
        })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: "#cbd5e1",
    fontSize: 14,
  },
  header: {
    fontSize: 24,
    fontWeight: "900",
    color: "#f8fafc",
    textAlign: "right",
  },
  subHeader: {
    marginTop: 8,
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "right",
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 18,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#38bdf8",
    textAlign: "right",
  },
  statLabel: {
    marginTop: 6,
    fontSize: 13,
    color: "#e2e8f0",
    textAlign: "right",
    fontWeight: "700",
  },
  statSub: {
    marginTop: 4,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
  },
  insightBox: {
    marginTop: 8,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#f8fafc",
    textAlign: "right",
    marginBottom: 10,
  },
  insightText: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "right",
    marginTop: 8,
    lineHeight: 22,
  },
  chartCard: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#f8fafc",
    textAlign: "right",
    marginBottom: 14,
  },
  emptyChart: {
    color: "#94a3b8",
    textAlign: "center",
  },
  barRow: {
    marginBottom: 12,
  },
  barLabel: {
    color: "#e2e8f0",
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  barTrack: {
    height: 10,
    backgroundColor: "#0f172a",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#38bdf8",
    borderRadius: 999,
  },
  barValue: {
    color: "#94a3b8",
    textAlign: "left",
    marginTop: 4,
    fontSize: 12,
  },
  error: {
    color: "#f87171",
    fontSize: 15,
    textAlign: "center",
  },
});