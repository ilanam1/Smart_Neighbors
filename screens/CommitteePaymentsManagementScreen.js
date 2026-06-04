// screens/CommitteePaymentsManagementScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, Modal, FlatList, TouchableWithoutFeedback, Image, Dimensions } from 'react-native';
import {
  getBuildingPaymentsForMonth,
  getBuildingWallet,
  getBuildingMonthlySummary,
  confirmCashPaymentByCommittee,
  markPaymentAsFailed,
} from '../API/paymentsApi';

function getCurrentMonthYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthHebrew(monthYear) {
  if (!monthYear) return '';
  const [year, month] = monthYear.split('-');
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function getMethodLabel(method) {
  switch (method) {
    case 'CASH':   return '💵 מזומן';
    case 'STRIPE': return '💳 אשראי';
    case 'LINK':   return '🔗 קישור';
    default:       return method || '-';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'PAID':           return { label: 'שולם ✓',              color: '#f97316' };
    case 'CASH_REQUESTED': return { label: 'ממתין לאישור מזומן', color: '#fbbf24' };
    case 'INITIATED':      return { label: 'בתהליך',              color: '#ffffff' };
    case 'FAILED':         return { label: 'נכשל ✗',              color: '#ef4444' };
    default:               return { label: status || '-',          color: '#cbd5e1' };
  }
}

const generateRecentMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  return months;
};

const RECENT_MONTHS = generateRecentMonths();

