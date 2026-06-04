// screens/CommitteePaymentSetupScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
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
        <ActivityIndicator color="#f97316" />
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
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.buttonText}>שמירת קישור</Text>
        )}
      </TouchableOpacity>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E1A' },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 40,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    color: '#f8fafc',
    textAlign: 'right',
  },
  helper: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 16,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  error: {
    color: '#f87171',
    marginBottom: 10,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#f97316',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
  },
});
