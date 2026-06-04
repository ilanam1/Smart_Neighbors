import React, { useEffect, useState } from "react";
import { View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions } from 'react-native';
import ActivityIndicator from '../components/CustomLoader';
import { ClipboardList, AlertCircle } from "lucide-react-native";
import { getOpenRequests, completeRequest } from "../API/requestsApi";

export default function CommitteeRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await getOpenRequests();

        if (mounted) {
          setRequests(data || []);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setError(e.message || "שגיאה בטעינת הבקשות");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  function formatCategory(category) {
    switch (category) {
      case "PHYSICAL_HELP":
        return "עזרה פיזית";
      case "INFO":
        return "מידע / שאלה";
      case "MAINTENANCE":
        return "תחזוקה";
      case "CLEANING":
        return "ניקיון";
      case "NOISE":
        return "רעש";
      case "SAFETY":
        return "בטיחות";
      case "OTHER":
        return "אחר";
      default:
        return category || "לא ידוע";
    }
  }

  function formatUrgency(urgency) {
    switch (urgency) {
      case "LOW":
        return "נמוכה";
      case "MEDIUM":
        return "בינונית";
      case "HIGH":
        return "גבוהה";
      default:
        return urgency || "לא ידוע";
    }
  }

  function formatDate(date) {
    try {
      return new Date(date).toLocaleString("he-IL");
    } catch {
      return date;
    }
  }

  async function handleCompleteRequest(requestId) {
    try {
      setCompletingId(requestId);

      await completeRequest(requestId);

      Alert.alert("הצלחה", "הבקשה סומנה כטופלה.");

      setRequests((prev) => prev.filter((item) => item.id !== requestId));
    } catch (e) {
      console.error(e);
      Alert.alert("שגיאה", e.message || "לא ניתן היה לסמן את הבקשה כטופלה");
    } finally {
      setCompletingId(null);
    }
  }

  function confirmCompleteRequest(requestId) {
    Alert.alert(
      "סימון בקשה כטופלה",
      "האם אתה בטוח שברצונך לסמן את הבקשה הזאת כטופלה?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "כן",
          onPress: () => handleCompleteRequest(requestId),
        },
      ]
    );
  }

  if (loading) {
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </View>
    );
  }

  if (error) {
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={styles.errorCard}>
            <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 12 }} />
            <Text style={styles.error}>שגיאה: {error}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!requests.length) {
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={styles.emptyCard}>
            <ClipboardList size={48} color="rgba(249, 115, 22, 0.4)" style={{ marginBottom: 12 }} />
            <Text style={styles.empty}>
              אין כרגע בקשות פתוחות שמיועדות לוועד הבית.
            </Text>
          </View>
        </View>
      </View>
    );
  }

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
      <View style={styles.container}>
        <FlatList
          contentContainerStyle={styles.list}
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>

              <Text style={styles.body}>{item.description}</Text>

              <Text style={styles.meta}>
                מבקש: {item.requester_name || "דייר לא ידוע"}
              </Text>

              <Text style={styles.meta}>
                קטגוריה: {formatCategory(item.category)}
              </Text>

              <Text style={styles.meta}>
                דחיפות: {formatUrgency(item.urgency)}
              </Text>

              <Text style={styles.meta}>
                מיועד ל: ועד הבית בלבד
              </Text>

              <Text style={styles.meta}>
                נוצר בתאריך: {formatDate(item.created_at)}
              </Text>

              <TouchableOpacity
                style={[
                  styles.completeButton,
                  completingId === item.id && styles.completeButtonDisabled,
                ]}
                onPress={() => confirmCompleteRequest(item.id)}
                disabled={completingId === item.id}
              >
                {completingId === item.id ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <Text style={styles.completeButtonText}>סמן כטופלה</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRightWidth: 4,
    borderRightColor: "#f97316",
  },
  title: {
    fontWeight: "700",
    fontSize: 16,
    color: "#f8fafc",
    textAlign: "right",
  },
  body: {
    marginTop: 4,
    color: "#e2e8f0",
    textAlign: "right",
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
  },
  completeButton: {
    marginTop: 12,
    backgroundColor: "#f97316",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  completeButtonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  errorCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  error: {
    fontSize: 16,
    textAlign: "center",
    color: "#ef4444",
    fontWeight: "500",
  },
  empty: {
    fontSize: 16,
    textAlign: "center",
    color: "#cbd5e1",
    fontWeight: "500",
  },
});