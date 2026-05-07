// screens/PayFeesScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { createPaymentIntent } from '../API/stripeApi';
import {
  getCurrentBuildingCharge,
  createCashPaymentRequest,
  getMyPaymentForMonth,
  recordStripePaymentAsPaid,
} from '../API/paymentsApi';
import { getSupabase } from '../DataBase/supabase';

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

function getStatusLabel(status) {
  switch (status) {
    case 'PAID':           return 'שולם ✓';
    case 'CASH_REQUESTED': return 'ממתין לאישור מזומן';
    case 'INITIATED':      return 'בתהליך תשלום';
    case 'FAILED':         return 'נכשל';
    default:               return status || '-';
  }
}

export default function PayFeesScreen() {
  const [monthYear] = useState(getCurrentMonthYear());
  const [charge, setCharge]           = useState(null);
  const [lastPayment, setLastPayment] = useState(null);
  const [buildingId, setBuildingId]   = useState(null);
  const [userId, setUserId]           = useState(null);

  const [loadingPage, setLoadingPage]     = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadingPage(true);

      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('building_id')
        .eq('auth_uid', user.id)
        .single();

      setUserId(user.id);
      setBuildingId(profile?.building_id || null);

      const [currentCharge, myPayment] = await Promise.all([
        getCurrentBuildingCharge(monthYear),
        getMyPaymentForMonth(monthYear),
      ]);

      setCharge(currentCharge || null);
      setLastPayment(myPayment || null);
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoadingPage(false);
    }
  }

  // ─── האם הדייר כבר שילם החודש ───────────────────────────────────
  const hasPaidThisMonth = lastPayment?.status === 'PAID';
  const isPending        = lastPayment?.status === 'CASH_REQUESTED' || lastPayment?.status === 'INITIATED';
  const canPay           = !hasPaidThisMonth && !isPending && !!charge;

  // ─── תשלום מזומן ────────────────────────────────────────────────
  async function handleCashPayment() {
    if (!charge) {
      Alert.alert('שגיאה', 'לא הוגדר חיוב לחודש זה על ידי ועד הבית');
      return;
    }
    try {
      setLoadingAction(true);
      const payment = await createCashPaymentRequest({
        amount: charge.amount,
        monthYear,
        chargeId: charge.id,
      });
      setLastPayment(payment);
      Alert.alert('הבקשה נשלחה', 'בקשת תשלום במזומן נשלחה לוועד הבית לאישור.');
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה ביצירת בקשת תשלום במזומן');
    } finally {
      setLoadingAction(false);
    }
  }

  // ─── תשלום Stripe ────────────────────────────────────────────────
  async function handleStripePayment() {
    if (!charge) {
      Alert.alert('שגיאה', 'לא הוגדר חיוב לחודש זה על ידי ועד הבית');
      return;
    }

    try {
      setLoadingAction(true);

      // 1. צור PaymentIntent עם metadata של הבניין
      const { clientSecret, paymentIntentId } = await createPaymentIntent(
        Number(charge.amount),
        'ils',
        { buildingId, tenantUserId: userId, monthYear },
      );

      // 2. אתחול מסך התשלום של Stripe
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'ועד הבית – Smart Neighbors',
        paymentIntentClientSecret: clientSecret,
      });

      if (initError) {
        Alert.alert('שגיאת סליקה', initError.message);
        return;
      }

      // 3. הצגת מסך כרטיס האשראי
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          // המשתמש ביטל – לא נציג שגיאה
        } else {
          Alert.alert('שגיאה בתשלום', paymentError.message);
        }
      } else {
        // 4. תשלום עבר – רשום אותו ב-Supabase וסמן כ-PAID (יעדכן גם את קופת הבניין דרך ה-trigger)
        const paid = await recordStripePaymentAsPaid({
          amount:               charge.amount,
          monthYear,
          chargeId:             charge.id,
          stripePaymentIntentId: paymentIntentId,
        });
        setLastPayment(paid);
        Alert.alert('✓ תשלום הצליח!', `ועד הבית קיבל ${charge.amount} ₪. אסמכתא: ${paid.receipt_code}`);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('שגיאה', err.message || 'שגיאה כללית בתהליך התשלום');
    } finally {
      setLoadingAction(false);
    }
  }

  // ─── טעינה ───────────────────────────────────────────────────────
  if (loadingPage) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>טוען נתוני תשלום...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ─── כותרת ─────────────────────────────────────── */}
      <Text style={styles.header}>תשלום מיסי ועד הבית</Text>
      <Text style={styles.subHeader}>{formatMonthHebrew(monthYear)}</Text>

      {/* ─── כרטיס סטטוס תשלום ─────────────────────────── */}
      {hasPaidThisMonth ? (
        <View style={styles.paidBanner}>
          <Text style={styles.paidIcon}>✓</Text>
          <Text style={styles.paidTitle}>שילמת ועד בית החודש!</Text>
          <Text style={styles.paidSub}>
            {formatMonthHebrew(monthYear)} · {lastPayment?.amount} ₪
          </Text>
          {lastPayment?.receipt_code ? (
            <Text style={styles.paidReceipt}>אסמכתא: {lastPayment.receipt_code}</Text>
          ) : null}
        </View>
      ) : isPending ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingIcon}>⏳</Text>
          <Text style={styles.pendingTitle}>הבקשה נשלחה לאישור</Text>
          <Text style={styles.pendingSub}>
            {getStatusLabel(lastPayment?.status)} · {lastPayment?.amount} ₪
          </Text>
        </View>
      ) : (
        <View style={styles.unpaidBanner}>
          <Text style={styles.unpaidIcon}>!</Text>
          <Text style={styles.unpaidTitle}>טרם שילמת ועד בית החודש</Text>
          <Text style={styles.unpaidSub}>
            {charge
              ? `סכום לתשלום: ${charge.amount} ₪`
              : 'ועד הבית טרם קבע סכום לחודש זה'}
          </Text>
        </View>
      )}

      {/* ─── סכום חיוב ─────────────────────────────────── */}
      <View style={styles.chargeCard}>
        <Text style={styles.chargeLabel}>חיוב חודשי</Text>
        <Text style={styles.chargeAmount}>
          {charge ? `${charge.amount} ₪` : 'לא הוגדר עדיין'}
        </Text>
        {charge?.notes ? (
          <Text style={styles.chargeNotes}>{charge.notes}</Text>
        ) : null}
      </View>

      {/* ─── כפתורי תשלום (רק אם לא שולם ולא ממתין) ──── */}
      {canPay && (
        <>
          <TouchableOpacity
            style={[styles.stripeButton, loadingAction && styles.buttonDisabled]}
            onPress={handleStripePayment}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>💳</Text>
                <Text style={styles.buttonText}>תשלום מאובטח באשראי</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cashButton, loadingAction && styles.buttonDisabled]}
            onPress={handleCashPayment}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>💵</Text>
                <Text style={styles.buttonText}>תשלום במזומן (לאישור ועד)</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ─── הודעה אם אין חיוב ─────────────────────────── */}
      {!charge && !hasPaidThisMonth && (
        <Text style={styles.noChargeNote}>
          * ועד הבית עדיין לא קבע את הסכום לחודש {formatMonthHebrew(monthYear)}.
          {'\n'}ניתן לשלם ברגע שהסכום יוגדר.
        </Text>
      )}
    </ScrollView>
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
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },

  // כותרת
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'right',
    marginBottom: 2,
    marginTop: 8,
  },
  subHeader: {
    fontSize: 14,
    color: '#6366f1',
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 20,
  },

  // ─── PAID Banner ───────────────────────────────────────
  paidBanner: {
    backgroundColor: '#064e3b',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  paidIcon: {
    fontSize: 40,
    color: '#34d399',
    marginBottom: 6,
  },
  paidTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#34d399',
    marginBottom: 4,
  },
  paidSub: {
    fontSize: 14,
    color: '#a7f3d0',
    marginBottom: 4,
  },
  paidReceipt: {
    fontSize: 12,
    color: '#6ee7b7',
    marginTop: 6,
    fontFamily: 'monospace',
  },

  // ─── PENDING Banner ────────────────────────────────────
  pendingBanner: {
    backgroundColor: '#1c1917',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  pendingIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fcd34d',
    marginBottom: 4,
  },
  pendingSub: {
    fontSize: 13,
    color: '#fde68a',
  },

  // ─── UNPAID Banner ─────────────────────────────────────
  unpaidBanner: {
    backgroundColor: '#1e1b4b',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  unpaidIcon: {
    fontSize: 36,
    color: '#a5b4fc',
    marginBottom: 6,
  },
  unpaidTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#c7d2fe',
    marginBottom: 4,
  },
  unpaidSub: {
    fontSize: 13,
    color: '#a5b4fc',
  },

  // ─── כרטיס חיוב ───────────────────────────────────────
  chargeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  chargeLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  chargeAmount: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  chargeNotes: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
  },

  // ─── כפתורים ───────────────────────────────────────────
  stripeButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cashButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── הערה ─────────────────────────────────────────────
  noChargeNote: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
    marginTop: 8,
  },
});