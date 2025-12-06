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
  const [confirmPassword, setConfirmPassword] = useState('');

  // Extra profile fields (signup only)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [zip, setZip] = useState('');
  const [address, setAddress] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [dob, setDob] = useState('');
  const [isCommittee, setIsCommittee] = useState(false);

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
      const sanitized = sanitizeEmailInput(email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(sanitized)) {
        setError(`Email address "${email}" is invalid`);
        return;
      }

      if (!password) {
        setError('Password is required');
        return;
      }

      if (mode === 'signup' && password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

// -------------------- SIGNUP --------------------
if (mode === 'signup') {

  // REQUIRED FIELD VALIDATION BEFORE SIGNUP
  if (!firstName.trim()) return setError("First name is required");
  if (!lastName.trim()) return setError("Last name is required");
  if (!phone.trim()) return setError("Phone number is required");
  if (!zip.trim()) return setError("Zip code is required");
  if (!address.trim()) return setError("Address is required");
  if (!idNumber.trim()) return setError("ID number is required");
  if (!dob.trim()) return setError("Date of birth is required");

  // CREATE AUTH USER
  const { data, error } = await supabase.auth.signUp({
    email: sanitized,
    password,
  });

  setInfo({ action: 'signUp', data, error });

  if (error) {
    setError(error.message);
    return;
  }

  const user = data?.user || data?.session?.user || null;

  if (!user) {
    setInfo(prev => ({
      ...prev,
      message: "Account created! Please log in now."
    }));
    return;
  }

  // DEBUG CHECK
  console.log("PROFILE DATA SENDING:", {
    auth_uid: user.id,
    email: sanitized,
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    zip_code: zip,
    address: address,
    id_number: idNumber,
    date_of_birth: dob,
    is_house_committee: isCommittee,
  });

  // INSERT OR UPDATE PROFILE
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        auth_uid: user.id,
        email: sanitized,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        zip_code: zip,
        address: address,
        id_number: idNumber,
        date_of_birth: dob,
        is_house_committee: isCommittee,
      },
      { onConflict: "auth_uid" }
    );

  if (profileError) {
    console.log("FULL PROFILE ERROR:", profileError);
    alert(JSON.stringify(profileError, null, 2));
    setError("Profile could not be saved.");
    return;
  }

  setPostSignUpUser(user);
  return;
}

      // -------------------- SIGN IN --------------------
      else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: sanitized,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
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
      setInfo({ action: 'resetPassword', data, error });

      if (error) setError(error.message);
      else
        setInfo((prev) => ({
          ...(prev || {}),
          message: 'Password reset email sent.',
        }));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {mode === 'signup' ? 'Create account' : 'Welcome back'}
        </Text>

        {/* EXTRA FIELDS – SIGNUP ONLY */}
        {mode === 'signup' && (
          <>
            <TextInput placeholder="First Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
            <TextInput placeholder="Last Name" value={lastName} onChangeText={setLastName} style={styles.input} />
            <TextInput placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
            <TextInput placeholder="Zip / Postal Code" value={zip} onChangeText={setZip} style={styles.input} />
            <TextInput placeholder="Address" value={address} onChangeText={setAddress} style={styles.input} />
            <TextInput placeholder="ID Number" value={idNumber} onChangeText={setIdNumber} style={styles.input} />
            <TextInput placeholder="Date of Birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} style={styles.input} />

            <TouchableOpacity onPress={() => setIsCommittee(!isCommittee)} style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 16 }}>
                {isCommittee ? '☑ House Committee' : '☐ House Committee'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* COMMON EMAIL + PASSWORD */}
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />

        {mode === 'signup' && (
          <TextInput placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} secureTextEntry />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>
              {mode === 'signup' ? 'Sign up' : 'Sign in'}
            </Text>
          )}
        </TouchableOpacity>

        {/* DEBUG INFO */}
        {info && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#444', fontSize: 12 }}>{JSON.stringify(info, null, 2)}</Text>
            <TouchableOpacity
              style={{ marginTop: 8, padding: 8, backgroundColor: '#e5e7eb', borderRadius: 4, alignItems: 'center' }}
              onPress={() => setInfo(null)}
            >
              <Text style={{ color: '#444', fontSize: 12 }}>Clear logs</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AFTER SIGNUP */}
        {postSignUpUser && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: '#111', marginBottom: 8, textAlign: 'center' }}>
              Account created! Tap below to continue.
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
        )}

        {/* TOGGLE TO SIGNIN/SIGNUP */}
        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          <Text style={styles.toggleText}>
            {mode === 'signup' ? 'Have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResetPassword} disabled={loading}>
          <Text style={[styles.toggleText, { marginTop: 8 }]}>Forgot password?</Text>
        </TouchableOpacity>

        {/* BACK BUTTON */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Welcome')}
          style={{ marginTop: 18, padding: 10, backgroundColor: '#e5e7eb', borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ color: '#111', fontWeight: '600' }}>← Back</Text>
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
