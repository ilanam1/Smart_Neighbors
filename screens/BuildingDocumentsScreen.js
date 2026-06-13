// screens/BuildingDocumentsScreen.js
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  Image,
  Dimensions } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import ActivityIndicator from '../components/CustomLoader';

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
            <FileText size={20} color="#f97316" />
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
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Image
        source={require('../assets/app_internal_bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* כותרת עמוד אלגנטית */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>מסמכי הבניין</Text>
            <Text style={styles.headerSubTitle}>מסמכים משותפים, חוזים וקבצי ועד הבית</Text>
          </View>

          {/* כפתור העלאה */}
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
              color="#f97316"
              style={{ marginTop: 30 }}
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
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  bgImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
    alignItems: "flex-end",
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "800",
  },
  headerSubTitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
    textAlign: "right",
  },
  uploadWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  uploadBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#f97316",
    borderRadius: 24,
    gap: 8,
  },
  uploadText: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    marginTop: 30,
    textAlign: "center",
    fontSize: 15,
  },
  emptyText: {
    color: "#cbd5e1",
    marginTop: 40,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },
  docItem: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  docLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    flex: 1,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  docText: {
    flex: 1,
    alignItems: "flex-end",
  },
  docTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  docSub: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
  },
});
