import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  getBuildingPaymentsForMonth,
  confirmCashPaymentByCommittee,
  markPaymentAsFailed,
} from '../API/paymentsApi';

function getCurrentMonthYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function CommitteePaymentsManagementScreen() {
  const [monthYear, setMonthYear] = useState(getCurrentMonthYear());
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      setLoading(true);
      const data = await getBuildingPaymentsForMonth(monthYear);
      setPayments(data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בטעינת התשלומים');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCash(paymentId) {
    try {
      setActionLoadingId(paymentId);
      await confirmCashPaymentByCommittee(paymentId);
      Alert.alert('הצלחה', 'תשלום המזומן אושר בהצלחה');
      await loadPayments();
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה באישור תשלום המזומן');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleMarkFailed(paymentId) {
    try {
      setActionLoadingId(paymentId);
      await markPaymentAsFailed(paymentId);
      Alert.alert('עודכן', 'התשלום סומן כנכשל');
      await loadPayments();
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בעדכון התשלום');
    } finally {
      setActionLoadingId(null);
    }
  }

  function getTenantName(item) {
    const p = item?.tenant_profile;
    if (!p) return 'דייר';
    return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'דייר';
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.header}>ניהול תשלומי ועד הבית</Text>

      <Text style={styles.label}>חודש להצגה (YYYY-MM)</Text>
      <TextInput
        style={styles.input}
        value={monthYear}
        onChangeText={setMonthYear}
        textAlign="right"
        placeholder="2026-04"
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity style={styles.reloadButton} onPress={loadPayments}>
        <Text style={styles.reloadText}>טען תשלומים</Text>
      </TouchableOpacity>

      {payments.length === 0 ? (
        <Text style={styles.emptyText}>אין תשלומים להצגה עבור חודש זה</Text>
      ) : (
        payments.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{getTenantName(item)}</Text>
            <Text style={styles.cardText}>סכום: {item.amount} ₪</Text>
            <Text style={styles.cardText}>שיטה: {item.payment_method || '-'}</Text>
            <Text style={styles.cardText}>סטטוס: {item.status}</Text>
            <Text style={styles.cardText}>חודש: {item.month_year}</Text>
            <Text style={styles.cardText}>אסמכתא: {item.receipt_code || 'אין עדיין'}</Text>

            {item.payment_method === 'CASH' && item.status === 'CASH_REQUESTED' && (
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleConfirmCash(item.id)}
                disabled={actionLoadingId === item.id}
              >
                <Text style={styles.buttonText}>
                  {actionLoadingId === item.id ? 'טוען...' : 'אשר תשלום מזומן'}
                </Text>
              </TouchableOpacity>
            )}

            {item.status !== 'PAID' && (
              <TouchableOpacity
                style={styles.failButton}
                onPress={() => handleMarkFailed(item.id)}
                disabled={actionLoadingId === item.id}
              >
                <Text style={styles.buttonText}>סמן כנכשל</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
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
  reloadButton: {
    marginTop: 10,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  reloadText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#94A3B8',
    marginTop: 20,
    textAlign: 'right',
  },
  card: {
    marginTop: 16,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 8,
  },
  cardText: {
    color: '#CBD5E1',
    textAlign: 'right',
    marginBottom: 4,
  },
  approveButton: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  failButton: {
    marginTop: 10,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});