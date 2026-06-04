import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import ActivityIndicator from '../components/CustomLoader';
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Wrench, Clock, Building } from "lucide-react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { getEmployeeOpenJobs } from "../API/jobRequestsApi";

export default function EmployeeJobRequestsListScreen({ route }) {
  const { employeeId } = route.params || {};
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    if (!employeeId) {
      Alert.alert("שגיאה", "לא התקבל מזהה נותן שירות.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await getEmployeeOpenJobs(employeeId);
      setJobs(data || []);
    } catch (e) {
      Alert.alert("שגיאה", "שגיאה בטעינת הבקשות: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadJobs();
    }
  }, [isFocused, employeeId]);

  const handlePressJob = (job) => {
    const fakeNotification = {
      id: `job-${job.id}`,
      sender_id: job.manager_uid,
      recipient_id: employeeId,
      related_data: {
        job_id: job.id,
        report_id: job.report_id,
        employee_id: employeeId,
        building_id: job.building_id,
        building_name: job.buildings?.name || "בניין לא ידוע",
        manager_uid: job.manager_uid,
        manager_name: "נציג ועד",
        tenant_id: job.disturbance_reports?.auth_user_id || null,
        report_type: job.disturbance_reports?.type || null,
        instructions: job.instructions,
        schedule_time: job.schedule_time,
        is_handled: job.status === "DONE" || job.status === "REJECTED",
      },
    };

    navigation.navigate("EmployeeJobRequest", { notification: fakeNotification });
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Image
        source={require('../assets/app_internal_bg.png')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: Dimensions.get('screen').width,
          height: Dimensions.get('screen').height,
        }}
        resizeMode="cover"
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronRight size={28} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>בקשות שירות פתוחות</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 40 }} />
          ) : jobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Wrench size={48} color="rgba(249, 115, 22, 0.4)" />
              <Text style={styles.emptyStateText}>אין לך בקשות שירות פתוחות כרגע.</Text>
            </View>
          ) : (
            <FlatList
              data={jobs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => handlePressJob(item)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {item.status === "PENDING"
                          ? "ממתין"
                          : item.status === "ACCEPTED"
                          ? "בביצוע"
                          : "בטיפול"}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
                      <Building size={16} color="#f97316" />
                      <Text style={styles.buildingName}>
                        {item.buildings?.name || "בניין לא ידוע"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.instructions} numberOfLines={2}>
                    {item.instructions}
                  </Text>

                  <View style={styles.timeRow}>
                    <Clock size={14} color="#f97316" />
                    <Text style={styles.timeText}>{item.schedule_time}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    marginTop: 60,
    alignItems: "center",
    gap: 10,
  },
  emptyStateText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRightWidth: 4,
    borderRightColor: "#f97316",
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    borderColor: "rgba(249, 115, 22, 0.2)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: "#f97316",
    fontSize: 12,
    fontWeight: "800",
  },
  buildingName: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
    marginRight: 6,
    textAlign: "right",
  },
  instructions: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "right",
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    color: "#cbd5e1",
    fontSize: 13,
    textAlign: "right",
  },
});