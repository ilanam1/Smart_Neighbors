import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, ChevronLeft, Package, Sparkles } from "lucide-react-native";
import { getEquipmentCategories } from "../API/equipmentCategoriesApi";
import { getRecommendedEquipmentCategories } from "../API/equipmentLoansApi";

export default function EquipmentCategoriesScreen({ navigation, route }) {
  const { buildingId, user } = route.params || {};

  const [categories, setCategories] = useState([]);
  const [recommendedCategories, setRecommendedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCategoriesData() {
      try {
        setLoading(true);
        setError("");

        const [allCategories, recommended] = await Promise.all([
          getEquipmentCategories(),
          getRecommendedEquipmentCategories({
            buildingId,
            borrowerId: user?.id,
            minBorrowCount: 3,
          }),
        ]);

        if (!mounted) return;

        setCategories(allCategories || []);
        setRecommendedCategories(recommended || []);
      } catch (err) {
        console.error("Equipment categories load error:", err);

        if (mounted) {
          setError("אירעה שגיאה בטעינת הקטגוריות");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCategoriesData();

    return () => {
      mounted = false;
    };
  }, [buildingId, user?.id]);

  const recommendedIds = useMemo(() => {
    return new Set((recommendedCategories || []).map((item) => item.id));
  }, [recommendedCategories]);

  const regularCategories = useMemo(() => {
    return (categories || []).filter((category) => !recommendedIds.has(category.id));
  }, [categories, recommendedIds]);

  function handleCategoryPress(item) {
    navigation.navigate("EquipmentList", {
      buildingId,
      user,
      categoryId: item.id,
      categoryName: item.name,
    });
  }

  function renderCategoryCard(item, isRecommended = false) {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, isRecommended && styles.recommendedCard]}
        activeOpacity={0.9}
        onPress={() => handleCategoryPress(item)}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Package size={34} color="#f59e0b" />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <ChevronLeft size={18} color="#94a3b8" />
            <Text style={styles.cardTitle}>{item.name}</Text>
          </View>

          {isRecommended && (
            <View style={styles.recommendBadge}>
              <Sparkles size={14} color="#0f172a" />
              <Text style={styles.recommendBadgeText}>
                מומלץ עבורך{item.borrowCount ? ` · ${item.borrowCount} השאלות` : ""}
              </Text>
            </View>
          )}

          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description || "ציוד זמין להשאלה בקטגוריה זו"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderListHeader() {
    return (
      <View>
        {recommendedCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>מומלץ עבורך</Text>
              <Text style={styles.sectionSubTitle}>
                קטגוריות שבהן השתמשת מספר פעמים בעבר
              </Text>
            </View>

            {recommendedCategories.map((item) => renderCategoryCard(item, true))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>כל הקטגוריות</Text>
            <Text style={styles.sectionSubTitle}>
              בחר קטגוריה לצפייה בציוד הזמין בבניין
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function renderCategory({ item }) {
    return renderCategoryCard(item, false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>השאלת ציוד</Text>
        <Text style={styles.headerSubTitle}>בחר קטגוריה או הוסף ציוד חדש</Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate("AddEquipment", {
            buildingId,
            user,
          })
        }
      >
        <Plus size={18} color="#0f172a" />
        <Text style={styles.addButtonText}>הצע ציוד חדש להשאלה</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 30 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={regularCategories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategory}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
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
  },
  addButton: {
    backgroundColor: "#10b981",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  addButtonText: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 30,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    marginBottom: 12,
    alignItems: "flex-end",
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
  },
  sectionSubTitle: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.7)",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
  },
  recommendedCard: {
    borderColor: "rgba(16, 185, 129, 0.6)",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  cardImage: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: 150,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: 16,
    alignItems: "flex-end",
  },
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
  errorText: {
    color: "#fb7185",
    textAlign: "center",
    marginTop: 30,
    fontSize: 15,
  },
});