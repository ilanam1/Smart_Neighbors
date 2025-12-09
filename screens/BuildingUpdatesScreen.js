// screens/BuildingUpdatesScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { getWeeklyBuildingUpdates } from '../buildingUpdatesApi';

export default function BuildingUpdatesScreen() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);
        const data = await getWeeklyBuildingUpdates();
        if (isMounted) {
          setUpdates(data);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setErr(e.message || 'שגיאה בטעינת סיכום העדכונים השבועי');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  function formatDate(d) {
    try {
      return new Date(d).toLocaleString('he-IL');
    } catch {
      return d;
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>סיכום שבועי – עדכוני הבניין</Text>

      {loading && <ActivityIndicator size="large" color="#4f46e5" />}

      {err && <Text style={styles.error}>{err}</Text>}

      {!loading && !err && updates.length === 0 && (
        <Text style={styles.empty}>אין עדכונים משבעת הימים האחרונים.</Text>
      )}

      <ScrollView style={styles.list}>
        {updates.map((u) => (
          <View key={u.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{u.title}</Text>
              <Text style={styles.cardCategory}>
                {u.category === 'MAINTENANCE'
                  ? 'תחזוקה'
                  : u.category === 'ALERT'
                  ? 'התראה'
                  : 'כללי'}
                {u.is_important ? '  •  חשוב' : ''}
              </Text>
            </View>
            <Text style={styles.cardBody}>{u.body}</Text>
            <Text style={styles.cardDate}>{formatDate(u.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7fb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'right',
  },
  list: {
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  cardCategory: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'left',
  },
  cardBody: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'right',
  },
  cardDate: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'left',
  },
  error: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  empty: {
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
});
