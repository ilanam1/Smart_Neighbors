// screens/BuildingUpdatesScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import {
  getWeeklyBuildingUpdates,
  createBuildingUpdate,
} from '../buildingUpdatesApi';

export default function BuildingUpdatesScreen({ route }) {
  const isCommittee = route?.params?.isCommittee === true;

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // טופס לוועד בית
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function handleCreateUpdate() {
    if (!title.trim() || !body.trim()) {
      Alert.alert('שגיאה', 'נא למלא כותרת ותוכן לעדכון.');
      return;
    }

    try {
      setSaving(true);
      const newUpdate = await createBuildingUpdate({
        title: title.trim(),
        body: body.trim(),
        isImportant,
        // אפשר גם להעביר category אם תרצה UI בחירה:
        // category: 'MAINTENANCE' / 'ALERT' / 'GENERAL'
      });

      // להוסיף לראש הרשימה
      setUpdates((prev) => [newUpdate, ...(prev || [])]);

      setTitle('');
      setBody('');
      setIsImportant(false);

      Alert.alert('הצלחה', 'עדכון הבניין פורסם בהצלחה.');
    } catch (e) {
      console.error(e);
      Alert.alert('שגיאה', e.message || 'אירעה שגיאה ביצירת העדכון.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>סיכום שבועי – עדכוני הבניין</Text>

      {/* אזור ניהול לוועד הבית בלבד */}
      {isCommittee && (
        <View style={styles.adminBox}>
          <Text style={styles.adminTitle}>ניהול ויצירת עדכוני בניין (ועד הבית)</Text>

          <Text style={styles.label}>כותרת העדכון *</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: עבודות במעלית ביום ראשון"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>תוכן העדכון *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="תאר בקצרה את העדכון, זמנים, השפעות על הדיירים וכו'..."
            value={body}
            onChangeText={setBody}
            multiline
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>סמן כעדכון חשוב (⚠️)</Text>
            <Switch value={isImportant} onValueChange={setIsImportant} />
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleCreateUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>פרסם עדכון</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading && updates.length === 0 && (
        <ActivityIndicator size="large" color="#4f46e5" />
      )}

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

            {/* שורה של מידע: תאריך + מי פרסם */}
            <View style={styles.footerRow}>
              <Text style={styles.cardDate}>{formatDate(u.created_at)}</Text>
              <Text style={styles.cardAuthor}>
                פורסם ע״י{' '}
                {u.creator_name || u.creator_email || 'ועד הבית'}
              </Text>
            </View>
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

  adminBox: {
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
    color: '#1e3a8a',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    textAlign: 'right',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  switchLabel: {
    fontSize: 13,
    color: '#111827',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
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
  footerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'left',
  },
  cardAuthor: {
    fontSize: 11,
    color: '#374151',
    textAlign: 'right',
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
