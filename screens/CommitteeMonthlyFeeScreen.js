import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {
  getCurrentUserProfile,
  getCurrentBuildingCharge,
  upsertBuildingCharge,
} from '../API/paymentsApi';

export default function CommitteeMonthlyFeeScreen() {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadingPage(true);

      const userData = await getCurrentUserProfile();
      if (!userData.profile?.is_house_committee) {
        Alert.alert('אין הרשאה', 'רק ועד בית יכול להיכנס למסך זה.');
        return;
      }

      const charge = await getCurrentBuildingCharge('GLOBAL');

      if (charge) {
        setAmount(String(charge.amount));
        setNotes(charge.notes || '');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בטעינת נתוני החיוב');
    } finally {
      setLoadingPage(false);
    }
  }

  async function handleSaveCharge() {
    try {
      if (!amount.trim()) {
        Alert.alert('שגיאה', 'יש להזין סכום');
        return;
      }

      setSaving(true);

      await upsertBuildingCharge({
        monthYear: 'GLOBAL',
        amount,
        notes,
      });

      Alert.alert('הצלחה', 'הסכום החודשי נשמר בהצלחה והוא חל על כל דיירי הבניין');
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בשמירת הסכום החודשי');
    } finally {
      setSaving(false);
    }
  }

  if (loadingPage) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.header}>קביעת סכום חודשי קבוע לבניין</Text>

      <View style={styles.card}>
        <Text style={styles.infoText}>
          הסכום שיוזן כאן יהווה את דמי ועד הבית הקבועים שכל דייר בבניין יתבקש לשלם בכל חודש.
        </Text>
      </View>

      <Text style={styles.label}>סכום לחיוב (₪)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="לדוגמה: 250"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        textAlign="right"
      />

      <Text style={styles.label}>הערות (אופציונלי)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="לדוגמה: כולל ניקיון ולובי"
        placeholderTextColor="#94a3b8"
        multiline
        textAlign="right"
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSaveCharge}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>שמור סכום חודשי</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 22,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});