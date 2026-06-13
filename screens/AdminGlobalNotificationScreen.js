import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActivityIndicator from '../components/CustomLoader';
import { ArrowRight, Megaphone, Send, CheckCircle, Bell, Sparkles } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createGlobalNotification } from '../API/notificationsApi';

export default function AdminGlobalNotificationScreen({ route, navigation }) {
  const { adminUser } = route.params || {};
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Quick templates in Hebrew
  const templates = [
    {
      id: 'maintenance',
      icon: '🛠️',
      label: 'תחזוקת אפליקציה',
      title: '🛠️ עבודות תחזוקת אפליקציה',
      message: 'משתמשים יקרים, בקרוב יבוצעו עבודות שדרוג ותחזוקה לשרתי האפליקציה. ייתכנו שיבושים זמניים בגישה לשירות. עמכם הסליחה.',
    },
    {
      id: 'system_update',
      icon: '📢',
      label: 'עדכון גרסה',
      title: '📢 עדכון גרסה באפליקציה',
      message: 'משתמשים יקרים, עדכנו את האפליקציה בחנות כדי ליהנות משיפורי מהירות, אבטחה ותכונות חדשות שנוספו כעת.',
    },
    {
      id: 'urgent',
      icon: '⚠️',
      label: 'התראה דחופה',
      title: '⚠️ הודעה דחופה מהנהלת האפליקציה',
      message: 'משתמשים יקרים, אנא שימו לב לעדכון הבא בהקדם האפשרי. נמשיך לעדכן בפרטים נוספים ככל שיידרש.',
    },
  ];

  const applyTemplate = (template) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  const handleSendNotification = async () => {
    if (!title.trim()) {
      Alert.alert('שגיאה', 'אנא הזן כותרת להתראה');
      return;
    }
    if (!message.trim()) {
      Alert.alert('שגיאה', 'אנא הזן תוכן להודעה');
      return;
    }

    Alert.alert(
      'אישור שליחת הודעה',
      'האם אתה בטוח שברצונך לשלוח התראה זו לכלל המשתמשים במערכת (בכל הבניינים)? פעולה זו אינה ניתנת לביטול.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, שלח לכולם',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              await createGlobalNotification({
                adminUser,
                title: title.trim(),
                message: message.trim(),
              });
              setSuccess(true);
            } catch (error) {
              console.error(error);
              Alert.alert('שגיאה', error.message || 'שגיאה בשליחת ההתראה הגלובלית');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <CheckCircle size={80} color="#10b981" style={styles.successIcon} />
          <Text style={styles.successTitle}>נשלח בהצלחה! 🎉</Text>
          <Text style={styles.successSubtitle}>
            ההתראה הגלובלית נשלחה בהצלחה לכלל משתמשי האפליקציה בכל הבניינים.
          </Text>

          <TouchableOpacity
            style={styles.backToDashboardButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToDashboardText}>חזרה ללוח הבקרה</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
      <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowRight size={24} color="#f8fafc" />
            </TouchableOpacity>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>התראה לכלל המשתמשים</Text>
              <Megaphone size={22} color="#22d3ee" style={styles.headerIcon} />
            </View>
          </View>

          {/* Quick templates */}
          <Text style={styles.sectionLabel}>תבניות מהירות</Text>
          <View style={styles.templatesContainer}>
            {templates.map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                style={styles.templateCard}
                activeOpacity={0.8}
                onPress={() => applyTemplate(tpl)}
              >
                <Text style={styles.templateEmoji}>{tpl.icon}</Text>
                <Text style={styles.templateLabel}>{tpl.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.charCounter}>{title.length}/50</Text>
              <Text style={styles.inputLabel}>נושא ההתראה</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="לדוגמה: עבודות תחזוקה מתוכננות"
                placeholderTextColor="#64748b"
                value={title}
                onChangeText={(text) => {
                  if (text.length <= 50) setTitle(text);
                }}
                maxLength={50}
                textAlign="right"
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.charCounter}>{message.length}/200</Text>
              <Text style={styles.inputLabel}>תוכן ההודעה</Text>
            </View>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="הכנס את תוכן ההתראה לפרטים מלאים..."
                placeholderTextColor="#64748b"
                value={message}
                onChangeText={(text) => {
                  if (text.length <= 200) setMessage(text);
                }}
                maxLength={200}
                multiline
                numberOfLines={5}
                textAlign="right"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, loading && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={handleSendNotification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <LinearGradient
                colors={['#f97316', '#ea580c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Send size={20} color="#ffffff" style={styles.sendIcon} />
                <Text style={styles.sendButtonText}>שלח התראה לכלל המשתמשים</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#1a2b41',
    borderRadius: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerIcon: {
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94a3b8',
    textAlign: 'right',
    marginBottom: 12,
  },
  templatesContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 10,
  },
  templateCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  templateEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 30,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'right',
  },
  inputWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 55,
    justifyContent: 'center',
  },
  textAreaWrapper: {
    height: 120,
    paddingVertical: 12,
  },
  input: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'right',
  },
  textArea: {
    flex: 1,
    height: '100%',
  },
  sendButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f97316',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 10,
  },
  gradientButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sendIcon: {
    marginLeft: 6,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 35,
  },
  backToDashboardButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  backToDashboardText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
