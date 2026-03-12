import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from "react-native";
import { getOpenRequests } from "../API/requestsApi";

export default function CommitteeRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await getOpenRequests();

        if (mounted) {
          setRequests(data || []);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setError(e.message || "שגיאה בטעינת הבקשות");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  function formatCategory(category) {
    switch (category) {
      case "ITEM_LOAN":
        return "השאלת ציוד";
      case "PHYSICAL_HELP":
        return "עזרה פיזית";
      case "INFO":
        return "מידע";
      case "OTHER":
        return "אחר";
      default:
        return category || "לא ידוע";
    }
  }

  function formatUrgency(urgency) {
    switch (urgency) {
      case "LOW":
        return "נמוכה";
      case "MEDIUM":
        return "בינונית";
      case "HIGH":
        return "גבוהה";
      default:
        return urgency || "לא ידוע";
    }
  }

  function formatDate(date) {
    try {
      return new Date(date).toLocaleString("he-IL");
    } catch {
      return date;
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#38bdf8" />;
  }

  if (error) {
    return <Text style={styles.error}>שגיאה: {error}</Text>;
  }

  if (!requests.length) {
    return <Text style={styles.empty}>אין עדיין בקשות פתוחות מהדיירים בבניין שלך.</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.list}
        data={requests}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>

            <Text style={styles.body}>{item.description}</Text>

            <Text style={styles.meta}>
              קטגוריה: {formatCategory(item.category)}
            </Text>

            <Text style={styles.meta}>
              דחיפות: {formatUrgency(item.urgency)}
            </Text>

            <Text style={styles.meta}>
              מיועד ל: {item.is_committee_only ? "ועד הבית בלבד" : "כל הדיירים"}
            </Text>

            <Text style={styles.meta}>
              נוצר בתאריך: {formatDate(item.created_at)}
            </Text>
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
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    fontWeight: "700",
    fontSize: 16,
    color: "#f8fafc",
    textAlign: "right",
  },
  body: {
    marginTop: 4,
    color: "#e2e8f0",
    textAlign: "right",
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
  },
  error: {
    marginTop: 20,
    textAlign: "center",
    color: "#f87171",
  },
  empty: {
    marginTop: 20,
    textAlign: "center",
    color: "#94a3b8",
  },
});