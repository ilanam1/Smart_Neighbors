import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronRight,
  CheckCircle,
  Info,
  CalendarClock,
  Briefcase,
  X,
  FileUp,
} from "lucide-react-native";
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from "@react-native-documents/picker";
import { getSupabase } from "../DataBase/supabase";
import {
  markJobAsDoneWithDocument,
  rejectJob,
} from "../API/jobRequestsApi";

export default function EmployeeJobRequestScreen({ route, navigation }) {
  const { notification } = route.params;
  const { related_data } = notification;

  if (!related_data || !related_data.job_id) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ color: "red", textAlign: "center" }}>
          שגיאה: חסרים פרטי קריאה.
        </Text>
      </SafeAreaView>
    );
  }

  const [loading, setLoading] = useState(false);
  const [isHandledLocally, setIsHandledLocally] = useState(false);

  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [completionNote, setCompletionNote] = useState("");
  const [documentType, setDocumentType] = useState("REPAIR_PROOF");

  const employeeId =
    related_data.employee_id ||
    related_data.service_employee_id ||
    notification.recipient_id ||
    related_data.assigned_employee_id ||
    null;

  const buildJobObject = () => {
    return {
      id: related_data.job_id,
      report_id: related_data.report_id,
      building_id: related_data.building_id,
      employee_id: employeeId,
    };
  };

  const openCompleteModal = () => {
    setSelectedFile(null);
    setCompletionNote("");
    setDocumentType("REPAIR_PROOF");
    setCompletionModalVisible(true);
  };

  const pickCompletionDocument = async () => {
    try {
      const result = await pick({
        allowMultiSelection: false,
        type: [
          types.pdf,
          types.images,
          types.doc,
          types.docx,
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      });

      const file = Array.isArray(result) ? result[0] : result;

      if (!file?.uri) {
        Alert.alert("שגיאה", "לא ניתן לקרוא את הקובץ שנבחר");
        return;
      }

      setSelectedFile({
        uri: file.uri,
        name: file.name || "repair-proof",
        type: file.type || "application/octet-stream",
        size: file.size || null,
      });
    } catch (e) {
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
        return;
      }

      console.error("Document picker error:", e);
      Alert.alert("שגיאה", "לא ניתן לבחור את הקובץ");
    }
  };

  const submitCompleteWithDocument = async () => {
    if (!selectedFile) {
      Alert.alert("חסר קובץ", "יש להעלות חשבונית או אסמכתא לפני סיום העבודה");
      return;
    }

    if (!employeeId) {
      Alert.alert(
        "שגיאה",
        "לא נמצא מזהה עובד שירות עבור הקריאה. יש לפתוח את הקריאה מתוך רשימת המשימות של נותן השירות או ליצור את הקריאה מחדש."
      );
      return;
    }

    try {
      setLoading(true);

      await markJobAsDoneWithDocument({
        job: buildJobObject(),
        employeeId,
        employeeName: null,
        committeeUid: notification.sender_id,
        tenantId: related_data.tenant_id,
        reportType: related_data.report_type,
        file: selectedFile,
        documentType,
        note: completionNote,
      });

      const supabase = getSupabase();

      await supabase
        .from("app_notifications")
        .update({
          is_read: true,
          related_data: {
            ...related_data,
            employee_id: employeeId,
            is_handled: true,
            resolution: "done",
            has_completion_document: true,
          },
        })
        .eq("id", notification.id);

      Alert.alert("מעולה!", "המשימה נסגרה והאסמכתא נשמרה בהצלחה.");
      setIsHandledLocally(true);
      setCompletionModalVisible(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert("שגיאה", "שגיאה בסגירת המשימה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectJob = async () => {
    Alert.alert(
      "דחיית המשימה",
      "האם אתה בטוח שאינך פנוי או לא יכול לבצע את המשימה כעת?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "דחה משימה",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              await rejectJob(
                related_data.job_id,
                notification.sender_id || related_data.manager_uid,
                null,
                employeeId
              );

              const supabase = getSupabase();

              await supabase
                .from("app_notifications")
                .update({
                  is_read: true,
                  related_data: {
                    ...related_data,
                    is_handled: true,
                    resolution: "rejected",
                  },
                })
                .eq("id", notification.id);

              Alert.alert("נדחה", "המשימה נדחתה. הוועד יעודכן.");
              setIsHandledLocally(true);
              navigation.goBack();
            } catch (e) {
              Alert.alert("שגיאה", e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const isAlreadyHandled = notification.related_data?.is_handled || isHandledLocally;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronRight size={28} color="#f8fafc" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>קריאת שירות</Text>

        <View style={{ width: 28 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Briefcase size={24} color="#f59e0b" />
            <Text style={styles.buildingName}>{related_data.building_name}</Text>
          </View>

          <Text style={styles.senderText}>
            הקריאה נפתחה על ידי: {related_data.manager_name}
          </Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Info size={18} color="#94a3b8" />
            <Text style={styles.infoLabel}>תיאור הבעיה / מה צריך לעשות:</Text>
          </View>

          <Text style={styles.infoText}>{related_data.instructions}</Text>

          <View style={styles.infoRow}>
            <CalendarClock size={18} color="#94a3b8" />
            <Text style={styles.infoLabel}>זמן לביצוע:</Text>
          </View>

          <Text style={styles.infoText}>{related_data.schedule_time}</Text>
        </View>

        {isAlreadyHandled ? (
          <View style={styles.handledBox}>
            <Text style={styles.handledText}>הגבת לקריאה זו והיא סגורה</Text>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : (
              <>
                <TouchableOpacity style={styles.actionBtn} onPress={openCompleteModal}>
                  <CheckCircle size={22} color="white" />
                  <Text style={styles.actionBtnText}>סיימתי / אישור טיפול</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.rejectBtn} onPress={handleRejectJob}>
                  <X size={20} color="#f87171" />
                  <Text style={styles.rejectBtnText}>דחה קריאה</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      <Modal
        visible={completionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompletionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>סיום טיפול בקריאה</Text>

            <Text style={styles.modalText}>
              כדי לסיים את הקריאה יש להעלות חשבונית, קבלה או אסמכתא לביצוע התיקון.
            </Text>

            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  documentType === "REPAIR_PROOF" && styles.typeButtonActive,
                ]}
                onPress={() => setDocumentType("REPAIR_PROOF")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    documentType === "REPAIR_PROOF" && styles.typeButtonTextActive,
                  ]}
                >
                  אסמכתא
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  documentType === "INVOICE" && styles.typeButtonActive,
                ]}
                onPress={() => setDocumentType("INVOICE")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    documentType === "INVOICE" && styles.typeButtonTextActive,
                  ]}
                >
                  חשבונית
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  documentType === "RECEIPT" && styles.typeButtonActive,
                ]}
                onPress={() => setDocumentType("RECEIPT")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    documentType === "RECEIPT" && styles.typeButtonTextActive,
                  ]}
                >
                  קבלה
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.fileButton} onPress={pickCompletionDocument}>
              <FileUp size={20} color="#f8fafc" />
              <Text style={styles.fileButtonText}>
                {selectedFile ? "החלף קובץ" : "בחר קובץ"}
              </Text>
            </TouchableOpacity>

            {selectedFile && (
              <Text style={styles.selectedFileText}>
                קובץ נבחר: {selectedFile.name}
              </Text>
            )}

            <TextInput
              style={styles.noteInput}
              placeholder="הערה קצרה על התיקון שבוצע"
              placeholderTextColor="#64748b"
              value={completionNote}
              onChangeText={setCompletionNote}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setCompletionModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelModalText}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmModalButton, loading && { opacity: 0.6 }]}
                onPress={submitCompleteWithDocument}
                disabled={loading}
              >
                <Text style={styles.confirmModalText}>
                  {loading ? "שומר..." : "סיים ושמור"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0f172a" },

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

  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  buildingName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f8fafc",
  },

  senderText: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "right",
  },

  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 16,
  },

  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#cbd5e1",
  },

  infoText: {
    fontSize: 16,
    color: "#f8fafc",
    textAlign: "right",
    marginBottom: 16,
    marginRight: 26,
  },

  actionsContainer: {
    marginTop: 30,
    gap: 12,
  },

  actionBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  actionBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },

  rejectBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#f87171",
  },

  rejectBtnText: {
    color: "#f87171",
    fontSize: 16,
    fontWeight: "700",
  },

  handledBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#334155",
    borderRadius: 12,
  },

  handledText: {
    textAlign: "center",
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalBox: {
    width: "100%",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
  },

  modalTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 8,
  },

  modalText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "right",
    marginBottom: 14,
  },

  typeRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 12,
  },

  typeButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },

  typeButtonActive: {
    backgroundColor: "#38bdf8",
    borderColor: "#38bdf8",
  },

  typeButtonText: {
    color: "#cbd5e1",
    fontWeight: "800",
  },

  typeButtonTextActive: {
    color: "#0f172a",
  },

  fileButton: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 10,
  },

  fileButtonText: {
    color: "#f8fafc",
    fontWeight: "900",
  },

  selectedFileText: {
    color: "#38bdf8",
    fontSize: 13,
    textAlign: "right",
    marginBottom: 10,
  },

  noteInput: {
    minHeight: 80,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 12,
    color: "#f8fafc",
    textAlign: "right",
    textAlignVertical: "top",
    marginBottom: 14,
  },

  modalActions: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  cancelModalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#334155",
  },

  cancelModalText: {
    color: "#f8fafc",
    fontWeight: "800",
  },

  confirmModalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#10b981",
  },

  confirmModalText: {
    color: "#052e16",
    fontWeight: "900",
  },
});