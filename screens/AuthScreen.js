import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { LogIn, UserPlus } from 'lucide-react-native';
//import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import { getSupabase } from '../DataBase/supabase.js';
import RNFS from "react-native-fs";
import { decode as atob } from "base-64";

async function getRealPath(uri) {
  if (uri.startsWith("content://")) {
    const stat = await RNFS.stat(uri);
    return stat.path;
  }
  return uri;
}



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
  const [dob, setDob] = useState(new Date(2000, 0, 1));
//const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');




  const [isCommittee, setIsCommittee] = useState(false);

  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [showBuildingModal, setShowBuildingModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [mode, setMode] = useState(initialMode);
  const [postSignUpUser, setPostSignUpUser] = useState(null);

  const [photo, setPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const supabase = getSupabase();

  useEffect(() => {
    async function fetchBuildings() {
      const { data, error } = await supabase.from('buildings').select('*');
      if (data) setBuildings(data);
      if (error) console.log('Error fetching buildings', error);
    }
    fetchBuildings();
  }, [supabase]);

  function sanitizeEmailInput(e) {
    return (e || '')
      .replace(/\uFEFF|\u00A0/g, '')
      .replace(/[\u200B-\u200D\u2060]/g, '')
      .trim()
      .toLowerCase();
  }
  async function handlePickPhoto() {
    setError(null);

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        console.log('Image picker error:', result.errorMessage);
        setError(result.errorMessage || 'Could not select image');
        return;
      }

      const asset = result.assets && result.assets[0];
      if (!asset) {
        setError('No image selected');
        return;
      }

      setPhoto(asset); // { uri, fileName, type, ... }
      console.log("📸 PICKED PHOTO:", asset);
    } catch (e) {
      console.log('handlePickPhoto error', e);
      setError(e.message || String(e));
    }
  }


  async function handleAuth() {
    setError(null);
    setLoading(true);

    try {
      const sanitized = sanitizeEmailInput(email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!sanitized) {
        setError('Please enter an email or admin number');
        return;
      }

      // Check if it's an email
      const isEmail = emailRegex.test(sanitized);

      if (!password) {
        setError('Password is required');
        return;
      }

      // -------------------- ADMIN & EMPLOYEE LOGIN (If not email) --------------------
      if (!isEmail && mode === 'signin') {
        // Try Admin first
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('admin_number', sanitized)
          .eq('password', password)
          .single();

        if (!adminError && adminData) {
          const adminUser = { ...adminData, role: 'admin' };
          onSignIn && onSignIn(adminUser);
          return;
        }

        // Try Employee if not Admin
        const { data: empData, error: empError } = await supabase
          .from('service_employees')
          .select('*')
          .eq('employee_number', sanitized)
          .eq('password', password)
          .single();

        if (!empError && empData) {
          const empUser = { ...empData, role: 'employee' };
          onSignIn && onSignIn(empUser);
          return;
        }

        setError('Invalid credentials');
        return;
      }

      // -------------------- REGULAR USER LOGIN/SIGNUP ----------
      if (!isEmail) {
        setError(`Email address "${email}" is invalid for signup`);
        return;
      }



      if (mode === 'signup' && password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // -------------------- SIGNUP --------------------
      if (mode === 'signup') {

        // REQUIRED FIELD VALIDATION BEFORE SIGNUP
        if (!selectedBuildingId) return setError("Please select your building");
        if (!firstName.trim()) return setError("First name is required");
        if (!lastName.trim()) return setError("Last name is required");
        if (!phone.trim()) return setError("Phone number is required");
        if (!zip.trim()) return setError("Zip code is required");
        if (!address.trim()) return setError("Address is required");
        if (!idNumber.trim()) return setError("ID number is required");
        //if (!dob) return setError("Date of birth is required");
        if (!birthDay.trim() || !birthMonth.trim() || !birthYear.trim()) {
            return setError("Date of birth is required");
}

        // PHONE NUMBER VALIDATION (Exactly 10 digits, numbers only)
        if (!/^\d{10}$/.test(phone.trim())) {
          return setError("Invalid phone number");
        }

        // ID NUMBER VALIDATION (Exactly 9 digits, numbers only)
        if (!/^\d{9}$/.test(idNumber.trim())) {
          return setError("Invalid ID number");
        }

        // ZIP CODE VALIDATION (Exactly 7 digits, numbers only)
        if (!/^\d{7}$/.test(zip.trim())) {
          return setError("Invalid zip code");
        }

        // PASSWORD VALIDATION (At least 8 chars, 1 uppercase)
        if (password.length < 8) {
          return setError("Password must be at least 8 characters long");
        }
        if (!/[A-Z]/.test(password)) {
          return setError("Password must contain at least one uppercase letter");
        }

        // Format Date of Birth for Supabase (YYYY-MM-DD)
        const day = parseInt(birthDay, 10);
const month = parseInt(birthMonth, 10);
const year = parseInt(birthYear, 10);

if (
  isNaN(day) || isNaN(month) || isNaN(year) ||
  day < 1 || day > 31 ||
  month < 1 || month > 12 ||
  year < 1900 || year > new Date().getFullYear()
) {
  return setError("Invalid date of birth");
}

const dobDate = new Date(year, month - 1, day);

if (
  dobDate.getFullYear() !== year ||
  dobDate.getMonth() !== month - 1 ||
  dobDate.getDate() !== day
) {
  return setError("Invalid date of birth");
}

const formattedDob = dobDate.toISOString().split('T')[0];

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
        let uploadedPhotoUrl = null;

        if (photo?.uri) {
          try {
            setUploadingPhoto(true);

            const fileExt =
              (photo.fileName && photo.fileName.split(".").pop()) || "jpg";

            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            console.log("📤 Uploading:", filePath);

            let uploadUri = photo.uri;
            if (uploadUri.startsWith("file://")) {
              uploadUri = uploadUri.replace("file://", "");
            }

            // ⚠️ THIS IS THE CORRECT WAY TO GET IMAGE BINARY IN REACT NATIVE
            // --- FIXED UPLOAD BLOCK USING RNFS + BINARY ---
            const realPath = await getRealPath(photo.uri);
            const base64File = await RNFS.readFile(realPath, "base64");

            const binary = Uint8Array.from(atob(base64File), c => c.charCodeAt(0));

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("profile-photos")
              .upload(filePath, binary, {
                contentType: photo.type || "image/jpeg",
                upsert: true,
              });


            if (uploadError) {
              console.log("❌ Upload error:", uploadError);
            } else {
              const { data: publicData } = supabase.storage
                .from("profile-photos")
                .getPublicUrl(filePath);

              uploadedPhotoUrl = publicData.publicUrl;
              console.log("✅ Uploaded photo URL:", uploadedPhotoUrl);
            }
          } catch (err) {
            console.log("❌ Upload exception:", err);
          } finally {
            setUploadingPhoto(false);
          }
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
          date_of_birth: formattedDob,
          is_house_committee: isCommittee,
          photo_url: uploadedPhotoUrl,
        });
        // Build payload
        const profilePayload = {
          auth_uid: user.id,
          email: sanitized,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          zip_code: zip,
          address: address,
          id_number: idNumber,
          date_of_birth: formattedDob,
          is_house_committee: isCommittee,
          building_id: selectedBuildingId,
        };


        if (uploadedPhotoUrl) {
          profilePayload.photo_url = uploadedPhotoUrl;
        }

        // INSERT OR UPDATE PROFILE
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: "auth_uid" });

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
    const sanitized = sanitizeEmailInput(email);
    navigation.navigate("VerifyEmail", { emailForReset: sanitized });
  }

  return (
    <>
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

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ width: '100%' }}
        >
          <View style={styles.card}>
            <Text style={styles.title}>
              {mode === 'signup' ? 'צור חשבון' : 'ברוך שובך'}
            </Text>

        {/* EXTRA FIELDS – SIGNUP ONLY */}
        {mode === 'signup' && (
          <>
            <TextInput placeholderTextColor="#9ca3af" placeholder="שם פרטי *" value={firstName} onChangeText={setFirstName} style={styles.input} textAlign="right" />
            <TextInput placeholderTextColor="#9ca3af" placeholder="שם משפחה *" value={lastName} onChangeText={setLastName} style={styles.input} textAlign="right" />
            <TextInput placeholderTextColor="#9ca3af" placeholder="מס' טלפון (10 ספרות) *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} textAlign="right" />
            <TextInput placeholderTextColor="#9ca3af" placeholder="מיקוד (7 ספרות) *" value={zip} onChangeText={setZip} keyboardType="number-pad" style={styles.input} textAlign="right" />
            <TextInput placeholderTextColor="#9ca3af" placeholder="כתובת *" value={address} onChangeText={setAddress} style={styles.input} textAlign="right" />
            <TextInput placeholderTextColor="#9ca3af" placeholder="תעודת זהות (9 ספרות) *" value={idNumber} onChangeText={setIdNumber} keyboardType="number-pad" style={styles.input} textAlign="right" />
            
            {/* DATE PICKER */}
<View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10 }}>
  <TextInput
    placeholderTextColor="#9ca3af"
    placeholder="יום"
    value={birthDay}
    onChangeText={setBirthDay}
    keyboardType="number-pad"
    maxLength={2}
    style={[styles.input, { flex: 1, marginTop: 0 }]}
    textAlign="center"
  />
  <TextInput
    placeholderTextColor="#9ca3af"
    placeholder="חודש"
    value={birthMonth}
    onChangeText={setBirthMonth}
    keyboardType="number-pad"
    maxLength={2}
    style={[styles.input, { flex: 1, marginTop: 0 }]}
    textAlign="center"
  />
  <TextInput
    placeholderTextColor="#9ca3af"
    placeholder="שנה"
    value={birthYear}
    onChangeText={setBirthYear}
    keyboardType="number-pad"
    maxLength={4}
    style={[styles.input, { flex: 2, marginTop: 0 }]}
    textAlign="center"
  />
