import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { getSupabase } from "../DataBase/supabase";

export default function CommitteeRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const supabase = getSupabase();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("requests")        // שם הטבלה שלך!
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (mounted) setRequests(data || []);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

  if (error) return <Text style={styles.error}>שגיאה: {error}</Text>;

  if (!requests.length)
    return <Text style={styles.empty}>אין עדיין בקשות מהדיירים.</Text>;

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
            <Text style={styles.meta}>מאת: {item.tenant_name || item.email}</Text>
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
  list: { padding: 16 },
  card: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: { fontWeight: "700", fontSize: 16, color: "#f8fafc" },
  body: { marginTop: 4, color: "#e2e8f0" },
  meta: { marginTop: 6, fontSize: 12, color: "#94a3b8" },
  error: { marginTop: 20, textAlign: "center", color: "#f87171" },
  empty: { marginTop: 20, textAlign: "center", color: "#94a3b8" },
});
