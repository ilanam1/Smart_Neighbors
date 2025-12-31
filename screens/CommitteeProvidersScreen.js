// screens/CommitteeProvidersScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowRight } from "lucide-react-native";
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
} from "../API/serviceProvidersApi";

const CATEGORIES = [
  { key: "PLUMBER", label: "אינסטלטור" },
  { key: "ELECTRICIAN", label: "חשמלאי" },
  { key: "CLEANING", label: "ניקיון" },
  { key: "GENERAL", label: "כללי" },
];

export default function CommitteeProvidersScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const categoryLabel = useMemo(() => {
    return CATEGORIES.find((c) => c.key === category)?.label || category;
  }, [category]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setEmail("");
    setCategory("GENERAL");
    setNotes("");
    setIsActive(true);
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await listProviders({ onlyActive: false });
      setItems(data || []);
    } catch (e) {
      Alert.alert("שגיאה", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setName(p.name || "");
    setPhone(p.phone || "");
    setEmail(p.email || "");
    setCategory(p.category || "GENERAL");
    setNotes(p.notes || "");
    setIsActive(!!p.is_active);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("שגיאה", "שם ספק הוא חובה");
      return;
    }

    try {
      setLoading(true);

      if (editing) {
        await updateProvider(editing.id, {
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          category,
          notes: notes.trim() || null,
          is_active: isActive,
        });
      } else {
        await createProvider({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          category,
          notes: notes.trim() || null,
        });
      }

      setOpen(false);
      resetForm();
      await load();
    } catch (e) {
      Alert.alert("שגיאה", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (p) => {
    Alert.alert("מחיקה", `למחוק את "${p.name}"?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await deleteProvider(p.id);
            await load();
          } catch (e) {
            Alert.alert("שגיאה", e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* כדי שהכותרת לא תיכנס מתחת לסטטוס-בר באנדרואיד */}
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowRight size={24} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={styles.header}>ניהול ספקים</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={openCreate}
            activeOpacity={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.primaryBtnText}>+ ספק חדש</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 12 }} />}

        {!loading && items.length === 0 ? (
          <Text style={styles.empty}>אין ספקים עדיין. הוסף ספק חדש.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.name}</Text>

                  <Text style={styles.meta}>
                    קטגוריה:{" "}
                    {CATEGORIES.find((c) => c.key === item.category)?.label ||
                      item.category}
                  </Text>

                  {!!item.phone && <Text style={styles.meta}>טלפון: {item.phone}</Text>}
                  {!!item.email && <Text style={styles.meta}>מייל: {item.email}</Text>}

                  <Text style={[styles.meta, { marginTop: 6 }]}>
                    סטטוס: {item.is_active ? "פעיל" : "לא פעיל"}
                  </Text>
                </View>

                <View style={styles.actionsCol}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => openEdit(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.smallBtnText}>עריכה</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallBtn, styles.dangerBtn]}
                    onPress={() => handleDelete(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.smallBtnText}>מחק</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        <Modal visible={open} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editing ? "עריכת ספק" : "יצירת ספק חדש"}
              </Text>

              <Text style={styles.label}>שם *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="לדוגמה: יוסי אינסטלציה"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>קטגוריה</Text>
              <View style={styles.rowWrap}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[
                      styles.chip,
                      category === c.key && styles.chipSelected,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        category === c.key && styles.chipTextSelected,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>טלפון</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="05X-XXXXXXX"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>מייל</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@example.com"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>הערות</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="שעות פעילות, מחירון, הערות..."
                placeholderTextColor="#9ca3af"
              />

              {editing && (
                <View style={styles.switchRow}>
                  <Text style={styles.label}>פעיל</Text>
                  <Switch value={isActive} onValueChange={setIsActive} />
                </View>
              )}

              <View style={styles.modalBtnsRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryBtnText}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {editing ? "שמור" : "צור"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hint}>
                קטגוריה נועדה כדי שבמסך המטרדים נציע ספקים רלוונטיים מהר. ({categoryLabel})
              </Text>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: { flex: 1, padding: 16, backgroundColor: "#0F172A" },

  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 10,
  },
  header: { fontSize: 20, fontWeight: "800", color: "#f8fafc" },

  empty: { marginTop: 16, textAlign: "center", color: "#94a3b8" },

  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row-reverse",
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: "800", textAlign: "right", color: "#f8fafc" },
  meta: { fontSize: 13, color: "#e2e8f0", textAlign: "right", marginTop: 3 },

  actionsCol: { justifyContent: "center", gap: 8 },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  dangerBtn: { backgroundColor: "#b91c1c", borderColor: "#b91c1c" },
  smallBtnText: { color: "white", fontWeight: "700" },

  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#2563eb",
    borderRadius: 12,
  },
  primaryBtnText: { color: "white", fontWeight: "800" },

  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#334155",
    borderRadius: 12,
  },
  secondaryBtnText: { color: "#f8fafc", fontWeight: "800" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: { backgroundColor: "#1e293b", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155" },
  modalTitle: { fontSize: 18, fontWeight: "900", textAlign: "right", marginBottom: 10, color: "#f8fafc" },

  label: { fontSize: 13, fontWeight: "700", textAlign: "right", marginTop: 10, marginBottom: 6, color: "#e2e8f0" },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: "right",
    color: "#f8fafc",
  },

  rowWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#475569", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 18 },
  chipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#e2e8f0", fontWeight: "700" },
  chipTextSelected: { color: "white" },

  switchRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 12 },

  modalBtnsRow: { flexDirection: "row-reverse", gap: 10, marginTop: 14, justifyContent: "flex-start" },
  hint: { marginTop: 10, fontSize: 12, color: "#94a3b8", textAlign: "right" },
});
