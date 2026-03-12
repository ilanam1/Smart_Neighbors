import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestEquipmentLoan } from "../API/equipmentLoansApi";

export default function RequestLoanScreen({ navigation, route }) {
  const { equipmentId, equipmentTitle, buildingId, ownerId, user } = route.params || {};

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  function isValidDateFormat(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  async function handleSubmitRequest() {
    try {
      if (!startDate || !endDate) {
        Alert.alert("שגיאה", "יש להזין תאריך התחלה ותאריך סיום.");
        return;
      }

      if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
        Alert.alert("שגיאה", "פורמט התאריך חייב להיות YYYY-MM-DD.");
        return;
      }

      if (endDate < startDate) {
        Alert.alert("שגיאה", "תאריך הסיום חייב להיות אחרי תאריך ההתחלה.");
        return;
      }

      setSaving(true);

      await requestEquipmentLoan({
        buildingId,
        equipmentId,
        ownerId,
        borrowerId: user?.id,
        startDate,
        endDate,
      });

      Alert.alert("הצלחה", "בקשת ההשאלה נשלחה בהצלחה.", [
        {
          text: "אישור",
          onPress: () => navigation.popToTop(),
        },
      ]);
    } catch (err) {
      console.error("Request loan error:", err);
      Alert.alert("שגיאה", err?.message || "לא ניתן היה לשלוח את בקשת ההשאלה.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>בקשת השאלה</Text>
          <Text style={styles.subtitle}>בחר טווח תאריכים עבור הפריט</Text>
        </View>

        <View style={styles.itemCard}>
          <Text style={styles.itemCardLabel}>פריט נבחר</Text>
          <Text style={styles.itemCardTitle}>{equipmentTitle}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>תאריך התחלה</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748b"
            value={startDate}
            onChangeText={setStartDate}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>תאריך סיום</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748b"
            value={endDate}
            onChangeText={setEndDate}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && { opacity: 0.7 }]}
          onPress={handleSubmitRequest}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.submitButtonText}>שלח בקשת השאלה</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: "flex-end", marginBottom: 24 },
  title: { color: "#f8fafc", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  itemCard: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.7)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 22,
    alignItems: "flex-end",
  },
  itemCardLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 6,
  },
  itemCardTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  section: { marginBottom: 18 },
  label: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "right",
  },
  input: {
    backgroundColor: "rgba(30, 41, 59, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.8)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#f8fafc",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#10b981",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonText: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 15,
  },
});