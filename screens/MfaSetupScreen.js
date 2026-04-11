import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Copy, ArrowRight } from 'lucide-react-native';
import { enrollMfa, challengeMfa, verifyMfa } from '../API/mfaApi';

export default function MfaSetupScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const [factorId, setFactorId] = useState(null);
  const [secret, setSecret] = useState(null);
  
  const [code, setCode] = useState('');

  useEffect(() => {
    let mounted = true;
    async function setup() {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Enroll
        const enrollData = await enrollMfa();
        if (mounted) {
          setFactorId(enrollData.id);
          setSecret(enrollData.totp.secret);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'שגיאה ביצירת אימות דו-שלבי');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    setup();
    return () => { mounted = false; };
  }, []);

  const handleCopy = () => {
    if (secret) {
      Clipboard.setString(secret);
      Alert.alert('הועתק', 'הקוד הועתק ללוח');
    }
  };

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      Alert.alert('שגיאה', 'יש להזין קוד בן 6 ספרות');
      return;
    }
    
    try {
      setVerifying(true);
      setError(null);
      
      // 2. Challenge to get challengeId
      const challengeData = await challengeMfa(factorId);
      const challengeId = challengeData.id;
      
      // 3. Verify
      await verifyMfa(factorId, challengeId, code);
      
      Alert.alert('בהצלחה', 'אימות דו-שלבי הוגדר ופעיל כעת בחשבונך!', [
        { text: 'מצוין', onPress: () => navigation.goBack() }
      ]);
      
    } catch (err) {
      setError(err.message || 'הקוד שגוי, אנא נסה שנית');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowRight size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הגדרת אימות דו-שלבי</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ShieldCheck size={64} color="#10b981" />
        </View>
        <Text style={styles.title}>הגברת אבטחת החשבון</Text>
        <Text style={styles.subtitle}>
          באמצעות אפליקציית מאמת כמו Google Authenticator
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
        ) : error && !factorId ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.instructionText}>
              1. הורד את אפליקציית Google Authenticator למכשירך.
            </Text>
            <Text style={styles.instructionText}>
              2. בחר באפשרות ״הזנת מפתח הגדרה״ (Enter a setup key) והכנס את הקוד הבא:
            </Text>
            
            <TouchableOpacity style={styles.secretBox} onPress={handleCopy}>
              <Text style={styles.secretText}>{secret}</Text>
              <Copy size={20} color="#94a3b8" />
            </TouchableOpacity>

            <Text style={styles.instructionText}>
              3. לאחר ההוספה, הזן כאן את הקוד (6 ספרות) שמופיע באפליקציה כדי לאמת ולהפעיל:
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              textAlign="center"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity 
              style={[styles.verifyBtn, (!code || code.length < 6) && { opacity: 0.5 }]} 
              onPress={handleVerify}
              disabled={verifying || !code || code.length < 6}
            >
              {verifying ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.verifyBtnText}>אמת והפעל 2FA</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  content: { padding: 24, alignItems: 'center' },
  iconContainer: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24
  },
  title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  card: {
    backgroundColor: '#1e293b', padding: 24, borderRadius: 16, width: '100%',
    borderWidth: 1, borderColor: '#334155'
  },
  instructionText: { fontSize: 14, color: '#e2e8f0', textAlign: 'right', marginBottom: 12, lineHeight: 20 },
  secretBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#0f172a', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#334155',
    marginBottom: 24, marginTop: 8
  },
  secretText: { fontSize: 20, fontWeight: 'bold', color: '#10b981', letterSpacing: 2 },
  codeInput: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8,
    color: '#f8fafc', fontSize: 32, fontWeight: 'bold', padding: 16,
    marginTop: 8, marginBottom: 16, letterSpacing: 8
  },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  verifyBtn: {
    backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center'
  },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
