import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { getSupabase } from "../DataBase/supabase";

export default function CommitteeDisturbancesScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const supabase = getSupabase();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("disturbance_reports")   // שם הטבלה בפועל
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (mounted) setItems(data || []);
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
  if (!items.length)
    return <Text style={styles.empty}>אין עדיין דיווחי מטרדים.</Text>;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.description}</Text>
          <Text style={styles.meta}>
            {item.address} · {item.created_at?.slice(0, 10)}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: { fontWeight: "700", fontSize: 16 },
  body: { marginTop: 4, color: "#374151" },
  meta: { marginTop: 6, fontSize: 12, color: "#6b7280" },
  error: { marginTop: 20, textAlign: "center", color: "red" },
  empty: { marginTop: 20, textAlign: "center", color: "#6b7280" },
});
