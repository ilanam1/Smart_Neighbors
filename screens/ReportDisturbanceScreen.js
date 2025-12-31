// screens/ReportDisturbanceScreen.js
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
import { createDisturbanceReport } from '../API/disturbancesApi';

// סוגי מטרד
const TYPES = [
  { key: 'NOISE', label: 'רעש' },
  { key: 'CLEANLINESS', label: 'לכלוך / אשפה' },
  { key: 'SAFETY', label: 'בטיחות / ונדליזם' },
  { key: 'OTHER', label: 'אחר' },
];

// חומרה
const SEVERITIES = [
  { key: 'LOW', label: 'נמוכה' },
  { key: 'MEDIUM', label: 'בינונית' },
  { key: 'HIGH', label: 'גבוהה' },
];

export default function ReportDisturbanceScreen() {
  const [type, setType] = useState('NOISE');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  // אנו מניחים שהאירוע קרה עכשיו – אפשר להרחיב לשדה תאריך/שעה
  const computeOccurredAt = () => new Date().toISOString();

  const validate = () => {
    if (!description.trim()) {
      Alert.alert('שגיאה', 'נא למלא תיאור למטרד.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const occurredAt = computeOccurredAt();

      const report = await createDisturbanceReport({
        type,
        severity,
        description: description.trim(),
        occurredAt,
        location: location.trim() || null,
      });

      console.log('New disturbance report:', report);

      Alert.alert('הצלחה', 'הדיווח נשלח בהצלחה!', [
        {
          text: 'אוקיי',
          onPress: () => {
            setDescription('');
            setLocation('');
            setType('NOISE');
            setSeverity('MEDIUM');
          },
        },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'אירעה שגיאה בשליחת הדיווח.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>דיווח על מטרד</Text>

      <Text style={styles.label}>סוג המטרד</Text>
      <View style={styles.chipsRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.chip,
              type === t.key && styles.chipSelected,
            ]}
            onPress={() => setType(t.key)}
          >
            <Text
              style={[
                styles.chipText,
                type === t.key && styles.chipTextSelected,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>חומרת המטרד</Text>
      <View style={styles.chipsRow}>
        {SEVERITIES.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[
              styles.chip,
              severity === s.key && styles.chipSelected,
            ]}
            onPress={() => setSeverity(s.key)}
          >
            <Text
              style={[
                styles.chipText,
                severity === s.key && styles.chipTextSelected,
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>תיאור המטרד *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="לדוגמה: מוזיקה חזקה מאוד מהבניין ממול אחרי 23:00..."
        placeholderTextColor="#94a3b8"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlign="right"
      />

      <Text style={styles.label}>מיקום (אופציונלי)</Text>
      <TextInput
        style={styles.input}
        placeholder="לדוגמה: רחוב הרצל 10, ליד הכניסה האחורית"
        placeholderTextColor="#94a3b8"
        value={location}
        onChangeText={setLocation}
        textAlign="right"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>שליחת דיווח</Text>
        )}
      </TouchableOpacity>
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
    color: '#FFFFFF',
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
    color: '#cbd5e1',
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
});
