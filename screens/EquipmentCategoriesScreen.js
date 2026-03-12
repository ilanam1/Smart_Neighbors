import React, { useEffect, useState } from "react";
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
import { Plus, ChevronLeft, Package } from "lucide-react-native";
import { getEquipmentCategories } from "../API/equipmentCategoriesApi";

export default function EquipmentCategoriesScreen({ navigation, route }) {
  const { buildingId, user } = route.params || {};

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        setLoading(true);
        setError("");
        const data = await getEquipmentCategories();
        if (mounted) {
          setCategories(data || []);
        }
      } catch (err) {
        if (mounted) {
          setError("אירעה שגיאה בטעינת הקטגוריות");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  function renderCategory({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("EquipmentList", {
            buildingId,
            user,
            categoryId: item.id,
            categoryName: item.name,
          })
        }
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

          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description || "ציוד זמין להשאלה בקטגוריה זו"}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategory}
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
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.7)",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
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