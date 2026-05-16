import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { launchImageLibrary } from "react-native-image-picker";
import { ImagePlus, X } from "lucide-react-native";

import { getSupabase } from "../DataBase/supabase";
import { getEquipmentCategories } from "../API/equipmentCategoriesApi";
import {
  createEquipmentItem,
  uploadEquipmentImageFromUri,
} from "../API/buildingEquipmentApi";

export default function AddEquipmentScreen({ navigation, route }) {
  const { buildingId, user, preselectedCategoryId = null } = route.params || {};

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(preselectedCategoryId);

  const supabase = getSupabase();

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoadingCategories(true);

        const [categoriesData, profileResponse] = await Promise.all([
          getEquipmentCategories(),
          supabase
            .from("profiles")
            .select("id, auth_uid, first_name, last_name, building_id")
            .eq("auth_uid", user?.id)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        setCategories(categoriesData || []);

        if (profileResponse.error) throw profileResponse.error;
        setProfile(profileResponse.data || null);
      } catch (err) {
        console.error("Add equipment load error:", err);
        Alert.alert("שגיאה", "לא ניתן היה לטעון את הנתונים למסך.");
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [supabase, user?.id]);

  async function handlePickImage() {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert("שגיאה", "לא נבחרה תמונה תקינה.");
        return;
      }

      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert("שגיאה", "גודל התמונה חייב להיות עד 5MB.");
        return;
      }

      setSelectedImage(asset);
    } catch (err) {
      console.error("Pick image error:", err);
      Alert.alert("שגיאה", "לא ניתן היה לבחור תמונה.");
    }
  }

  async function handleCreateEquipment() {
    try {
      if (!title.trim()) {
        Alert.alert("שגיאה", "יש להזין שם לפריט.");
        return;
      }

      if (title.trim().length < 2) {
        Alert.alert("שגיאה", "שם הפריט חייב להכיל לפחות 2 תווים.");
        return;
      }

      if (!selectedCategoryId) {
        Alert.alert("שגיאה", "יש לבחור קטגוריה.");
        return;
      }

      const ownerId = user?.id;
      if (!ownerId) {
        Alert.alert("שגיאה", "לא זוהה משתמש מחובר.");
        return;
      }

      const finalBuildingId = buildingId || profile?.building_id;

      if (!finalBuildingId) {
        Alert.alert("שגיאה", "לא זוהה בניין עבור המשתמש.");
        return;
      }

      setSaving(true);

      let uploadedImageUrl = null;

      if (selectedImage?.uri) {
        uploadedImageUrl = await uploadEquipmentImageFromUri({
          imageUri: selectedImage.uri,
          fileName: selectedImage.fileName,
          mimeType: selectedImage.type,
          buildingId: finalBuildingId,
          ownerId,
        });
      }

      await createEquipmentItem({
        buildingId: finalBuildingId,
        ownerId,
        categoryId: selectedCategoryId,
        title: title.trim(),
        description: description.trim() || null,
        itemImageUrl: uploadedImageUrl,
      });

      Alert.alert("הצלחה", "הציוד נוסף בהצלחה למערכת.", [
        {
          text: "אישור",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error("Create equipment error:", err);
      Alert.alert("שגיאה", err?.message || "אירעה שגיאה בהוספת הציוד.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingCategories) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>הצעת ציוד להשאלה</Text>
          <Text style={styles.headerSubTitle}>מלא את פרטי הפריט שתרצה להציע לשכנים</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>שם הפריט</Text>
          <TextInput
            style={styles.input}
            placeholder="למשל: מקדחה"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>תיאור</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="הוסף תיאור קצר על מצב הפריט או אופן השימוש"
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
            textAlign="right"
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>תמונה של הפריט</Text>

          {selectedImage?.uri ? (
            <View style={styles.imagePreviewBox}>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />

              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <X size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
              <ImagePlus size={22} color="#10b981" />
              <Text style={styles.imagePickerText}>בחר תמונה מהגלריה</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>בחר קטגוריה</Text>
          <View style={styles.categoriesWrap}>
            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id;

              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && { opacity: 0.7 }]}
          onPress={handleCreateEquipment}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.submitButtonText}>שמור ציוד להשאלה</Text>
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
  headerTitle: { color: "#f8fafc", fontSize: 26, fontWeight: "800" },
  headerSubTitle: { color: "#94a3b8", fontSize: 13, marginTop: 4, textAlign: "right" },
  section: { marginBottom: 20 },
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
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  imagePickerButton: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(16, 185, 129, 0.65)",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePickerText: {
    color: "#10b981",
    fontWeight: "800",
    fontSize: 14,
  },
  imagePreviewBox: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.8)",
  },
  previewImage: {
    width: "100%",
    height: 210,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 999,
    padding: 8,
  },
  categoriesWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.5)",
    backgroundColor: "rgba(30, 41, 59, 0.55)",
  },
  categoryChipSelected: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  categoryChipText: {
    color: "#cbd5e1",
    fontWeight: "700",
  },
  categoryChipTextSelected: {
    color: "#0f172a",
  },
  submitButton: {
    backgroundColor: "#10b981",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 15,
  },
});