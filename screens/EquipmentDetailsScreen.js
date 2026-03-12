import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Package } from "lucide-react-native";
import { getEquipmentItemById } from "../API/buildingEquipmentApi";

export default function EquipmentDetailsScreen({ navigation, route }) {
  const { equipmentId, buildingId, user } = route.params || {};

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadItem() {
      try {
        setLoading(true);
        const data = await getEquipmentItemById(equipmentId);
        if (mounted) setItem(data);
      } catch (err) {
        console.error("Equipment details load error:", err);
        Alert.alert("שגיאה", "לא ניתן היה לטעון את פרטי הציוד.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadItem();

    return () => {
      mounted = false;
    };
  }, [equipmentId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>הפריט לא נמצא.</Text>
      </SafeAreaView>
    );
  }

  const isOwner = item.owner_id === user?.id;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {item.item_image_url ? (
          <Image source={{ uri: item.item_image_url }} style={styles.image} />
        ) : item.equipment_categories?.image_url ? (
          <Image source={{ uri: item.equipment_categories.image_url }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Package size={40} color="#f59e0b" />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.category}>
            קטגוריה: {item.equipment_categories?.name || "ללא קטגוריה"}
          </Text>
          <Text style={styles.status}>
            סטטוס: {item.is_available ? "זמין להשאלה" : "לא זמין כרגע"}
          </Text>

          <Text style={styles.sectionTitle}>תיאור</Text>
          <Text style={styles.description}>
            {item.description || "לא נוסף תיאור לפריט זה."}
          </Text>
        </View>

        {!isOwner && item.is_available && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate("RequestLoan", {
                equipmentId: item.id,
                equipmentTitle: item.title,
                buildingId,
                ownerId: item.owner_id,
                user,
              })
            }
          >
            <Text style={styles.primaryButtonText}>בקשת השאלה</Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <View style={styles.ownerNotice}>
            <Text style={styles.ownerNoticeText}>זהו פריט שהועלה על ידך.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  content: { padding: 16, paddingBottom: 40 },
  image: {
    width: "100%",
    height: 230,
    borderRadius: 24,
    marginBottom: 16,
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: 230,
    borderRadius: 24,
    marginBottom: 16,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.7)",
    padding: 18,
    alignItems: "flex-end",
  },
  title: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "right",
  },
  category: {
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 6,
    textAlign: "right",
  },
  status: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 18,
    textAlign: "right",
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "right",
    alignSelf: "flex-end",
  },
  description: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: "#10b981",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 15,
  },
  ownerNotice: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
  },
  ownerNoticeText: {
    color: "#93c5fd",
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: "#fb7185",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
});