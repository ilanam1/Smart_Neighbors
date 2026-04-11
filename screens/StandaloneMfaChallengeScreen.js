import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { getSupabase } from '../DataBase/supabase';

export default function StandaloneMfaChallengeScreen({ factorId, onCancel, onVerify }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState('');
  
  const supabase = getSupabase();

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError("אנא הזן קוד חוקי בן 6 ספרות");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStatusText('מתחבר לשרת...');
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      
      setStatusText('מאמת קוד...');
      const verifyRes = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code
      });
      
      if (verifyRes.error) {
        throw verifyRes.error;
      }

      setStatusText('מעדכן חיבור...');
      setLoading(false); 
      
      // Pass the definitively upgraded AAL2 session from the verify response directly
      if (onVerify) {
        onVerify(verifyRes.data.session);
      }

    } catch (e) {
      Alert.alert("שגיאה", e.message || "קוד האימות שגוי. אנא נסה שנית.");
      setError(e.message || "קוד האימות שגוי. אנא נסה שנית.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onCancel && onCancel();
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: '#0F172A' }} />
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" width="100%">
            <Defs>
              <RadialGradient id="topGlow" cx="100%" cy="0%" rx="60%" ry="40%" fx="100%" fy="0%" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#ff0080" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="bottomGlow" cx="0%" cy="100%" rx="60%" ry="40%" fx="0%" fy="100%" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#00f2ff" stopOpacity="0.25" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGlow)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomGlow)" />
          </Svg>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>אימות דו-שלבי</Text>
        <Text style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: 20, fontSize: 16 }}>
          החשבון שלך מוגן באימות כפול. 
          {"\n"}פתח את אפליקציית Authenticator (כגון Google Authenticator) והזן את הקוד:
        </Text>
        
        <TextInput
          placeholderTextColor="#64748b"
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus={true}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        <TouchableOpacity style={styles.primaryButtonWrapper} onPress={handleVerify} disabled={loading} activeOpacity={0.9}>
          <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBorder}>
            <View style={[styles.primaryButtonInner, { backgroundColor: '#0f172a', flexDirection: 'row' }]}>
              {loading ? (
                <>
                  <ActivityIndicator color="#10b981" />
                  <Text style={[styles.primaryButtonText, { marginLeft: 10, fontSize: 14 }]}>{statusText}</Text>
                </>
              ) : (
                <Text style={styles.primaryButtonText}>אמת עכשיו והכנס</Text>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignOut} style={{ marginTop: 20, padding: 10 }}>
          <Text style={{ textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>ביטול וחזרה להתחברות</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 420,
    padding: 26,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    color: '#10b981',
    fontSize: 32,
    letterSpacing: 12,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  primaryButtonWrapper: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 24,
  },
  gradientBorder: {
    flex: 1,
    padding: 2,
    borderRadius: 16,
  },
  primaryButtonInner: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  error: { color: '#f87171', marginTop: 12, textAlign: 'center', fontWeight: '500', fontSize: 16 },
});
