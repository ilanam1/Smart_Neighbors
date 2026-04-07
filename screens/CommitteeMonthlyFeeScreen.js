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
  getBuildingChargesHistory,
} from '../API/paymentsApi';

function getCurrentMonthYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function CommitteeMonthlyFeeScreen() {
  const [monthYear, setMonthYear] = useState(getCurrentMonthYear());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [currentCharge, setCurrentCharge] = useState(null);
  const [history, setHistory] = useState([]);
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

      const [charge, chargeHistory] = await Promise.all([
        getCurrentBuildingCharge(monthYear),
        getBuildingChargesHistory(12),
      ]);

      setCurrentCharge(charge || null);

      if (charge) {
        setAmount(String(charge.amount));
        setNotes(charge.notes || '');
      }

      setHistory(chargeHistory || []);
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בטעינת נתוני החיובים');
    } finally {
      setLoadingPage(false);
    }
  }

  async function handleLoadSelectedMonth() {
    try {
      setLoadingPage(true);
      const charge = await getCurrentBuildingCharge(monthYear);
      setCurrentCharge(charge || null);

      if (charge) {
        setAmount(String(charge.amount));
        setNotes(charge.notes || '');
      } else {
        setAmount('');
        setNotes('');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בטעינת החודש שנבחר');
    } finally {
      setLoadingPage(false);
    }
  }

  async function handleSaveCharge() {
    try {
      if (!monthYear.trim()) {
        Alert.alert('שגיאה', 'יש להזין חודש בפורמט YYYY-MM');
        return;
      }

      if (!amount.trim()) {
        Alert.alert('שגיאה', 'יש להזין סכום');
        return;
      }

      setSaving(true);

      const saved = await upsertBuildingCharge({
        monthYear,
        amount,
        notes,
      });

      setCurrentCharge(saved);

      const updatedHistory = await getBuildingChargesHistory(12);
      setHistory(updatedHistory || []);

      Alert.alert('הצלחה', 'הסכום החודשי נשמר בהצלחה');
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
      <Text style={styles.header}>ניהול סכום חודשי לוועד הבית</Text>

      <Text style={styles.label}>חודש לחיוב (YYYY-MM)</Text>
      <TextInput
        style={styles.input}
        value={monthYear}
        onChangeText={setMonthYear}
        placeholder="2026-04"
        placeholderTextColor="#94a3b8"
        textAlign="right"
      />

      <TouchableOpacity style={styles.secondaryButton} onPress={handleLoadSelectedMonth}>
        <Text style={styles.secondaryButtonText}>טען נתונים לחודש זה</Text>
      </TouchableOpacity>

      <Text style={styles.label}>סכום חודשי</Text>
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
          <Text style={styles.saveButtonText}>שמור / עדכן סכום חודשי</Text>
        )}
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>חיוב נוכחי לחודש שנבחר</Text>
        {currentCharge ? (
          <>
            <Text style={styles.cardText}>חודש: {currentCharge.month_year}</Text>
            <Text style={styles.cardText}>סכום: {currentCharge.amount} ₪</Text>
            <Text style={styles.cardText}>הערות: {currentCharge.notes || 'ללא'}</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>אין חיוב שמור עבור החודש שנבחר</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>היסטוריית חיובים</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>אין היסטוריית חיובים להצגה</Text>
        ) : (
          history.map(item => (
            <View key={item.id} style={styles.historyRow}>
              <Text style={styles.historyText}>חודש: {item.month_year}</Text>
              <Text style={styles.historyText}>סכום: {item.amount} ₪</Text>
              <Text style={styles.historyText}>הערות: {item.notes || 'ללא'}</Text>
            </View>
          ))
        )}
      </View>
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
    marginTop: 20,
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
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  card: {
    marginTop: 20,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'right',
  },
  cardText: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'right',
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'right',
  },
  historyRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 10,
  },
  historyText: {
    color: '#CBD5E1',
    textAlign: 'right',
    marginBottom: 4,
  },
});