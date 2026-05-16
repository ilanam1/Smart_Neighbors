// CreateRequestScreen.js

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
import { createRequest } from '../API/requestsApi';

const CATEGORIES = [
  { key: 'PHYSICAL_HELP', label: 'עזרה פיזית' },
  { key: 'INFO', label: 'מידע / שאלה' },
  { key: 'MAINTENANCE', label: 'תחזוקה' },
  { key: 'CLEANING', label: 'ניקיון' },
  { key: 'NOISE', label: 'רעש' },
  { key: 'SAFETY', label: 'בטיחות' },
  { key: 'OTHER', label: 'אחר' },
];

const URGENCIES = [
  { key: 'LOW', label: 'נמוכה' },
  { key: 'MEDIUM', label: 'בינונית' },
  { key: 'HIGH', label: 'גבוהה' },
];

const DEFAULT_EXPIRE_HOURS = 24;

export default function CreateRequestScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PHYSICAL_HELP');
  const [urgency, setUrgency] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);

  // למי הבקשה מופיעה? ALL = לכל הדיירים, COMMITTEE = רק לוועד הבית
  const [visibility, setVisibility] = useState('ALL');

  const computeExpiresAt = () => {
    const now = new Date();
    const expires = new Date(
      now.getTime() + DEFAULT_EXPIRE_HOURS * 60 * 60 * 1000
    );
    return expires.toISOString();
  };

  const validate = () => {
    if (!title.trim()) {
      Alert.alert('שגיאה', 'נא למלא כותרת לבקשה.');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('שגיאה', 'נא למלא תיאור מפורט לבקשה.');
      return false;
    }

    if (!category) {
      Alert.alert('שגיאה', 'נא לבחור קטגוריה.');
      return false;
    }

    if (!urgency) {
      Alert.alert('שגיאה', 'נא לבחור רמת דחיפות.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const expiresAt = computeExpiresAt();
      const isCommitteeOnly = visibility === 'COMMITTEE';

      const newRequest = await createRequest({
        title: title.trim(),
        description: description.trim(),
        category,
        urgency,
        expiresAt,
        isCommitteeOnly,
      });

      console.log('New request created:', newRequest);

      Alert.alert('הצלחה', 'הבקשה פורסמה בהצלחה!', [
        {
          text: 'אוקיי',
          onPress: () => {
            setTitle('');
            setDescription('');
            setCategory('PHYSICAL_HELP');
            setUrgency('MEDIUM');
            setVisibility('ALL');
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

      <Text style={styles.label}>כותרת הבקשה *</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#94a3b8"
        placeholder="לדוגמה: צריך עזרה בהעברת משהו כבד"
        value={title}
        onChangeText={setTitle}
        textAlign="right"
      />

      <Text style={styles.label}>תיאור מפורט *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholderTextColor="#94a3b8"
        placeholder="תאר בקצרה מה אתה צריך, מתי, ואם יש פרטים חשובים..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlign="right"
      />

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

      <Text style={styles.label}>למי הבקשה תופיע?</Text>
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[
            styles.chip,
            visibility === 'ALL' && styles.chipSelected,
          ]}
          onPress={() => setVisibility('ALL')}
        >
          <Text
            style={[
              styles.chipText,
              visibility === 'ALL' && styles.chipTextSelected,
            ]}
          >
            לכל הדיירים
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chip,
            visibility === 'COMMITTEE' && styles.chipSelected,
          ]}
          onPress={() => setVisibility('COMMITTEE')}
        >
          <Text
            style={[
              styles.chipText,
              visibility === 'COMMITTEE' && styles.chipTextSelected,
            ]}
          >
            רק לוועד הבית
          </Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#0F172A',
    flexGrow: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
    color: '#f8fafc',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    textAlign: 'right',
    color: '#e2e8f0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#1e293b',
    color: '#f8fafc',
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
    borderColor: '#475569',
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
    color: '#e2e8f0',
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
    color: '#94a3b8',
    marginTop: 10,
    textAlign: 'right',
  },
});