import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getSupabase } from './supabase.js';

export default function AuthScreen({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [postSignUpUser, setPostSignUpUser] = useState(null);

  const supabase = getSupabase();

  function sanitizeEmailInput(e) {
    return (e || '')
      .replace(/\uFEFF|\u00A0/g, '') // BOM, NBSP
      .replace(/[\u200B-\u200D\u2060]/g, '') // zero-width spaces
      .trim()
      .toLowerCase();
  }

  async function handleAuth() {
    setError(null);
    setLoading(true);
    try {
      if (!supabase) throw new Error('Supabase client not available');
      // Sanitize and validate email before sending to Supabase
      const sanitized = sanitizeEmailInput(email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitized)) {
        setError(`Email address "${email}" is invalid`);
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
  const { data, error } = await supabase.auth.signUp({ email: sanitized, password });
        console.log('signUp response', { data, error });
        setInfo({ action: 'signUp', data, error: error?.message || error });
        if (error) {
          setError(error.message);
        } else {
          const user = data?.user || data?.session?.user || null;

          // If there's no user/session returned, it's likely email confirmation is required.
          if (!user) {
            setError(null);
            setInfo((prev) => ({ ...prev, message: 'Sign-up initiated. Check your email to confirm the account (if email confirmation is enabled).' }));
            return;
          }

          // Don't auto sign-in after signup; let user inspect logs then proceed manually
          // Server trigger will create the profile row in the database. Remove client-side inserts.
          setPostSignUpUser(user);
        }
      } else {
  const { data, error } = await supabase.auth.signInWithPassword({ email: sanitized, password });
        if (error) setError(error.message);
        else {
          setInfo({ action: 'signIn', data });
          const user = data?.user || data?.session?.user || null;
          // Server trigger will create or ensure profile rows. Client no longer inserts/checks.
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
      if (!supabase) throw new Error('Supabase client not available');
      const sanitized = sanitizeEmailInput(email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitized)) {
        setError(`Email address "${email}" is invalid`);
        return;
      }

      // Request a password reset email from Supabase Auth
      const { data, error } = await supabase.auth.resetPasswordForEmail(sanitized);
      console.log('resetPasswordForEmail', { data, error });
      setInfo({ action: 'resetPassword', data, error: error?.message || error });
      if (error) setError(error.message);
      else setInfo((prev) => ({ ...(prev || {}), message: 'Password reset email sent (check your inbox).' }));
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
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'signup' ? 'Sign up' : 'Sign in'}</Text>}
        </TouchableOpacity>

        {info ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#444', fontSize: 12, lineHeight: 16 }}>{JSON.stringify(info, null, 2)}</Text>
            <TouchableOpacity
              style={{ marginTop: 8, padding: 8, backgroundColor: '#e5e7eb', borderRadius: 4, alignItems: 'center' }}
              onPress={() => setInfo(null)}
            >
              <Text style={{ color: '#444', fontSize: 12 }}>Clear logs</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {postSignUpUser ? (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: '#111', marginBottom: 8, textAlign: 'center' }}>
              Sign-up completed — review the logs above. When ready, tap below to continue into the app.
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

        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          <Text style={styles.toggleText}>{mode === 'signup' ? 'Have an account? Sign in' : "Don't have an account? Sign up"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResetPassword} disabled={loading}>
          <Text style={[styles.toggleText, { marginTop: 8 }]}>Forgot password?</Text>
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
