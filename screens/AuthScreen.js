import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getSupabase } from '../DataBase/supabase.js';

export default function AuthScreen({ navigation, onSignIn, initialMode = 'signin' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [mode, setMode] = useState(initialMode);
  const [postSignUpUser, setPostSignUpUser] = useState(null);

  const supabase = getSupabase();

  function sanitizeEmailInput(e) {
    return (e || '')
      .replace(/\uFEFF|\u00A0/g, '')
      .replace(/[\u200B-\u200D\u2060]/g, '')
      .trim()
      .toLowerCase();
  }

  async function handleAuth() {
    setError(null);
    setLoading(true);
    try {
      if (!supabase) throw new Error('Supabase client not available');
      const sanitized = sanitizeEmailInput(email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(sanitized)) {
        setError(`Email address "${email}" is invalid`);
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: sanitized, password });
        setInfo({ action: 'signUp', data, error: error?.message || error });

        if (error) {
          setError(error.message);
        } else {
          const user = data?.user || data?.session?.user || null;

          if (!user) {
            setError(null);
            setInfo((prev) => ({
              ...prev,
              message: 'Sign-up initiated. Check your email to confirm your account.',
            }));
            return;
          }

          setPostSignUpUser(user);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: sanitized,
          password,
        });

        if (error) setError(error.message);
        else {
          const user = data?.user || data?.session?.user || null;
          onSignIn && onSignIn(user);
        }
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError(null);
    setLoading(true);
    try {
      const sanitized = sanitizeEmailInput(email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(sanitized)) {
        setError(`Email address "${email}" is invalid`);
        return;
      }

      const { data, error } = await supabase.auth.resetPasswordForEmail(sanitized);
      setInfo({ action: 'resetPassword', data, error: error?.message || error });

      if (error) setError(error.message);
      else setInfo((prev) => ({ ...(prev || {}), message: 'Password reset email sent.' }));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'signup' ? 'Create account' : 'Welcome back'}</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>
              {mode === 'signup' ? 'Sign up' : 'Sign in'}
            </Text>
          )}
        </TouchableOpacity>

        {info ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#444', fontSize: 12, lineHeight: 16 }}>
              {JSON.stringify(info, null, 2)}
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: '#e5e7eb',
                borderRadius: 4,
                alignItems: 'center',
              }}
              onPress={() => setInfo(null)}
            >
              <Text style={{ color: '#444', fontSize: 12 }}>Clear logs</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {postSignUpUser ? (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: '#111', marginBottom: 8, textAlign: 'center' }}>
              Sign-up completed — review the logs above. Tap below to continue.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#10b981', padding: 10, borderRadius: 8 }}
              onPress={() => {
                onSignIn && onSignIn(postSignUpUser);
                setPostSignUpUser(null);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Proceed to app</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Toggle login/signup */}
        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          <Text style={styles.toggleText}>
            {mode === 'signup' ? 'Have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResetPassword} disabled={loading}>
          <Text style={[styles.toggleText, { marginTop: 8 }]}>Forgot password?</Text>
        </TouchableOpacity>

        {/* ✅ BACK BUTTON TO WELCOME SCREEN */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Welcome')}
          style={{
            marginTop: 18,
            padding: 10,
            backgroundColor: '#e5e7eb',
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#111', fontWeight: '600' }}> ←Back </Text>
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
    backgroundColor: '#f7f7fb',
  },
  card: {
    width: '90%',
    maxWidth: 420,
    padding: 22,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e6e6ef',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  toggleText: { color: '#6b7280', marginTop: 12, textAlign: 'center' },
  error: { color: '#b00020', marginTop: 8, textAlign: 'center' },
});
