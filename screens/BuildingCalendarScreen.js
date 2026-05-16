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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { ArrowRight, CalendarPlus, CalendarDays, Clock } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

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

  // במקום לשמור תאריך כמחרוזת, שומרים אובייקטי Date תקינים
  const [startAt, setStartAt] = useState(new Date());
  const [endAt, setEndAt] = useState(null);

  // שליטה על פתיחת בוחר תאריך/שעה להתחלה ולסיום
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

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

    // ברירת מחדל: התחלה בעוד שעה
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000);

    // ברירת מחדל: סיום שעתיים אחרי עכשיו
    const defaultEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    setTitle("");
    setDescription("");
    setLocation("");
    setStartAt(defaultStart);
    setEndAt(defaultEnd);

    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);

    setOpen(true);
  };

  const handleStartDateChange = (event, selectedDateValue) => {
    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedDateValue) {
      const updatedDate = new Date(startAt);

      updatedDate.setFullYear(selectedDateValue.getFullYear());
      updatedDate.setMonth(selectedDateValue.getMonth());
      updatedDate.setDate(selectedDateValue.getDate());

      setStartAt(updatedDate);

      if (endAt && endAt <= updatedDate) {
        const newEnd = new Date(updatedDate.getTime() + 60 * 60 * 1000);
        setEndAt(newEnd);
      }
    }
  };

  const handleStartTimeChange = (event, selectedTimeValue) => {
    if (Platform.OS === "android") {
      setShowStartTimePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedTimeValue) {
      const updatedDate = new Date(startAt);

      updatedDate.setHours(selectedTimeValue.getHours());
      updatedDate.setMinutes(selectedTimeValue.getMinutes());
      updatedDate.setSeconds(0);
      updatedDate.setMilliseconds(0);

      setStartAt(updatedDate);

      if (endAt && endAt <= updatedDate) {
        const newEnd = new Date(updatedDate.getTime() + 60 * 60 * 1000);
        setEndAt(newEnd);
      }
    }
  };

  const handleEndDateChange = (event, selectedDateValue) => {
    if (Platform.OS === "android") {
      setShowEndDatePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedDateValue) {
      const currentEnd = endAt || new Date(startAt.getTime() + 60 * 60 * 1000);
      const updatedDate = new Date(currentEnd);

      updatedDate.setFullYear(selectedDateValue.getFullYear());
      updatedDate.setMonth(selectedDateValue.getMonth());
      updatedDate.setDate(selectedDateValue.getDate());

      setEndAt(updatedDate);
    }
  };

  const handleEndTimeChange = (event, selectedTimeValue) => {
    if (Platform.OS === "android") {
      setShowEndTimePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedTimeValue) {
      const currentEnd = endAt || new Date(startAt.getTime() + 60 * 60 * 1000);
      const updatedDate = new Date(currentEnd);

      updatedDate.setHours(selectedTimeValue.getHours());
      updatedDate.setMinutes(selectedTimeValue.getMinutes());
      updatedDate.setSeconds(0);
      updatedDate.setMilliseconds(0);

      setEndAt(updatedDate);
    }
  };

  const clearEndDate = () => {
    setEndAt(null);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
  };

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      Alert.alert("שגיאה", "יש להזין כותרת לאירוע");
      return;
    }

    const parsedStart = new Date(startAt);

    if (isNaN(parsedStart.getTime())) {
      Alert.alert("שגיאה", "תאריך התחלת האירוע אינו תקין");
      return;
    }

    let parsedEnd = null;

    if (endAt) {
      parsedEnd = new Date(endAt);

      if (isNaN(parsedEnd.getTime())) {
        Alert.alert("שגיאה", "תאריך סיום האירוע אינו תקין");
        return;
      }

      if (parsedEnd <= parsedStart) {
        Alert.alert("שגיאה", "תאריך הסיום חייב להיות אחרי תאריך ההתחלה");
        return;
      }
    }

    try {
      setLoading(true);

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
      <View
        style={[
          styles.card,
          isInspection ? styles.inspectionCard : styles.eventCard,
        ]}
      >
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              isInspection ? styles.inspectionBadge : styles.eventBadge,
            ]}
          >
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
              renderArrow={(direction) => (
                <Text style={styles.calendarArrow}>
                  {direction === "left" ? "‹" : "›"}
                </Text>
              )}
              theme={{
                calendarBackground: "#1e293b",
                dayTextColor: "#f8fafc",
                monthTextColor: "#f8fafc",
                textSectionTitleColor: "#cbd5e1",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#38bdf8",

                // תיקון צבעי החצים כדי שלא ייעלמו ברקע
                arrowColor: "#ffffff",
                arrowStyle: {
                  padding: 8,
                },

                textDisabledColor: "#64748b",
                textDayFontWeight: "600",
                textMonthFontWeight: "900",
                textDayHeaderFontWeight: "800",
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

              <Text style={styles.label}>תחילת אירוע</Text>

              <View style={styles.dateActionsRow}>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <CalendarDays size={18} color="#38bdf8" />
                  <Text style={styles.datePickerButtonText}>
                    {startAt.toLocaleDateString("he-IL")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Clock size={18} color="#38bdf8" />
                  <Text style={styles.datePickerButtonText}>
                    {startAt.toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showStartDatePicker && (
                <DateTimePicker
                  value={startAt}
                  mode="date"
                  display="calendar"
                  onChange={handleStartDateChange}
                />
              )}

              {showStartTimePicker && (
                <DateTimePicker
                  value={startAt}
                  mode="time"
                  display="clock"
                  onChange={handleStartTimeChange}
                />
              )}

              <View style={styles.endHeaderRow}>
                <Text style={styles.label}>סיום אירוע</Text>

                <TouchableOpacity onPress={clearEndDate}>
                  <Text style={styles.clearEndText}>ללא שעת סיום</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateActionsRow}>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <CalendarDays size={18} color="#38bdf8" />
                  <Text style={styles.datePickerButtonText}>
                    {endAt
                      ? endAt.toLocaleDateString("he-IL")
                      : "בחר תאריך"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Clock size={18} color="#38bdf8" />
                  <Text style={styles.datePickerButtonText}>
                    {endAt
                      ? endAt.toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "בחר שעה"}
                  </Text>
                </TouchableOpacity>
              </View>

              {showEndDatePicker && (
                <DateTimePicker
                  value={endAt || new Date(startAt.getTime() + 60 * 60 * 1000)}
                  mode="date"
                  display="calendar"
                  onChange={handleEndDateChange}
                />
              )}

              {showEndTimePicker && (
                <DateTimePicker
                  value={endAt || new Date(startAt.getTime() + 60 * 60 * 1000)}
                  mode="time"
                  display="clock"
                  onChange={handleEndTimeChange}
                />
              )}

              <View style={styles.modalBtnsRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setOpen(false)}
                >
                  <Text style={styles.secondaryBtnText}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleCreateEvent}
                >
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
  safe: {
    flex: 1,
    backgroundColor: "#0F172A",
  },

  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#0F172A",
  },

  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  headerRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
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
    borderWidth: 1,
    borderColor: "#334155",
  },

  calendarArrow: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 4,
    lineHeight: 34,
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

  inspectionBadge: {
    backgroundColor: "#f59e0b",
  },

  eventBadge: {
    backgroundColor: "#2563eb",
  },

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

  dateActionsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 4,
  },

  datePickerButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  datePickerButtonText: {
    color: "#f8fafc",
    fontWeight: "800",
    textAlign: "center",
  },

  endHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  clearEndText: {
    color: "#38bdf8",
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
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