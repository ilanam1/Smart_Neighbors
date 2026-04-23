import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { ArrowRight, CalendarPlus } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { getBuildingInspections } from "../API/inspectionsApi";
import {
  createBuildingEvent,
  getBuildingEvents,
  getCurrentUserCommitteeStatus,
} from "../API/buildingEventsApi";

function formatDateKey(dateString) {
  const d = new Date(dateString);
  return d.toISOString().split("T")[0];
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BuildingCalendarScreen() {
  const navigation = useNavigation();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [isCommittee, setIsCommittee] = useState(false);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const loadAll = async () => {
    try {
      setLoading(true);

      const [inspections, events, committeeStatus] = await Promise.all([
        getBuildingInspections(),
        getBuildingEvents(),
        getCurrentUserCommitteeStatus(),
      ]);

      const mappedInspections = (inspections || []).map((item) => ({
        id: `inspection-${item.id}`,
        originalId: item.id,
        type: "inspection",
        title: `ביקורת: ${item.inspection_templates?.name || "ללא שם"}`,
        description: item.inspection_templates?.description || "",
        location: "בניין",
        startAt: item.due_date,
        endAt: null,
        status: item.effective_status || item.status,
        priority: item.inspection_templates?.priority || "MEDIUM",
        employeeName: item.service_employees?.full_name || "לא שויך",
      }));

      const mappedEvents = (events || []).map((item) => ({
        id: `event-${item.id}`,
        originalId: item.id,
        type: "event",
        title: item.title,
        description: item.description || "",
        location: item.location || "",
        startAt: item.start_at,
        endAt: item.end_at,
        eventType: item.event_type,
      }));

      const merged = [...mappedInspections, ...mappedEvents].sort(
        (a, b) => new Date(a.startAt) - new Date(b.startAt)
      );

      setItems(merged);
      setIsCommittee(committeeStatus);
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה בטעינת לוח האירועים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const markedDates = useMemo(() => {
    const marks = {};

    items.forEach((item) => {
      const key = formatDateKey(item.startAt);

      if (!marks[key]) {
        marks[key] = { dots: [] };
      }

      if (item.type === "inspection") {
        marks[key].dots.push({
          key: `${item.id}-inspection`,
          color: "#f59e0b",
        });
      } else {
        marks[key].dots.push({
          key: `${item.id}-event`,
          color: "#3b82f6",
        });
      }
    });

    marks[selectedDate] = {
      ...(marks[selectedDate] || { dots: [] }),
      selected: true,
      selectedColor: "#2563eb",
    };

    return marks;
  }, [items, selectedDate]);

  const selectedDayItems = useMemo(() => {
    return items.filter((item) => formatDateKey(item.startAt) === selectedDate);
  }, [items, selectedDate]);

  const openCreateModal = () => {
    const now = new Date();
    const rounded = new Date(now.getTime() + 60 * 60 * 1000);
    const defaultStart = rounded.toISOString().slice(0, 16);

    setTitle("");
    setDescription("");
    setLocation("");
    setStartAt(defaultStart);
    setEndAt("");
    setOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      Alert.alert("שגיאה", "יש להזין כותרת לאירוע");
      return;
    }

    if (!startAt.trim()) {
      Alert.alert("שגיאה", "יש להזין תאריך ושעה להתחלה");
      return;
    }

    try {
      setLoading(true);

      const parsedStart = new Date(startAt);
      if (isNaN(parsedStart.getTime())) {
        throw new Error("פורמט תאריך התחלה לא תקין");
      }

      let parsedEnd = null;
      if (endAt.trim()) {
        parsedEnd = new Date(endAt);
        if (isNaN(parsedEnd.getTime())) {
          throw new Error("פורמט תאריך סיום לא תקין");
        }

        if (parsedEnd <= parsedStart) {
          throw new Error("תאריך הסיום חייב להיות אחרי תאריך ההתחלה");
        }
      }

      await createBuildingEvent({
        title,
        description,
        location,
        startAt: parsedStart.toISOString(),
        endAt: parsedEnd ? parsedEnd.toISOString() : null,
        eventType: "GENERAL",
      });

      setOpen(false);
      await loadAll();
      Alert.alert("הצלחה", "האירוע נוסף ללוח האירועים");
    } catch (e) {
      console.log(e);
      Alert.alert("שגיאה", e.message || "שגיאה ביצירת האירוע");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isInspection = item.type === "inspection";

    return (
      <View style={[styles.card, isInspection ? styles.inspectionCard : styles.eventCard]}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, isInspection ? styles.inspectionBadge : styles.eventBadge]}>
            <Text style={styles.badgeText}>
              {isInspection ? "ביקורת" : "אירוע"}
            </Text>
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>

        <Text style={styles.cardText}>
          שעה: {formatTime(item.startAt)}
          {item.endAt ? ` - ${formatTime(item.endAt)}` : ""}
        </Text>

        {!!item.location && (
          <Text style={styles.cardText}>מיקום: {item.location}</Text>
        )}

        {!!item.description && (
          <Text style={styles.cardText}>תיאור: {item.description}</Text>
        )}

        {isInspection && (
          <>
            <Text style={styles.cardText}>אחראי: {item.employeeName}</Text>
            <Text style={styles.cardText}>סטטוס: {item.status}</Text>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowRight size={24} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={styles.header}>לוח אירועי הבניין</Text>
          </View>

          {isCommittee && (
            <TouchableOpacity style={styles.primaryBtn} onPress={openCreateModal}>
              <CalendarPlus size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>אירוע חדש</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color="#38bdf8" />
        ) : (
          <>
            <Calendar
              markedDates={markedDates}
              markingType="multi-dot"
              onDayPress={(day) => setSelectedDate(day.dateString)}
              theme={{
                calendarBackground: "#1e293b",
                dayTextColor: "#f8fafc",
                monthTextColor: "#f8fafc",
                textSectionTitleColor: "#cbd5e1",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#38bdf8",
                arrowColor: "#38bdf8",
              }}
              style={styles.calendar}
            />

            <Text style={styles.selectedDateTitle}>
              אירועים ליום {new Date(selectedDate).toLocaleDateString("he-IL")}
            </Text>

            {selectedDayItems.length === 0 ? (
              <Text style={styles.empty}>אין אירועים או ביקורות ביום זה.</Text>
            ) : (
              <FlatList
                data={selectedDayItems}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </>
        )}

        <Modal visible={open} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>הוספת אירוע חדש</Text>

              <Text style={styles.label}>כותרת</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="למשל: ישיבת דיירים"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <Text style={styles.label}>תיאור</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="פרטים על האירוע..."
                placeholderTextColor="#94a3b8"
                textAlign="right"
                multiline
              />

              <Text style={styles.label}>מיקום</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="לובי / חדר אשפה / גג / חניה"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <Text style={styles.label}>תחילת אירוע (YYYY-MM-DDTHH:MM)</Text>
              <TextInput
                style={styles.input}
                value={startAt}
                onChangeText={setStartAt}
                placeholder="2026-05-10T18:00"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <Text style={styles.label}>סיום אירוע (אופציונלי)</Text>
              <TextInput
                style={styles.input}
                value={endAt}
                onChangeText={setEndAt}
                placeholder="2026-05-10T20:00"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <View style={styles.modalBtnsRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setOpen(false)}>
                  <Text style={styles.secondaryBtnText}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateEvent}>
                  <Text style={styles.primaryBtnText}>שמור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  container: { flex: 1, padding: 16, backgroundColor: "#0F172A" },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
  },
  calendar: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  selectedDateTitle: {
    color: "#f8fafc",
    fontWeight: "800",
    fontSize: 16,
    textAlign: "right",
    marginBottom: 10,
  },
  empty: {
    marginTop: 10,
    textAlign: "center",
    color: "#94a3b8",
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  inspectionCard: {
    backgroundColor: "#3b2f12",
    borderColor: "#f59e0b",
  },
  eventCard: {
    backgroundColor: "#172554",
    borderColor: "#3b82f6",
  },
  badgeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inspectionBadge: { backgroundColor: "#f59e0b" },
  eventBadge: { backgroundColor: "#2563eb" },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
    marginRight: 8,
  },
  cardText: {
    color: "#e2e8f0",
    textAlign: "right",
    marginTop: 5,
    lineHeight: 21,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 10,
  },
  label: {
    color: "#e2e8f0",
    textAlign: "right",
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#f8fafc",
  },
  modalBtnsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 18,
  },
  secondaryBtn: {
    backgroundColor: "#334155",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: "#f8fafc",
    fontWeight: "800",
  },
});