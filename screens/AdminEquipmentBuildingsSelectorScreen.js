import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Building2, ChevronLeft } from "lucide-react-native";
import { getSupabase } from "../DataBase/supabase";

export default function AdminEquipmentBuildingsSelectorScreen({ navigation, route }) {
  const { adminUser } = route.params || {};

  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBuildings();
  }, []);

  async function loadBuildings() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabase();

      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBuildings(data || []);
    } catch (err) {
      console.error("Load buildings error:", err);
      setError("אירעה שגיאה בטעינת הבניינים.");
    } finally {
      setLoading(false);
    }
  }

  function getBuildingTitle(item) {
    return (
      item.name ||
      item.building_name ||
      item.address ||
      item.street ||
      "בניין ללא שם"
    );
  }

  function getBuildingSubtitle(item) {
    return item.city || item.zip_code || item.id;
  }

  function renderBuilding({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("AdminEquipmentPopularityReport", {
            adminUser,
            buildingId: item.id,
            buildingName: getBuildingTitle(item),
          })
        }
      >
        <ChevronLeft size={20} color="#94a3b8" />

        <View style={styles.textBox}>
          <Text style={styles.cardTitle}>{getBuildingTitle(item)}</Text>
          <Text style={styles.cardSubtitle}>{getBuildingSubtitle(item)}</Text>
        </View>

        <View style={styles.iconCircle}>
          <Building2 size={24} color="#22d3ee" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>בחירת בניין לדוח ציוד</Text>
        <Text style={styles.subtitle}>
          בחר בניין כדי לראות אילו פריטים וקטגוריות פופולריים בו
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#22d3ee" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : buildings.length === 0 ? (
        <Text style={styles.emptyText}>לא נמצאו בניינים במערכת.</Text>
      ) : (
        <FlatList
          data={buildings}
          keyExtractor={(item) => item.id}
          renderItem={renderBuilding}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051121",
    paddingHorizontal: 18,
  },
  header: {
    marginTop: 20,
    marginBottom: 22,
    alignItems: "flex-end",
  },
  title: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "right",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 6,
    textAlign: "right",
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#0c1f38",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.5)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textBox: {
    flex: 1,
    alignItems: "flex-end",
    marginHorizontal: 12,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "right",
  },
  cardSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  iconCircle: {
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    padding: 12,
    borderRadius: 18,
  },
  errorText: {
    color: "#fb7185",
    textAlign: "center",
    marginTop: 30,
    fontWeight: "700",
  },
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 30,
  },
});