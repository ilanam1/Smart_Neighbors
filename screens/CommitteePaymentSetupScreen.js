// screens/CommitteePaymentSetupScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getSupabase } from '../DataBase/supabase';

export default function CommitteePaymentSetupScreen({ navigation }) {
  const supabase = getSupabase();
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadExisting() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('שגיאה בזיהוי המשתמש');
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('committee_payment_link')
          .eq('auth_uid', user.id)
          .maybeSingle();

        if (error) throw error;
        if (mounted && data?.committee_payment_link) {
          setLink(data.committee_payment_link);
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setInitialLoading(false);
      }
    }

    loadExisting();
    return () => { mounted = false; };
  }, [supabase]);

  async function handleSave() {
    setError(null);

    if (!link.trim()) {
      setError('אנא הזן קישור תשלום תקין');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('שגיאה בזיהוי המשתמש');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          committee_payment_link: link.trim(),
          is_house_committee: true, // לוודא שנשאר וועד
        })
        .eq('auth_uid', user.id);

      if (error) throw error;

      // חזרה לאפליקציה (למסך הבית)
      navigation.replace('Home');
    } catch (e) {
      setError(e.message || 'שגיאה בשמירת הקישור');
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>הגדרת קישור לתשלום ועד</Text>
      <Text style={styles.helper}>
        כאן תוכל להזין קישור לתשלום (למשל ביט / פייבוקס / לינק בנקאי).{"\n"}
        הדיירים ישתמשו בו במסך "תשלום מיסי ועד".
      </Text>

      <TextInput
        style={styles.input}
        value={link}
        onChangeText={setLink}
        placeholder="https://..."
        autoCapitalize="none"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>שמירת קישור</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 40,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  helper: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
