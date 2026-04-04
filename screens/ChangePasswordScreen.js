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
  ScrollView,
  Alert,
} from "react-native";
import { getSupabase } from "../DataBase/supabase";

export default function ChangePasswordScreen({ navigation }) {
  const supabase = getSupabase();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleChangePassword() {
    setError(null);

    if (!newPassword.trim()) {
      setError("נא למלא את כל השדות.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("הסיסמה החדשה ואימות הסיסמה אינם תואמים.");
      return;
    }

    if (newPassword.length < 8) {
      setError("הסיסמה החדשה חייבת להכיל לפחות 8 תווים.");
      return;
    }

    setLoading(true);

    try {
      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      Alert.alert("הצלחה", "הסיסמה שונתה בהצלחה!", [
        { text: "אישור", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) }
      ]);
    } catch (err) {
      setError(err.message || "אירעה שגיאה בעת שינוי הסיסמה.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>הקצאת סיסמה חדשה</Text>
          <Text style={styles.subtitle}>
            הזן את הסיסמה החדשה לחשבונך.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>סיסמה חדשה</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="הזן סיסמה חדשה"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>אימות סיסמה חדשה</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="הזן שוב סיסמה חדשה"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              textAlign="right"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>שנה סיסמה</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>ביטול</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "600",
  },
});
