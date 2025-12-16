import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';
import { getPublicRequests } from '../requestsApi';

export default function PublicRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await getPublicRequests();
        if (mounted) setRequests(data || []);
      } catch (e) {
        if (mounted) setError(e.message || 'שגיאה בטעינת הבקשות');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return <ActivityIndicator style={{ marginTop: 20 }} />;

  if (error)
    return <Text style={styles.error}>שגיאה: {error}</Text>;

  if (!requests.length)
    return (
      <Text style={styles.empty}>
        אין כרגע בקשות פתוחות מהשכנים.
      </Text>
    );

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={requests}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.description}</Text>
          <Text style={styles.meta}>
            דחיפות: {item.urgency} | קטגוריה: {item.category}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: { fontWeight: '700', fontSize: 16 },
  body: { marginTop: 4, color: '#374151' },
  meta: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  error: { marginTop: 20, textAlign: 'center', color: 'red' },
  empty: { marginTop: 20, textAlign: 'center', color: '#6b7280' },
});
