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
import { getSupabase } from "../DataBase/supabase";

export default function VerifyEmailScreen({ navigation }) {
  const supabase = getSupabase();
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
      }
    }
    loadUserEmail();
  }, []);

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
                style={[styles.input, { color: "#64748b" }]}
                value={email}
                editable={false}
                textAlign="right"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>שלח קוד אימות</Text>
              )}
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
              style={styles.submitButton}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>אמת קוד</Text>
              )}
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
            <Text style={styles.cancelButtonText}>ביטול חזרה לפרופיל</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1e293b",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 8,
    textAlign: "right",
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 24,
    textAlign: "right",
    lineHeight: 20,
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
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 12,
    color: "#f8fafc",
    fontSize: 18,
    letterSpacing: 2,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "right",
    marginBottom: 16,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "600",
  },
});
