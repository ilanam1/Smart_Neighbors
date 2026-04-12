import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Clock, LogOut } from 'lucide-react-native';
import { getSupabase } from '../DataBase/supabase';

export default function PendingApprovalScreen() {
  const supabase = getSupabase();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch(e) {}
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: '#0F172A' }} />
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" width="100%">
            <Defs>
              <RadialGradient id="topGlow" cx="100%" cy="0%" rx="60%" ry="40%" fx="100%" fy="0%" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#ff0080" stopOpacity="0.2" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="bottomGlow" cx="0%" cy="100%" rx="60%" ry="40%" fx="0%" fy="100%" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#00f2ff" stopOpacity="0.2" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGlow)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomGlow)" />
          </Svg>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Clock size={64} cololor="#f59e0b" color="#f59e0b" strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>ממתין לאישור ועד</Text>
        <Text style={styles.subtitle}>
          נרשמת בהצלחה במערכת!{'\n'}עם זאת, כניסתך לאפליקציה דורשת את אישור ועד הבית של הבניין.
        </Text>
        <Text style={styles.subtext}>
          אנא המתן עד שאחד מחברי הועד יאשר את פרופיל הדייר שלך.
        </Text>

        <TouchableOpacity style={styles.primaryButtonWrapper} onPress={handleSignOut} activeOpacity={0.9}>
          <LinearGradient colors={['#ef4444', '#dc2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBorder}>
            <View style={[styles.primaryButtonInner, { backgroundColor: '#1e293b', flexDirection: 'row' }]}>
              <LogOut size={20} color="#ef4444" style={{marginRight: 8}} />
              <Text style={styles.primaryButtonText}>התנתק בינתיים</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 32,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: 'center',
    color: '#cbd5e1',
    lineHeight: 24,
    marginBottom: 12,
    fontSize: 16
  },
  subtext: {
    textAlign: 'center',
    color: '#94a3b8',
    marginBottom: 32,
    fontSize: 14
  },
  primaryButtonWrapper: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBorder: {
    flex: 1,
    padding: 1,
    borderRadius: 16,
  },
  primaryButtonInner: {
    flex: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
