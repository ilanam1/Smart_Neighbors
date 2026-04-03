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
  deleteProvider,
  listCompanies,
  listEmployeesByCompany,
  assignEmployeeToBuilding
} from "../API/serviceProvidersApi";

export default function CommitteeProvidersScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal
  const [open, setOpen] = useState(false);
  const [creationMode, setCreationMode] = useState("existing"); // "existing" | "new"

  // form
  const [companyId, setCompanyId] = useState("");
  
  // existing mode
  const [companyEmployees, setCompanyEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  // new mode
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");


  const resetForm = () => {
    setCreationMode("existing");
    setName("");
    setPhone("");
    setPassword("");
    if (companies.length > 0) setCompanyId(companies[0].id);
  };

  const load = async () => {
    try {
      setLoading(true);
      const comps = await listCompanies();
      setCompanies(comps);
      if (comps.length > 0 && !companyId) {
        setCompanyId(comps[0].id);
      }

      const data = await listProviders();
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

  useEffect(() => {
    if (companyId) {
      listEmployeesByCompany(companyId).then(data => {
        setCompanyEmployees(data);
        if (data.length > 0) setSelectedEmployeeId(data[0].id);
        else setSelectedEmployeeId("");
      }).catch(console.log);
    } else {
      setCompanyEmployees([]);
      setSelectedEmployeeId("");
    }
  }, [companyId]);

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const handleSave = async () => {
    if (!companyId) {
      Alert.alert("שגיאה", "נא לבחור חברה");
      return;
    }

    try {
      setLoading(true);

      if (creationMode === "existing") {
        if (!selectedEmployeeId) {
          Alert.alert("שגיאה", "אנא בחר עובד מתוך הרשימה");
          setLoading(false);
          return;
        }
        await assignEmployeeToBuilding(selectedEmployeeId);
      } else {
        if (!name.trim()) return Alert.alert("שגיאה", "שם ספק הוא חובה");
        if (!phone.trim()) return Alert.alert("שגיאה", "מספר טלפון הוא חובה");
        if (!password.trim()) return Alert.alert("שגיאה", "סיסמה היא חובה");
        
        await createProvider({
          name: name.trim(),
          phone: phone.trim() || null,
          password: password.trim(),
          company_id: companyId
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
                    חברה: {item.company_name}
                  </Text>
                  
                  <Text style={styles.meta}>
                    סוג שירות: {item.category}
                  </Text>

                  {!!item.phone && <Text style={styles.meta}>טלפון (לוגין): {item.phone}</Text>}
                </View>

                <View style={styles.actionsCol}>
                  <TouchableOpacity
                    style={[styles.smallBtn, styles.dangerBtn]}
                    onPress={() => handleDelete(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.smallBtnText}>הסר שיוך</Text>
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
                הוספת ספק
              </Text>

              <Text style={styles.label}>1. בחר חברה מתוך המאגר</Text>
              <View style={styles.rowWrap}>
                {companies.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCompanyId(c.id)}
                    style={[
                      styles.chip,
                      companyId === c.id && styles.chipSelected,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        companyId === c.id && styles.chipTextSelected,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>2. בחר פעולה</Text>
              <View style={styles.rowWrap}>
                <TouchableOpacity
                  onPress={() => setCreationMode("existing")}
                  style={[styles.chip, creationMode === "existing" && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, creationMode === "existing" && styles.chipTextSelected]}>שיוך עובד קיים בחברה</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCreationMode("new")}
                  style={[styles.chip, creationMode === "new" && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, creationMode === "new" && styles.chipTextSelected]}>✨ רישום עובד חדש במערכת</Text>
                </TouchableOpacity>
              </View>

              {creationMode === "existing" ? (
                <>
                  <Text style={styles.label}>3. בחר עובד מהחברה לשיוך אל הבניין שלך</Text>
                  <View style={styles.rowWrap}>
                    {companyEmployees.length === 0 ? (
                      <Text style={styles.hint}>אין למערכת עובדים מוכרים בחברה זו. בחר 'רישום עובד חדש'.</Text>
                    ) : (
                      companyEmployees.map((e) => (
                        <TouchableOpacity
                          key={e.id}
                          onPress={() => setSelectedEmployeeId(e.id)}
                          style={[
                            styles.chip,
                            selectedEmployeeId === e.id && styles.chipSelected,
                          ]}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              selectedEmployeeId === e.id && styles.chipTextSelected,
                            ]}
                          >
                            {e.full_name} ({e.phone})
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>שם העובד החדש *</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="לדוגמה: משה (אבטחה)"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.label}>מספר טלפון (קוד התחברות שלו) *</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="05X-XXXXXXX"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.label}>סיסמה לעובד *</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="הזן סיסמה ראשונית (לפחות 8 תווים)"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                  />
                </>
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
                    שמור
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hint}>
                {creationMode === "new" ? "שים לב: העובד החדש יישמר במאגר המרכזי ויוכל לתת שירות לבניינים נוספים." : "שיוך עובד זה אומר שהוא יוכל לקבל התראות מהבניין שלך באפליקציה."}
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