export default function CommitteePaymentsManagementScreen() {
  const [monthYear, setMonthYear]         = useState(getCurrentMonthYear());
  const [payments, setPayments]           = useState([]);
  const [wallet, setWallet]               = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [walletData, summaryData, paymentsData] = await Promise.all([
        getBuildingWallet(),
        getBuildingMonthlySummary(monthYear),
        getBuildingPaymentsForMonth(monthYear),
      ]);
      setWallet(walletData);
      setMonthlySummary(summaryData);
      setPayments(paymentsData || []);
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments() {
    try {
      setLoading(true);
      const [summaryData, paymentsData] = await Promise.all([
        getBuildingMonthlySummary(monthYear),
        getBuildingPaymentsForMonth(monthYear),
      ]);
      setMonthlySummary(summaryData);
      setPayments(paymentsData || []);
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
      Alert.alert('✓ אושר', 'תשלום המזומן אושר בהצלחה והתווסף לקופת הבניין');
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

  const handleSelectMonth = (selectedMonth) => {
    setMonthYear(selectedMonth);
    setShowMonthPicker(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Image
        source={require('../assets/app_internal_bg.png')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: Dimensions.get('screen').width,
          height: Dimensions.get('screen').height,
        }}
        resizeMode="cover"
      />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>ניהול תשלומי ועד הבית</Text>

      {/* ═══ כרטיס קופת הבניין הכוללת ═════════════════════════ */}
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>קופת הבניין הדיגיטלית (אשראי בלבד)</Text>
        <Text style={styles.walletAmount}>
          {wallet ? `${Number(wallet.total_collected).toLocaleString('he-IL')} ₪` : '0 ₪'}
        </Text>
        <Text style={styles.walletNote}>* מצטבר מכל התשלומים באשראי (STRIPE)</Text>
      </View>

      {/* ═══ סיכום חודשי ══════════════════════════════════════ */}
      <View style={styles.monthlyCard}>
        <Text style={styles.monthlyTitle}>חודש {formatMonthHebrew(monthYear)}</Text>
        <View style={styles.monthlyRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{monthlySummary?.paid_count ?? 0}</Text>
            <Text style={styles.statLabel}>שילמו</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#f97316' }]}>
              {monthlySummary?.paid_total ?? 0} ₪
            </Text>
            <Text style={styles.statLabel}>נגבה</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#fcd34d' }]}>
              {monthlySummary?.pending_count ?? 0}
            </Text>
            <Text style={styles.statLabel}>ממתינים</Text>
          </View>
        </View>
      </View>

      {/* ═══ בחירת חודש ═══════════════════════════════════════ */}
      <Text style={styles.label}>חודש להצגה</Text>
      <TouchableOpacity 
        style={styles.input} 
        onPress={() => setShowMonthPicker(true)}
      >
        <Text style={{ color: '#F8FAFC', textAlign: 'right', fontSize: 15 }}>
          {formatMonthHebrew(monthYear)}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMonthPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>בחר חודש</Text>
              <FlatList
                data={RECENT_MONTHS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.monthOption,
                      monthYear === item && styles.monthOptionSelected,
                    ]}
                    onPress={() => handleSelectMonth(item)}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        monthYear === item && styles.monthOptionTextSelected,
                      ]}
                    >
                      {formatMonthHebrew(item)}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.monthList}
              />
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowMonthPicker(false)}
              >
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TouchableOpacity style={styles.reloadButton} onPress={loadPayments}>
        <Text style={styles.reloadText}>טען תשלומים לחודש זה</Text>
      </TouchableOpacity>

      {/* ═══ רשימת תשלומים ════════════════════════════════════ */}
      {payments.length === 0 ? (
        <Text style={styles.emptyText}>אין תשלומים להצגה עבור חודש זה</Text>
      ) : (
        payments.map(item => {
          const { label: statusLabel, color: statusColor } = getStatusLabel(item.status);
          const isLoading = actionLoadingId === item.id;
          const isPaid = item.status === 'PAID';
          const borderRightColor = isPaid ? 'rgba(255, 255, 255, 0.3)' : '#f97316';

          return (
            <View key={item.id} style={[styles.card, { borderRightColor }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{getTenantName(item)}</Text>
                <Text style={[styles.statusBadge, { color: statusColor }]}>{statusLabel}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardText}>{getMethodLabel(item.payment_method)}</Text>
                <Text style={[styles.cardText, styles.cardAmount]}>{item.amount} ₪</Text>
              </View>

              {item.receipt_code ? (
                <Text style={styles.receipt}>אסמכתא: {item.receipt_code}</Text>
              ) : null}

              {/* כפתור אישור מזומן */}
              {item.payment_method === 'CASH' && item.status === 'CASH_REQUESTED' && (
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleConfirmCash(item.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0f172a" size="small" />
                  ) : (
                    <Text style={styles.approveButtonText}>✓ אשר תשלום מזומן</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* כפתור סימון כנכשל */}
              {item.status !== 'PAID' && item.status !== 'FAILED' && (
                <TouchableOpacity
                  style={styles.failButton}
                  onPress={() => handleMarkFailed(item.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#f97316" size="small" />
                  ) : (
                    <Text style={styles.failButtonText}>✗ סמן כנכשל</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 16,
    marginTop: 8,
  },
  walletCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRightWidth: 4,
    borderRightColor: '#f97316',
  },
  walletLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  walletAmount: {
    color: '#f97316',
    fontSize: 36,
    fontWeight: '800',
  },
  walletNote: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
  },
  monthlyCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  monthlyTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 12,
  },
  monthlyRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  reloadButton: {
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: '#f97316',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  reloadText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  emptyText: {
    color: '#94A3B8',
    marginTop: 20,
    textAlign: 'right',
  },
  card: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRightWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#f1f5f9',
    fontWeight: '700',
    fontSize: 15,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  cardAmount: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  receipt: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  approveButton: {
    marginTop: 12,
    backgroundColor: '#f97316',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
  },
  failButton: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: '#f97316',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  failButtonText: {
    color: '#f97316',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 15,
  },
  monthList: {
    marginBottom: 10,
  },
  monthOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  monthOptionSelected: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  monthOptionText: {
    color: '#CBD5E1',
    fontSize: 16,
    textAlign: 'center',
  },
  monthOptionTextSelected: {
    color: '#f97316',
    fontWeight: '800',
  },
  modalCancelButton: {
    marginTop: 10,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f97316',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '700',
  },
});