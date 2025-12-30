// screens/PayFeesScreen.js
// מסך לתשלום מיסי ועד הבית

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Linking } from 'react-native';
import {
  getCommitteeMembers,
  createHouseFeePayment,
  markPaymentAsPaid,
} from '../paymentsApi';

export default function PayFeesScreen() {
  // אפשר לשנות את הסכום הדיפולטי לפי החלטה שלך
  const [amount] = useState(200); // ₪ 200 לחודש לדוגמה
  const [monthYear, setMonthYear] = useState(getCurrentMonthYear()); // "2025-12"
  const [committeeMembers, setCommitteeMembers] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState(null);

  useEffect(() => {
    loadCommitteeMembers();
  }, []);

  async function loadCommitteeMembers() {
    try {
      setLoadingMembers(true);
      const data = await getCommitteeMembers();
      setCommitteeMembers(data);
      if (data.length > 0) {
        setSelectedCommittee(data[0]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בטעינת חברי הוועד.');
    } finally {
      setLoadingMembers(false);
    }
  }

  function getCurrentMonthYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  async function handlePay() {
    if (!selectedCommittee) {
      Alert.alert('שגיאה', 'לא נבחר חבר ועד לתשלום.');
      return;
    }

    let url = selectedCommittee.committee_payment_link || '';

    // 1. ניקוי רווחים ותווים מיותרים
    url = url.trim();

    if (!url) {
      Alert.alert('שגיאה', 'לחבר הוועד שנבחר אין קישור תשלום מוגדר.');
      return;
    }

    // 2. אם אין פרוטוקול – נוסיף https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      setLoading(true);

      // יצירת רשומת תשלום בבסיס הנתונים
      const payment = await createHouseFeePayment({
        committeeAuthUserId: selectedCommittee.auth_uid,
        amount,
        monthYear,
      });

      setLastPaymentId(payment.id);

      console.log('PAY URL =', url);

      // 3. עבור http/https אפשר פשוט לפתוח – אם יש בעיה, נתפוס ב-catch
      Alert.alert(
        'מעבר לתשלום',
        'נפתח דף תשלום מאובטח. לאחר סיום התשלום, חזור לאפליקציה כדי לסמן ששילמת.',
        [
          {
            text: 'המשך',
            onPress: async () => {
              try {
                await Linking.openURL(url);
              } catch (e) {
                console.log('openURL error', e);
                Alert.alert('שגיאה', 'לא ניתן לפתוח את קישור התשלום.');
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בהתחלת התשלום.');
    } finally {
      setLoading(false);
    }
  }


  async function handleMarkAsPaid() {
    if (!lastPaymentId) {
      Alert.alert(
        'מידע',
        'אין תשלום אחרון מסומן. בצע קודם תשלום, ואז סמן אותו כבוצע.'
      );
      return;
    }

    try {
      setLoading(true);
      await markPaymentAsPaid(lastPaymentId);
      Alert.alert('הצלחה', 'סטטוס התשלום עודכן כ"שולם" בהצלחה.');
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בעדכון סטטוס התשלום.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>תשלום מיסי ועד הבית</Text>

      <Text style={styles.label}>חודש תשלום</Text>
      <Text style={styles.value}>{monthYear}</Text>

      <Text style={styles.label}>סכום לתשלום</Text>
      <Text style={styles.value}>{amount} ₪</Text>

      <Text style={styles.label}>בחירת חבר ועד לקבלת התשלום</Text>

      {loadingMembers ? (
        <ActivityIndicator size="small" color="#4f46e5" />
      ) : committeeMembers.length === 0 ? (
        <Text style={styles.warningText}>
          אין חברי ועד עם קישור תשלום מוגדר. יש להגדיר ב-Supabase.
        </Text>
      ) : (
        <View style={styles.committeeList}>
          {committeeMembers.map(member => {
            const isSelected =
              selectedCommittee &&
              selectedCommittee.auth_uid === member.auth_uid;
            const name = `${member.first_name || ''} ${member.last_name || ''
              }`.trim() || 'חבר ועד';

            return (
              <TouchableOpacity
                key={member.auth_uid}
                style={[
                  styles.committeeItem,
                  isSelected && styles.committeeItemSelected,
                ]}
                onPress={() => setSelectedCommittee(member)}
              >
                <Text
                  style={[
                    styles.committeeText,
                    isSelected && styles.committeeTextSelected,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.payButton, loading && styles.buttonDisabled]}
        onPress={handlePay}
        disabled={loading || committeeMembers.length === 0}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>עבור לתשלום</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.markPaidButton]}
        onPress={handleMarkAsPaid}
      >
        <Text style={styles.markPaidText}>סימנתי ששילמתי</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0F172A',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'right',
    color: '#f8fafc',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'right',
    color: '#e2e8f0',
  },
  value: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'right',
    color: '#f1f5f9',
  },
  warningText: {
    marginTop: 8,
    color: '#f87171',
    fontSize: 13,
    textAlign: 'right',
  },
  committeeList: {
    marginTop: 8,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  committeeItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
    marginVertical: 4,
  },
  committeeItemSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  committeeText: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  committeeTextSelected: {
    color: '#fff',
  },
  payButton: {
    marginTop: 24,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  markPaidButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  markPaidText: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
});
