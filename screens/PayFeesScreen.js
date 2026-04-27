import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { createPaymentIntent } from '../API/stripeApi';
import {
  getCommitteeMembersByBuilding,
  getCurrentBuildingCharge,
  createCashPaymentRequest,
  getMyPaymentForMonth,
} from '../API/paymentsApi';

function getCurrentMonthYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function PayFeesScreen() {
  const [monthYear] = useState(getCurrentMonthYear());
  const [committeeMembers, setCommitteeMembers] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [charge, setCharge] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadingPage(true);

      const [members, currentCharge, myPayment] = await Promise.all([
        getCommitteeMembersByBuilding(),
        getCurrentBuildingCharge(monthYear),
        getMyPaymentForMonth(monthYear),
      ]);

      setCommitteeMembers(members || []);
      setCharge(currentCharge || null);
      setLastPayment(myPayment || null);

      if (members && members.length > 0) {
        const memberWithLink = members.find(m => !!m.committee_payment_link);
        setSelectedCommittee(memberWithLink || members[0]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoadingPage(false);
    }
  }

  function formatCommitteeName(member) {
    if (!member) return 'חבר ועד';
    return `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'חבר ועד';
  }

  async function handleCashPayment() {
    if (!selectedCommittee) {
      Alert.alert('שגיאה', 'לא נמצא חבר ועד מתאים');
      return;
    }

    if (!charge) {
      Alert.alert('שגיאה', 'לא הוגדר חיוב לחודש זה על ידי ועד הבית');
      return;
    }

    try {
      setLoadingAction(true);

      const payment = await createCashPaymentRequest({
        committeeAuthUserId: selectedCommittee.auth_uid,
        amount: charge.amount,
        monthYear,
        chargeId: charge.id,
      });

      setLastPayment(payment);

      Alert.alert(
        'הבקשה נשלחה',
        'בקשת תשלום במזומן נשמרה בהצלחה.'
      );
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה ביצירת בקשת תשלום במזומן');
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleStripePayment() {
    if (!selectedCommittee) {
      Alert.alert('שגיאה', 'לא נמצא חבר ועד מתאים');
      return;
    }

    if (!charge) {
      Alert.alert('שגיאה', 'לא הוגדר חיוב לחודש זה על ידי ועד הבית');
      return;
    }

    try {
      setLoadingAction(true);

      // 1. צור PaymentIntent מול השרת שלנו
      const { clientSecret, paymentIntentId } = await createPaymentIntent(Number(charge.amount));

      // 2. אתחול מסך התשלום המובנה של Stripe
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Smart Neighbors',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: formatCommitteeName(selectedCommittee),
        },
      });

      if (initError) {
        Alert.alert('שגיאת סליקה', initError.message);
        return;
      }

      // 3. הצגת מסך התשלום (יפתח פופאפ אשראי/Google Pay)
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          console.log('Payment canceled by user');
        } else {
          Alert.alert('שגיאה בתשלום', paymentError.message);
        }
      } else {
        Alert.alert('התשלום עבר בהצלחה!', 'תודה ששילמת. קבלה נשמרה במערכת.');
        // כאן בהמשך נקרא ל- paymentsApi להוסיף רשומת PAYMENT לתבלת בית משותף
        loadData(); // נרענן את המסך כדי להראות קרדיט
      }
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה כללית בהתחלת שרת סליקה');
    } finally {
      setLoadingAction(false);
    }
  }

  // Confirm Paid removed completely as Stripe tells us automatically

  if (loadingPage) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>תשלום מיסי ועד הבית</Text>

      <Text style={styles.label}>חודש תשלום</Text>
      <Text style={styles.value}>{monthYear}</Text>

      <Text style={styles.label}>סכום לתשלום החודש</Text>
      <Text style={styles.value}>
        {charge ? `${charge.amount} ₪` : 'לא הוגדר עדיין'}
      </Text>

      <Text style={styles.label}>חבר ועד של הבניין</Text>

      {committeeMembers.length === 0 ? (
        <Text style={styles.warningText}>
          לא נמצאו חברי ועד עבור הבניין שלך.
        </Text>
      ) : (
        <View style={styles.committeeList}>
          {committeeMembers.map(member => {
            const isSelected =
              selectedCommittee?.auth_uid === member.auth_uid;

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
                  {formatCommitteeName(member)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.cashButton, loadingAction && styles.buttonDisabled]}
        onPress={handleCashPayment}
        disabled={loadingAction || !charge || committeeMembers.length === 0}
      >
        {loadingAction ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>אני רוצה לשלם במזומן</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.linkButton, loadingAction && styles.buttonDisabled]}
        onPress={handleStripePayment}
        disabled={loadingAction || !charge || committeeMembers.length === 0}
      >
        {loadingAction ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>תשלום מאובטח באשראי (Stripe)</Text>
        )}
      </TouchableOpacity>

      {lastPayment && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>סטטוס תשלום אחרון</Text>
          <Text style={styles.summaryText}>סטטוס: {lastPayment.status}</Text>
          <Text style={styles.summaryText}>שיטה: {lastPayment.payment_method || '-'}</Text>
          <Text style={styles.summaryText}>חודש: {lastPayment.month_year}</Text>
          <Text style={styles.summaryText}>סכום: {lastPayment.amount} ₪</Text>

          {lastPayment.receipt_code ? (
            <Text style={styles.receiptText}>
              אסמכתא: {lastPayment.receipt_code}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0F172A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cashButton: {
    marginTop: 24,
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  linkButton: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButton: {
    marginTop: 12,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
  },
  summaryTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'right',
  },
  summaryText: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'right',
  },
  receiptText: {
    color: '#86EFAC',
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'right',
  },
});