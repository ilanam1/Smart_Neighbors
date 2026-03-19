import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  ChevronLeft,
  Package,
  Sparkles,
  Search,
  CloudSun,
} from "lucide-react-native";

import { getEquipmentCategories } from "../API/equipmentCategoriesApi";
import { getRecommendedEquipmentCategories } from "../API/equipmentLoansApi";
import { searchEquipmentInBuilding } from "../API/buildingEquipmentApi";
import { getContextualEquipmentRecommendations } from "../services/contextEquipmentService";

export default function EquipmentCategoriesScreen({ navigation, route }) {
  const { buildingId, user } = route.params || {};

  const [categories, setCategories] = useState([]);
  const [recommendedCategories, setRecommendedCategories] = useState([]);
  const [contextualRecommendations, setContextualRecommendations] = useState([]);
  const [contextualTitle, setContextualTitle] = useState("");
  const [contextualReason, setContextualReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCategoriesData() {
      try {
        setLoading(true);
        setError("");

        const [allCategories, recommended, contextualData] = await Promise.all([
          getEquipmentCategories(),
          getRecommendedEquipmentCategories({
            buildingId,
            borrowerId: user?.id,
            minBorrowCount: 3,
          }),
          getContextualEquipmentRecommendations(buildingId),
        ]);

        if (!mounted) return;

        setCategories(allCategories || []);
        setRecommendedCategories(recommended || []);
        setContextualRecommendations(contextualData?.items || []);

        const title =
          contextualData?.holidayContext?.label ||
          contextualData?.weatherContext?.label ||
          "";

        const reason =
          contextualData?.holidayContext?.reason ||
          contextualData?.weatherContext?.reason ||
          "";

        setContextualTitle(title);
        setContextualReason(reason);
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

  useEffect(() => {
    let active = true;

    const timeout = setTimeout(async () => {
      const query = searchQuery.trim();

      if (!query) {
        if (active) {
          setSearchResults([]);
          setSearching(false);
        }
        return;
      }

      try {
        if (active) {
          setSearching(true);
        }

        const results = await searchEquipmentInBuilding(buildingId, query, 20);

        if (active) {
          setSearchResults(results || []);
        }
      } catch (err) {
        console.error("Search equipment error:", err);

        if (active) {
          setSearchResults([]);
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery, buildingId]);

  const recommendedIds = useMemo(() => {
    return new Set((recommendedCategories || []).map((item) => item.id));
  }, [recommendedCategories]);

  const regularCategories = useMemo(() => {
    return (categories || []).filter((category) => !recommendedIds.has(category.id));
  }, [categories, recommendedIds]);

  const isSearchingMode = searchQuery.trim().length > 0;

  function handleCategoryPress(item) {
    navigation.navigate("EquipmentList", {
      buildingId,
      user,
      categoryId: item.id,
      categoryName: item.name,
    });
  }

  function handleEquipmentPress(item) {
    navigation.navigate("EquipmentDetails", {
      equipmentId: item.id,
      buildingId,
      user,
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

  function renderContextualItem(item) {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.contextCard}
        activeOpacity={0.9}
        onPress={() => handleEquipmentPress(item)}
      >
        {item.item_image_url ? (
          <Image source={{ uri: item.item_image_url }} style={styles.contextCardImage} />
        ) : item.equipment_categories?.image_url ? (
          <Image
            source={{ uri: item.equipment_categories.image_url }}
            style={styles.contextCardImage}
          />
        ) : (
          <View style={styles.contextPlaceholder}>
            <Package size={30} color="#f59e0b" />
          </View>
        )}

        <View style={styles.contextCardContent}>
          <Text style={styles.contextCardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.contextCardCategory} numberOfLines={1}>
            {item.equipment_categories?.name || "ללא קטגוריה"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderSearchResult({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => handleEquipmentPress(item)}
      >
        {item.item_image_url ? (
          <Image source={{ uri: item.item_image_url }} style={styles.cardImage} />
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

          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description || "לא נוסף תיאור לפריט זה"}
          </Text>

          <Text style={styles.searchMetaText}>
            קטגוריה: {item.category_name || "ללא קטגוריה"}
          </Text>

          <Text
            style={[
              styles.searchMetaText,
              item.is_available ? styles.availableText : styles.unavailableText,
            ]}
          >
            {item.is_available ? "זמין להשאלה" : "לא זמין כרגע"}
          </Text>

          {item.match_reason === "same_category_fallback" && (
            <Text style={styles.fallbackText}>
              לא נמצא פריט מדויק, מוצגים פריטים מאותה קטגוריה
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderCategory({ item }) {
    return renderCategoryCard(item, false);
  }

  function renderListHeader() {
    if (isSearchingMode) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>תוצאות חיפוש</Text>
            <Text style={styles.sectionSubTitle}>
              תוצאות עבור: "{searchQuery.trim()}"
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        {contextualRecommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.contextTitleRow}>
                <CloudSun size={18} color="#10b981" />
                <Text style={styles.sectionTitle}>מומלץ לעכשיו</Text>
              </View>

              <Text style={styles.sectionSubTitle}>
                {contextualTitle || "המלצות לפי מזג האוויר או התקופה הנוכחית"}
              </Text>

              {!!contextualReason && (
                <Text style={styles.contextReasonText}>{contextualReason}</Text>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.contextualScroll}
            >
              {contextualRecommendations.map((item) => renderContextualItem(item))}
            </ScrollView>
          </View>
        )}

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>השאלת ציוד</Text>
        <Text style={styles.headerSubTitle}>
          בחר קטגוריה, חפש פריט או הוסף ציוד חדש
        </Text>
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

      <View style={styles.searchBox}>
        <Search size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="חפש פריט, למשל: מקדחה"
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign="right"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 30 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : isSearchingMode ? (
        searching ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 30 }} />
        ) : searchResults.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>לא נמצאו תוצאות לחיפוש</Text>
            <Text style={styles.emptySub}>נסה לכתוב שם אחר או מילה כללית יותר</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderSearchResult}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
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
    textAlign: "right",
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
  searchBox: {
    backgroundColor: "rgba(30, 41, 59, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.8)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
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
  contextTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
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
  contextReasonText: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 6,
    textAlign: "right",
  },
  contextualScroll: {
    paddingBottom: 8,
    flexDirection: "row-reverse",
  },
  contextCard: {
    width: 180,
    marginLeft: 12,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.35)",
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  contextCardImage: {
    width: "100%",
    height: 110,
    resizeMode: "cover",
  },
  contextPlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  contextCardContent: {
    padding: 12,
    alignItems: "flex-end",
  },
  contextCardTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
    width: "100%",
  },
  contextCardCategory: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
    width: "100%",
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
  searchMetaText: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 8,
    textAlign: "right",
    width: "100%",
  },
  availableText: {
    color: "#10b981",
  },
  unavailableText: {
    color: "#fb7185",
  },
  fallbackText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "right",
    width: "100%",
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
    textAlign: "center",
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