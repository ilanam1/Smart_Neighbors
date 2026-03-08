// screens/BuildingDocumentsScreen.js
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Linking,
  SafeAreaView,
} from "react-native";

import { pick, types } from "@react-native-documents/picker";

import {
  getBuildingDocuments,
  uploadBuildingDocument,
  deleteBuildingDocument,
} from "../API/buildingDocumentsApi";

import { FileText, Upload, Trash2 } from "lucide-react-native";
import { getSupabase } from "../DataBase/supabase";

export default function BuildingDocumentsScreen({ route }) {
  const navigation = useNavigation();
  const supabase = getSupabase();

  // מגיע מהניווט
  const { user, isCommittee, buildingId } = route.params || {};

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function loadDocs() {
    try {
      setLoading(true);
      setError(null);
      const data = await getBuildingDocuments(buildingId);
      setDocs(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  // יצירת URL לצפייה במסמך (במידה וה-Bucket ציבורי)
  function getPublicUrl(path) {
    const { data } = supabase.storage
      .from("building_documents")
      .getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleOpenDoc(item) {
    try {
      const url = getPublicUrl(item.file_path);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("שגיאה", "לא ניתן לפתוח את המסמך");
    }
  }
  async function handleUpload() {
    try {
      const [res] = await pick({
        type: [types.allFiles],
        mode: 'open',
      });

      if (!res) {
        return;
      }

      const title = res.name || "מסמך בניין";

      setUploading(true);

      await uploadBuildingDocument({
        uri: res.fileCopyUri ?? res.uri,
        name: res.name,
        type: res.mimeType,
        title,
        buildingId: buildingId || null,
        userId: user?.id,
      });

      Alert.alert("הצלחה", "המסמך הועלה בהצלחה");
      loadDocs();
    } catch (e) {
      if (e.code === 'DOCUMENT_PICKER_CANCELED') {
        return;
      }
      console.error(e);
      Alert.alert("שגיאה", "הייתה בעיה בהעלאת המסמך");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId) {
    Alert.alert("מחיקת מסמך", "האם אתה בטוח שברצונך למחוק את המסמך?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBuildingDocument(docId);
            loadDocs();
          } catch (e) {
            Alert.alert("שגיאה", "לא ניתן למחוק את המסמך");
          }
        },
      },
    ]);
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.docItem}
        onPress={() => handleOpenDoc(item)}
      >
        <View style={styles.docLeft}>
          <View style={styles.docIcon}>
            <FileText size={20} color="#38bdf8" />
          </View>
          <View style={styles.docText}>
            <Text style={styles.docTitle}>{item.title}</Text>
            <Text style={styles.docSub}>
              נוצר בתאריך:{" "}
              {new Date(item.created_at).toLocaleDateString("he-IL")}
            </Text>
          </View>
        </View>

        {isCommittee && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={18} color="#f87171" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* כותרת מסך + כפתור חזרה במרכז */}
        <View style={styles.header}>
          <Text style={styles.title}>מסמכי בניין</Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>חזרה למסך הקודם</Text>
          </TouchableOpacity>
        </View>

        {/* כפתור העלאה באמצע למעלה */}
        {isCommittee && (
          <View style={styles.uploadWrapper}>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <>
                  <Upload size={18} color="#0f172a" />
                  <Text style={styles.uploadText}>העלאת מסמך</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* תוכן המסמכים */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#38bdf8"
            style={{ marginTop: 20 }}
          />
        ) : error ? (
          <Text style={styles.errorText}>שגיאה: {error}</Text>
        ) : docs.length === 0 ? (
          <Text style={styles.emptyText}>אין עדיין מסמכים לבניין.</Text>
        ) : (
          <FlatList
            data={docs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 10 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.15)",
  },
  backText: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "600",
  },
  uploadWrapper: {
    alignItems: "center",
    marginVertical: 12,
  },
  uploadBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#22c55e",
    borderRadius: 24,
  },
  uploadText: {
    marginHorizontal: 6,
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 14,
  },
  errorText: {
    color: "#f87171",
    marginTop: 20,
    textAlign: "center",
  },
  emptyText: {
    color: "#94a3b8",
    marginTop: 20,
    textAlign: "center",
  },
  docItem: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  docLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    flex: 1,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  docText: {
    flex: 1,
    alignItems: "flex-end",
  },
  docTitle: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  docSub: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
});
