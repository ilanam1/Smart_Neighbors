// screens/BuildingRulesScreen.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ShieldCheck, Save, ArrowRight } from "lucide-react-native";

import { getBuildingRules, saveBuildingRules } from "../API/buildingRulesApi";

export default function BuildingRulesScreen({ route }) {
  const navigation = useNavigation();

  // מגיע מהניווט
  const { user, isCommittee } = route.params || {};

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // שליפה ראשונית של הנהלים
  async function loadRules() {
    try {
      setLoading(true);
      setError(null);

      const data = await getBuildingRules();

      if (data?.content) {
        setContent(data.content);
      } else {
        setContent("");
      }

      if (data?.updated_at) {
        setLastUpdated(new Date(data.updated_at));
      }
    } catch (e) {
      console.error("loadRules error:", e);
      setError("שגיאה בטעינת הנהלים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, []);

  async function handleSave() {
    try {
      if (!user?.id) return;

      setSaving(true);
      setError(null);

      const data = await saveBuildingRules({
        content,
        userId: user.id,
      });

      if (data?.updated_at) {
        setLastUpdated(new Date(data.updated_at));
      }
    } catch (e) {
      console.error("save rules error:", e);
      setError("שגיאה בשמירת הנהלים");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* כותרת + חזרה */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ArrowRight size={18} color="#38bdf8" />
          <Text style={styles.backText}>חזרה</Text>
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <ShieldCheck size={22} color="#22c55e" />
          <Text style={styles.title}>נהלי שימוש במערכת</Text>
        </View>
      </View>

      {lastUpdated && (
        <Text style={styles.updatedText}>
          עודכן לאחרונה:{" "}
          {lastUpdated.toLocaleDateString("he-IL")}{" "}
          {lastUpdated.toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#38bdf8"
          style={{ marginTop: 24 }}
        />
      ) : (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              כאן ועד הבית יכול לרכז את כל הנהלים וחוקי השימוש במערכת
              עבור הדיירים:{"\n"}
              שימוש בלוח הבקשות, דיווח על מטרדים, התנהלות בקהילה ועוד.
            </Text>
          </View>

          <View style={styles.editorWrapper}>
            <Text style={styles.label}>
              {isCommittee
                ? "עריכת נהלים (יוצגו לכל המשתמשים):"
                : "נהלי שימוש שהוגדרו על ידי ועד הבית:"}
            </Text>

            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <TextInput
                style={[
                  styles.textArea,
                  !isCommittee && styles.textAreaReadOnly,
                ]}
                value={content}
                onChangeText={setContent}
                editable={!!isCommittee}
                multiline
                textAlignVertical="top"
                placeholder={
                  isCommittee
                    ? "לדוגמה:\n1. אין לפרסם תוכן פוגעני.\n2. אין לפרסם מודעות מסחריות.\n3. שימוש בלוח המערכת מיועד רק לצרכי הבניין..."
                    : "טרם הוגדרו נהלי שימוש במערכת."
                }
                placeholderTextColor="#64748b"
              />
            </ScrollView>
          </View>

          {isCommittee && (
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <>
                  <Save size={18} color="#0f172a" />
                  <Text style={styles.saveText}>שמירת נהלים</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 16 : 48,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  backText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  titleWrapper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "bold",
  },
  updatedText: {
    color: "#94a3b8",
    fontSize: 11,
    textAlign: "right",
    marginBottom: 8,
  },
  errorText: {
    color: "#f87171",
    marginBottom: 8,
    textAlign: "right",
  },
  infoBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 10,
  },
  infoText: {
    color: "#e2e8f0",
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18,
  },
  editorWrapper: {
    flex: 1,
    marginTop: 4,
  },
  label: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "right",
  },
  editorScroll: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
  },
  textArea: {
    minHeight: 180,
    padding: 12,
    color: "#e5e7eb",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
  },
  textAreaReadOnly: {
    color: "#cbd5f5",
  },
  saveBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#22c55e",
  },
  saveText: {
    marginHorizontal: 6,
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 14,
  },
});
