// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { getSupabase } from '../DataBase/supabase';
import { getRecentBuildingUpdates } from '../buildingUpdatesApi';

export default function HomeScreen({ navigation, user }) {
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updatesError, setUpdatesError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const supabase = getSupabase();

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      // App.js כבר יטפל במעבר למסכי התחברות
    } catch (e) {
      console.error('Sign out error:', e);
    }
  }



  // טעינת עדכונים מהשרת
  useEffect(() => {
    let isMounted = true;

    async function loadUpdates() {
      try {
        setLoadingUpdates(true);
        setUpdatesError(null);

        const data = await getRecentBuildingUpdates(20);
        if (isMounted) {
          setUpdates(data);
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setUpdatesError(err.message || 'שגיאה בטעינת העדכונים');
        }
      } finally {
        if (isMounted) {
          setLoadingUpdates(false);
        }
      }
    }

    loadUpdates();

    return () => {
      isMounted = false;
    };
  }, []);

  // "מסך רץ" – כל 4 שניות מחליפים עדכון
  useEffect(() => {
    if (!updates || updates.length === 0) return;

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % updates.length);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [updates]);

  const currentUpdate = updates.length > 0 ? updates[currentIndex] : null;

  function getShortBody(update) {
    if (!update?.body) return '';
    const maxLen = 90;
    return update.body.length > maxLen
      ? update.body.slice(0, maxLen) + '...'
      : update.body;
  }

  return (
    <View style={styles.container}>
      {/* כותרת עליונה */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Smart Neighbors</Text>
        <Text style={styles.welcomeText}>
          שלום {user?.email || 'שכן/ה'} 👋
        </Text>
      </View>

      {/* מסך רץ של עדכוני בניין */}
      <View style={styles.tickerContainer}>
        <Text style={styles.tickerLabel}>עדכוני הבניין:</Text>

        {loadingUpdates ? (
          <ActivityIndicator size="small" color="#4f46e5" />
        ) : updatesError ? (
          <Text style={styles.tickerError}>{updatesError}</Text>
        ) : updates.length === 0 ? (
          <Text style={styles.tickerEmpty}>כרגע אין עדכונים לבניין.</Text>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('BuildingUpdates')}
            activeOpacity={0.8}
          >
            <Text style={styles.tickerTitle}>
              {currentUpdate.title}
              {currentUpdate.is_important ? ' ⚠️' : ''}
            </Text>
            <Text style={styles.tickerBody}>{getShortBody(currentUpdate)}</Text>
            <Text style={styles.tickerHint}>הקשה לפתיחת כל העדכונים</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* כפתורים מרכזיים – פיצ'רים ראשיים */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.featureButton}
          onPress={() => navigation.navigate('CreateRequest')}
        >
          <Text style={styles.featureText}>יצירת בקשה חדשה</Text>
        </TouchableOpacity>


          <TouchableOpacity
          style={styles.featureButton}
          onPress={() => navigation.navigate('ReportDisturbance')}
        >
          <Text style={styles.featureText}>דיווח על מטרד/רעש</Text>
        </TouchableOpacity>


          <TouchableOpacity
          style={styles.featureButton}
          onPress={() => navigation.navigate('PayFees')}
        >
          <Text style={styles.featureText}>תשלום מיסי ועד</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureButtonSecondary}
          onPress={() => navigation.navigate('BuildingUpdates')}
        >
          <Text style={styles.featureTextSecondary}>סיכום שבועי / כל העדכונים</Text>
        </TouchableOpacity>
      </View>

      {/* כפתור התנתקות בתחתית */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutText}>התנתקות</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    backgroundColor: '#f7f7fb',
  },
  header: {
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  welcomeText: {
    marginTop: 4,
    fontSize: 15,
    color: '#4b5563',
  },
  tickerContainer: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    marginBottom: 20,
  },
  tickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338ca',
    marginBottom: 4,
  },
  tickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  tickerBody: {
    fontSize: 13,
    color: '#111827',
    marginTop: 2,
  },
  tickerHint: {
    fontSize: 11,
    color: '#4b5563',
    marginTop: 4,
    textAlign: 'left',
  },
  tickerEmpty: {
    fontSize: 13,
    color: '#6b7280',
  },
  tickerError: {
    fontSize: 13,
    color: '#b91c1c',
  },
  buttonsRow: {
    marginTop: 10,
    gap: 12,
  },
  featureButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  featureText: {
    color: '#fff',
    fontWeight: '600',
  },
  featureButtonSecondary: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  featureTextSecondary: {
    color: '#111827',
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 'auto',
    marginBottom: 24,
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});
