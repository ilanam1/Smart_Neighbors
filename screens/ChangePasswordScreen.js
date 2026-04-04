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
import LinearGradient from "react-native-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
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
            style={styles.primaryButtonWrapper}
            onPress={handleChangePassword}
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
                  <Text style={styles.primaryButtonText}>שנה סיסמה</Text>
                )}
              </View>
            </LinearGradient>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
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
