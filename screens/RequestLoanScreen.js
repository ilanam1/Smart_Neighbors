import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";

import { requestEquipmentLoan, validateLoanDates } from "../API/equipmentLoansApi";

function formatDate(date) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(date) {
  if (!date) return "בחר תאריך";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function getTodayWithoutTime() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export default function RequestLoanScreen({ navigation, route }) {
  const { equipmentId, equipmentTitle, buildingId, ownerId, user } = route.params || {};

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showPicker, setShowPicker] = useState(null);
  const [saving, setSaving] = useState(false);

  const today = useMemo(() => getTodayWithoutTime(), []);

  function handleDateChange(event, selectedDate) {
    if (Platform.OS === "android") {
      setShowPicker(null);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (!selectedDate) {
      return;
    }

    const cleanDate = new Date(selectedDate);
    cleanDate.setHours(0, 0, 0, 0);

    if (showPicker === "start") {
      setStartDate(cleanDate);

      if (endDate && endDate < cleanDate) {
        setEndDate(cleanDate);
      }
    }

    if (showPicker === "end") {
      setEndDate(cleanDate);
    }
  }

  async function handleSubmitRequest() {
    try {
      if (!user?.id) {
        Alert.alert("שגיאה", "לא זוהה משתמש מחובר.");
        return;
      }

      if (!equipmentId || !buildingId || !ownerId) {
        Alert.alert("שגיאה", "חסרים נתונים עבור בקשת ההשאלה.");
        return;
      }

      if (ownerId === user.id) {
        Alert.alert("שגיאה", "לא ניתן להשאיל פריט שהעלית בעצמך.");
        return;
      }

      const normalized = validateLoanDates(formatDate(startDate), formatDate(endDate));

      setSaving(true);

      await requestEquipmentLoan({
        buildingId,
        equipmentId,
        ownerId,
        borrowerId: user.id,
        startDate: normalized.startDate,
        endDate: normalized.endDate,
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

  const minimumEndDate = startDate || today;

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
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker("start")}>
            <CalendarDays size={18} color="#10b981" />
            <Text style={styles.dateButtonText}>{formatDateForDisplay(startDate)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>תאריך סיום</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker("end")}>
            <CalendarDays size={18} color="#10b981" />
            <Text style={styles.dateButtonText}>{formatDateForDisplay(endDate)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.validationBox}>
          <Text style={styles.validationText}>• לא ניתן לבחור תאריך שכבר עבר</Text>
          <Text style={styles.validationText}>• תאריך הסיום חייב להיות אחרי או שווה לתאריך ההתחלה</Text>
          <Text style={styles.validationText}>• משך ההשאלה מוגבל עד 30 ימים</Text>
        </View>

        {showPicker && (
          <DateTimePicker
            value={
              showPicker === "start"
                ? startDate || today
                : endDate || minimumEndDate
            }
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={showPicker === "start" ? today : minimumEndDate}
            onChange={handleDateChange}
          />
        )}

        {Platform.OS === "ios" && showPicker && (
          <TouchableOpacity style={styles.closePickerButton} onPress={() => setShowPicker(null)}>
            <Text style={styles.closePickerText}>סיום בחירה</Text>
          </TouchableOpacity>
        )}

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
  subtitle: { color: "#94a3b8", fontSize: 13, marginTop: 4, textAlign: "right" },
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
  dateButton: {
    backgroundColor: "rgba(30, 41, 59, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.8)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButtonText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  validationBox: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    alignItems: "flex-end",
  },
  validationText: {
    color: "#bfdbfe",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "right",
  },
  closePickerButton: {
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  closePickerText: {
    color: "#f8fafc",
    fontWeight: "800",
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