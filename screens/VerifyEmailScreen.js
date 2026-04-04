import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { getSupabase } from "../DataBase/supabase";

export default function VerifyEmailScreen({ route, navigation }) {
  const supabase = getSupabase();
  const emailForReset = route?.params?.emailForReset;
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState(null);

  // Load the current user's email automatically
  useEffect(() => {
    async function loadUserEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setEmail(user.email);
      } else if (emailForReset) {
        setEmail(emailForReset);
      }
    }
    loadUserEmail();
  }, [emailForReset]);

  async function handleSendCode() {
    setError(null);
    if (!email) {
      setError("אימייל לא נמצא. אנא התחבר מחדש.");
      return;
    }

    setLoading(true);
    try {
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(email);
      if (sendError) throw sendError;

      setCodeSent(true);
      Alert.alert("נשלח", "קוד אימות נשלח לאימייל שלך.");
    } catch (err) {
      setError(err.message || "אירעה שגיאה בעת שליחת הקוד.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    if (!code || code.length < 4) {
      setError("אנא הזן את קוד האימות המלא שקיבלת.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "recovery",
      });

      if (verifyError) throw verifyError;

      // Verification successful, navigate to Change Password
      navigation.replace("ChangePassword");
    } catch (err) {
      setError(err.message || "קוד שגוי או פג תוקף.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: "#0F172A" }} />
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
        <Text style={styles.title}>אימות אימייל</Text>
        
        {!codeSent ? (
          <>
            <Text style={styles.subtitle}>
              על מנת לשנות את סיסמתך, נשלח קוד אימות לאימייל המשויך לחשבונך.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>האימייל שלך</Text>
              <TextInput
                style={[styles.input, { color: "#f8fafc" }]}
                value={email}
                onChangeText={setEmail}
                editable={true}
                textAlign="right"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButtonWrapper}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#ff0080", "#00f2ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBorder}
              >
                <View style={styles.primaryButtonInner}>
                  {loading ? (
                    <ActivityIndicator color="#ff0080" />
                  ) : (
                    <Text style={styles.primaryButtonText}>שלח קוד אימות</Text>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              הזן את הקוד שקיבלת באימייל ({email}).
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>קוד אימות</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="הזן כאן את הקוד"
                placeholderTextColor="#9ca3af"
                keyboardType="default"
                maxLength={12}
                textAlign="center"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButtonWrapper}
              onPress={handleVerifyCode}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#ff0080", "#00f2ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBorder}
              >
                <View style={styles.primaryButtonInner}>
                  {loading ? (
                    <ActivityIndicator color="#ff0080" />
                  ) : (
                    <Text style={styles.primaryButtonText}>אמת קוד</Text>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 12 }]}
              onPress={() => setCodeSent(false)}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>לא קיבלתי קוד / נסה שוב</Text>
            </TouchableOpacity>
          </>
        )}

        {!codeSent && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>ביטול וחזרה</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "transparent",
    padding: 24,
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    padding: 26,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 8,
    textAlign: "right",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#9ca3af",
    marginBottom: 24,
    textAlign: "right",
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "right",
  },
  input: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#f8fafc",
    fontSize: 16,
    letterSpacing: 2,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    textAlign: "right",
    marginBottom: 16,
    fontWeight: "500",
  },
  primaryButtonWrapper: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#ff0080",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 8,
    marginBottom: 12,
  },
  gradientBorder: {
    flex: 1,
    padding: 2,
    borderRadius: 16,
  },
  primaryButtonInner: {
    flex: 1,
    backgroundColor: "#000000",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 14,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  cancelButtonText: {
    color: "#9ca3af",
    fontSize: 15,
    fontWeight: "600",
  },
});
