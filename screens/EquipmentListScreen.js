import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Package, ChevronLeft, Zap } from "lucide-react-native";
import { getRecommendedBuildingEquipmentByCategory } from "../API/buildingEquipmentApi";

export default function EquipmentListScreen({ navigation, route }) {
  const { buildingId, user, categoryId, categoryName } = route.params || {};

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadItems = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const data = await getRecommendedBuildingEquipmentByCategory(
  buildingId,
  categoryId,
  user?.id
);
      setItems(data || []);
    } catch (err) {
      console.error("Equipment list load error:", err);
      setError("אירעה שגיאה בטעינת פריטי הציוד.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildingId, categoryId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function renderRecommendationBadge(item) {
    if (!item.isFastBorrowRecommended) {
      return null;
    }

    return (
      <View style={styles.recommendBadge}>
        <Zap size={13} color="#0f172a" />
        <Text style={styles.recommendBadgeText}>מומלץ להשאלה מהירה</Text>
      </View>
    );
  }

  function renderRecommendationReason(item) {
    if (!item.recommendationReason) {
      return null;
    }

    return (
      <Text style={styles.recommendationReasonText}>
        {item.recommendationReason}
      </Text>
    );
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          item.isFastBorrowRecommended && styles.recommendedCard,
        ]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("EquipmentDetails", {
            equipmentId: item.id,
            buildingId,
            user,
          })
        }
      >
        {item.item_image_url ? (
          <Image source={{ uri: item.item_image_url }} style={styles.cardImage} />
        ) : item.equipment_categories?.image_url ? (
          <Image
            source={{ uri: item.equipment_categories.image_url }}
            style={styles.cardImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Package size={34} color="#f59e0b" />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <ChevronLeft size={18} color="#94a3b8" />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>

          {renderRecommendationBadge(item)}

          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description || "לא נוסף תיאור לפריט זה"}
          </Text>

          {renderRecommendationReason(item)}

          <View style={styles.metaRow}>
            <Text
              style={[
                styles.statusText,
                item.is_available ? styles.available : styles.unavailable,
              ]}
            >
              {item.is_available ? "זמין להשאלה" : "לא זמין כרגע"}
            </Text>
          </View>

          {item.isFastBorrowRecommended && (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>דירוג שכן: {item.ownerScore}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{categoryName || "רשימת ציוד"}</Text>
        <Text style={styles.headerSubTitle}>
          פריטים ממוינים לפי זמינות והתאמה להשאלה מהירה
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate("AddEquipment", {
            buildingId,
            user,
            preselectedCategoryId: categoryId,
          })
        }
      >
        <Text style={styles.addButtonText}>הוסף פריט חדש בקטגוריה זו</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>אין כרגע ציוד בקטגוריה זו</Text>
          <Text style={styles.emptySub}>אפשר להיות הראשונ/ה ולהוסיף פריט להשאלה</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadItems(true)} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", paddingHorizontal: 16 },
  header: { marginTop: 8, marginBottom: 18, alignItems: "flex-end" },
  headerTitle: { color: "#f8fafc", fontSize: 26, fontWeight: "800" },
  headerSubTitle: { color: "#94a3b8", fontSize: 13, marginTop: 4, textAlign: "right" },

  addButton: {
    backgroundColor: "#10b981",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: { color: "#0f172a", fontWeight: "800", fontSize: 15 },

  listContent: { paddingBottom: 24 },

  card: {
    backgroundColor: "rgba(30, 41, 59, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.7)",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
  },
  recommendedCard: {
    borderColor: "rgba(16, 185, 129, 0.55)",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },

  cardImage: { width: "100%", height: 160, resizeMode: "cover" },

  placeholderImage: {
    width: "100%",
    height: 160,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  cardContent: { padding: 16, alignItems: "flex-end" },

  titleRow: {
    width: "100%",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  cardTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },

  recommendBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  recommendBadgeText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
  },

  cardDescription: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
  },

  recommendationReasonText: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 8,
    textAlign: "right",
    width: "100%",
  },

  metaRow: { marginTop: 12, width: "100%", alignItems: "flex-end" },
  statusText: { fontSize: 12, fontWeight: "700" },
  available: { color: "#10b981" },
  unavailable: { color: "#fb7185" },

  scoreRow: {
    marginTop: 8,
    width: "100%",
    alignItems: "flex-end",
  },
  scoreText: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "700",
  },

  emptyBox: {
    marginTop: 40,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(30, 41, 59, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.6)",
    alignItems: "center",
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySub: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
  },
  errorText: {
    color: "#fb7185",
    textAlign: "center",
    marginTop: 30,
    fontSize: 15,
  },
});