</View>

            {/* BUILDING SELECTION */}
            <TouchableOpacity
              style={[styles.input, { justifyContent: 'center' }]}
              onPress={() => setShowBuildingModal(true)}
            >
              <Text style={{ color: selectedBuildingId ? '#f8fafc' : '#9ca3af', textAlign: 'right' }}>
                {selectedBuildingId
                  ? buildings.find(b => b.id === selectedBuildingId)?.name || 'נבחר'
                  : 'בחר בניין *'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsCommittee(!isCommittee)} style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 16, color: '#e2e8f0', textAlign: 'right' }}>
                {isCommittee ? '☑ חבר ועד בית' : '☐ חבר ועד בית'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
              <Text style={styles.photoButtonText}>
                {photo ? 'שנה תמונת פרופיל' : 'בחר תמונת פרופיל (רשות)'}
              </Text>
            </TouchableOpacity>

            {photo && (
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'right' }}>
                נבחר: {photo.fileName || photo.uri}
              </Text>
            )}

          </>
        )}

        {/* COMMON EMAIL + PASSWORD */}
        {/* COMMON EMAIL + PASSWORD */}
        <TextInput
          placeholderTextColor="#9ca3af"
          placeholder="אימייל / מס' עובד / מס' מנהל"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="default"
          autoCapitalize="none"
          textAlign="right"
        />
        <TextInput placeholderTextColor="#9ca3af" placeholder="סיסמה" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry textAlign="right" />

        {mode === 'signup' && (
          <TextInput placeholderTextColor="#9ca3af" placeholder="אימות סיסמה" value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} secureTextEntry textAlign="right" />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryButtonWrapper} onPress={handleAuth} disabled={loading} activeOpacity={0.9}>
          <LinearGradient
            colors={['#ff0080', '#00f2ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBorder}
          >
            <View style={styles.primaryButtonInner}>
              {loading ? <ActivityIndicator color="#ff0080" /> : (
                <>
                  {mode === 'signup' ? <UserPlus size={20} color="#ff0080" /> : <LogIn size={20} color="#ff0080" />}
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signup' ? 'הרשמה' : 'התחברות'}
                  </Text>
                </>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* DEBUG INFO */}
        {info && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#444', fontSize: 12, textAlign: 'right' }}>{JSON.stringify(info, null, 2)}</Text>
            <TouchableOpacity
              style={{ marginTop: 8, padding: 8, backgroundColor: '#e5e7eb', borderRadius: 4, alignItems: 'center' }}
              onPress={() => setInfo(null)}
            >
              <Text style={{ color: '#444', fontSize: 12 }}>נקה יומנים</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AFTER SIGNUP */}
        {postSignUpUser && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: '#f8fafc', marginBottom: 8, textAlign: 'center' }}>
              החשבון נוצר! לחץ למטה להמשך.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#10b981', padding: 10, borderRadius: 8 }}
              onPress={() => {
                onSignIn && onSignIn(postSignUpUser);
                setPostSignUpUser(null);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>המשך לאפליקציה</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TOGGLE TO SIGNIN/SIGNUP */}
        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          <Text style={styles.toggleText}>
            {mode === 'signup' ? 'יש לך כבר חשבון? התחבר' : 'אין לך חשבון? הרשם'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResetPassword} disabled={loading}>
          <Text style={[styles.toggleText, { marginTop: 8 }]}>שכחתי סיסמה?</Text>
        </TouchableOpacity>

        {/* BACK BUTTON */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Welcome')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>חזרה לעמוד הראשי</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  </KeyboardAvoidingView>

  <Modal visible={showBuildingModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111', textAlign: 'right' }}>בחר בניין</Text>
            <FlatList
              data={buildings}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedBuildingId(item.id);
                    setShowBuildingModal(false);
                  }}
                >
                  <Text style={{ color: '#111', fontSize: 16, textAlign: 'right' }}>{item.name} - {item.address}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={{ marginTop: 12, padding: 10, alignItems: 'center' }}
              onPress={() => setShowBuildingModal(false)}
            >
              <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  card: {
    width: '90%',
    maxWidth: 420,
    padding: 26,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#f8fafc',
    fontSize: 16,
  },
  primaryButtonWrapper: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ff0080',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 24,
  },
  gradientBorder: {
    flex: 1,
    padding: 2,
    borderRadius: 16,
  },
  primaryButtonInner: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  toggleText: { color: '#9ca3af', marginTop: 16, textAlign: 'center', fontSize: 14 },
  error: { color: '#f87171', marginTop: 12, textAlign: 'center', fontWeight: '500' },
  secondaryButton: {
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  secondaryButtonText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
  },

  photoButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  modalBg: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: '70%',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
});
