import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { getPublicRequests, completeRequest } from '../API/requestsApi';

export default function PublicRequestsScreen() {
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

        const data = await getPublicRequests();

        if (mounted) {
          setRequests(data || []);
        }
      } catch (e) {
        console.error(e);

        if (mounted) {
          setError(e.message || 'שגיאה בטעינת הבקשות');
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
      case 'PHYSICAL_HELP':
        return 'עזרה פיזית';
      case 'INFO':
        return 'מידע / שאלה';
      case 'MAINTENANCE':
        return 'תחזוקה';
      case 'CLEANING':
        return 'ניקיון';
      case 'NOISE':
        return 'רעש';
      case 'SAFETY':
        return 'בטיחות';
      case 'OTHER':
        return 'אחר';
      default:
        return category || 'לא ידוע';
    }
  }

  function formatUrgency(urgency) {
    switch (urgency) {
      case 'LOW':
        return 'נמוכה';
      case 'MEDIUM':
        return 'בינונית';
      case 'HIGH':
        return 'גבוהה';
      default:
        return urgency || 'לא ידוע';
    }
  }

  function formatDate(date) {
    try {
      return new Date(date).toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return date;
    }
  }

  async function handleCompleteRequest(requestId) {
    try {
      setCompletingId(requestId);

      await completeRequest(requestId);

      Alert.alert('הצלחה', 'הבקשה סומנה כטופלה.');

      setRequests((prev) => prev.filter((item) => item.id !== requestId));
    } catch (e) {
      console.error(e);
      Alert.alert('שגיאה', e.message || 'לא ניתן היה לסמן את הבקשה כטופלה');
    } finally {
      setCompletingId(null);
    }
  }

  function confirmCompleteRequest(requestId) {
    Alert.alert(
      'סימון בקשה כטופלה',
      'האם אתה בטוח שברצונך לסמן את הבקשה הזאת כטופלה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן',
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
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.centered}>
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
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.centered}>
          <Text style={styles.error}>שגיאה: {error}</Text>
        </View>
      </View>
    );
  }

  if (!requests.length) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Image
          source={require('../assets/app_internal_bg.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.centered}>
          <Text style={styles.empty}>אין כרגע בקשות פתוחות מהשכנים.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Image
        source={require('../assets/app_internal_bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.container}>
        <FlatList
          contentContainerStyle={styles.list}
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, styles.categoryBadge]}>
                    <Text style={styles.badgeText}>{formatCategory(item.category)}</Text>
                  </View>
                  <View style={[styles.badge, item.urgency === 'HIGH' ? styles.urgencyHighBadge : styles.urgencyNormalBadge]}>
                    <Text style={styles.badgeText}>{`דחיפות: ${formatUrgency(item.urgency)}`}</Text>
                  </View>
                </View>
                <Text style={styles.title}>{item.title}</Text>
              </View>

              <Text style={styles.body}>{item.description}</Text>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  מבקש: {item.requester_name || 'דייר לא ידוע'}
                </Text>
                <Text style={styles.metaText}>
                  {formatDate(item.created_at)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.completeButton,
                  completingId === item.id && styles.completeButtonDisabled,
                ]}
                onPress={() => confirmCompleteRequest(item.id)}
                disabled={completingId === item.id}
              >
                {completingId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
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
    backgroundColor: 'transparent',
  },
  bgImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
  },
  urgencyHighBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  urgencyNormalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'right',
  },
  body: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  completeButton: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  error: {
    textAlign: 'center',
    color: '#fb7185',
    fontSize: 16,
    fontWeight: 'bold',
  },
  empty: {
    textAlign: 'center',
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
});