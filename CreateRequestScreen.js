// CreateRequestScreen.js
// מסך לפרסום בקשה חדשה לשכנים

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createRequest } from './requestsApi'; // ודא שהקובץ requestsApi.js קיים כמו שכתבנו

// רשימות קבועות לקטגוריה ולדחיפות
const CATEGORIES = [
  { key: 'ITEM_LOAN', label: 'השאלת ציוד' },
  { key: 'PHYSICAL_HELP', label: 'עזרה פיזית' },
  { key: 'INFO', label: 'מידע' },
  { key: 'OTHER', label: 'אחר' },
];

const URGENCIES = [
  { key: 'LOW', label: 'נמוכה' },
  { key: 'MEDIUM', label: 'בינונית' },
  { key: 'HIGH', label: 'גבוהה' },
];

const DEFAULT_EXPIRE_HOURS = 24; // כמה שעות עד תפוגה אוטומטית

export default function CreateRequestScreen({ navigation }) {
  // state לשדות הטופס
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ITEM_LOAN');
  const [urgency, setUrgency] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);

  // פונקציה לעדכון expires_at (כרגע אוטומטי – 24 שעות קדימה)
  const computeExpiresAt = () => {
    const now = new Date();
    const expires = new Date(now.getTime() + DEFAULT_EXPIRE_HOURS * 60 * 60 * 1000);
    return expires.toISOString();
  };

  // ולידציה בסיסית לשדות
  const validate = () => {
    if (!title.trim()) {
      Alert.alert('שגיאה', 'נא למלא כותרת לבקשה.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('שגיאה', 'נא למלא תיאור מפורט לבקשה.');
      return false;
    }
    return true;
  };

  // שליחת הבקשה ל-Supabase
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const expiresAt = computeExpiresAt();

      const newRequest = await createRequest({
        title: title.trim(),
        description: description.trim(),
        category,
        urgency,
        expiresAt,
      });

      console.log('New request created:', newRequest);

      Alert.alert('הצלחה', 'הבקשה פורסמה לשכנים בהצלחה!', [
        {
          text: 'אוקיי',
          onPress: () => {
            // ניקוי הטופס
            setTitle('');
            setDescription('');

            // אם יש ניווט – נחזור אחורה למסך הקודם (אופציונלי)
            if (navigation && navigation.goBack) {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה בפרסום הבקשה.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>פרסום בקשה חדשה</Text>

      {/* כותרת */}
      <Text style={styles.label}>כותרת הבקשה *</Text>
      <TextInput
        style={styles.input}
        placeholder="לדוגמה: מי יכול להשאיל לי מקדחה?"
        value={title}
        onChangeText={setTitle}
      />

      {/* תיאור */}
      <Text style={styles.label}>תיאור מפורט *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="תאר בקצרה מה אתה צריך, מתי, ואם יש פרטים חשובים..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      {/* קטגוריה */}
      <Text style={styles.label}>קטגוריה</Text>
      <View style={styles.chipsRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.chip,
              category === cat.key && styles.chipSelected,
            ]}
            onPress={() => setCategory(cat.key)}
          >
            <Text
              style={[
                styles.chipText,
                category === cat.key && styles.chipTextSelected,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* רמת דחיפות */}
      <Text style={styles.label}>רמת דחיפות</Text>
      <View style={styles.chipsRow}>
        {URGENCIES.map((urg) => (
          <TouchableOpacity
            key={urg.key}
            style={[
              styles.chip,
              urgency === urg.key && styles.chipSelected,
            ]}
            onPress={() => setUrgency(urg.key)}
          >
            <Text
              style={[
                styles.chipText,
                urgency === urg.key && styles.chipTextSelected,
              ]}
            >
              {urg.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* כפתור שליחה */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>פרסם בקשה</Text>
        )}
      </TouchableOpacity>

      {/* הערה קטנה על תפוגה */}
      <Text style={styles.note}>
        הבקשה תיסגר אוטומטית לאחר {DEFAULT_EXPIRE_HOURS} שעות אם לא תטופל.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#f8f8f8',
    flexGrow: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlign: 'right',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#999',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 4,
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
    color: '#777',
    marginTop: 10,
    textAlign: 'right',
  },
});
