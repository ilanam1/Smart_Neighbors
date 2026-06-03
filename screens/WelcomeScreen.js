import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { UserPlus, LogIn, MessageSquare, Calendar } from 'lucide-react-native';

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Button Animation Scales
  const signupScale = useRef(new Animated.Value(1)).current;
  const loginScale = useRef(new Animated.Value(1)).current;
  const forgotScale = useRef(new Animated.Value(1)).current;

  // Animation triggers
  const animateScale = (val, toValue) => {
    Animated.spring(val, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />

      {/* Background Image (Professional twilight building facade) */}
      <Image
        source={require('../assets/welcome_bg_warm_dusk.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={4}
      />

      {/* Main Content Container with Safe Area Insets */}
      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Top Section: Glassmorphic Logo & Title Card */}
        <View style={styles.topSection}>
          <View style={styles.glassCard}>
            {/* Logo Wrapper Container */}
            <View style={styles.logoWrapper}>
              <View style={styles.logoContainer}>
                {/* Logo Image */}
                <Image
                  source={require('../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              {/* Chat Icon Badge (Top Right - Warm Amber themed) */}
              <View style={styles.badgeTopRight}>
                <MessageSquare size={14} color="#0f172a" fill="#0f172a" strokeWidth={2.5} />
              </View>

              {/* Calendar Icon Badge (Bottom Left) */}
              <View style={styles.badgeBottomLeft}>
                <Calendar size={13} color="#ffffff" />
              </View>
            </View>

            {/* App Name & Tagline (Smart Neighbors order, Warm Gold/Amber color) */}
            <View style={styles.textContainer}>
              <Text style={styles.mainTitle}>
                <Text style={styles.textGold}>Smart </Text>
                <Text style={styles.textWhite}>Neighbors</Text>
              </Text>
              {/* Divider Line */}
              <LinearGradient
                colors={['transparent', '#f59e0b', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.divider}
              />
              <Text style={styles.subtitle}>ניהול חכם בכף ידך</Text>
            </View>
          </View>
        </View>

        {/* Bottom Section: Action Buttons */}
        <View style={styles.bottomSection}>
          {/* Sign Up Button (Modern Orange to Gold/Amber Gradient with glow) */}
          <Animated.View style={[styles.buttonContainer, styles.primaryButtonWrapper, { transform: [{ scale: signupScale }] }]}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.95}
              onPressIn={() => animateScale(signupScale, 0.96)}
              onPressOut={() => animateScale(signupScale, 1)}
              onPress={() => navigation.navigate('Signup')}
              accessibilityLabel="הרשמה למערכת"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['#f97316', '#f59e0b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryGradient}
              >
                <UserPlus size={20} color="#ffffff" />
                <Text style={styles.primaryButtonText}>הרשמה למערכת</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Login Button (Amber/Gold Frosted Glass Container) */}
          <Animated.View style={[styles.buttonContainer, { transform: [{ scale: loginScale }] }]}>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.95}
              onPressIn={() => animateScale(loginScale, 0.96)}
              onPressOut={() => animateScale(loginScale, 1)}
              onPress={() => navigation.navigate('Login')}
              accessibilityLabel="כניסה לחשבון קיים"
              accessibilityRole="button"
            >
              <LogIn size={20} color="#fbbf24" />
              <Text style={styles.secondaryButtonText}>כניסה לחשבון קיים</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Forgot Password Link with accessible hit target */}
          <Animated.View style={{ transform: [{ scale: forgotScale }] }}>
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              activeOpacity={0.8}
              onPressIn={() => animateScale(forgotScale, 0.95)}
              onPressOut={() => animateScale(forgotScale, 1)}
              onPress={() => navigation.navigate('VerifyEmail')}
              accessibilityLabel="שכחתי סיסמה"
              accessibilityRole="link"
            >
              <Text style={styles.forgotPasswordText}>שכחתי סיסמה</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(10, 14, 26, 0.75)', // Dark frosted backing prevents background light bleed
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 32,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  logoWrapper: {
    width: 108,
    height: 108,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // Slate 900
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)', // Amber outline matching theme
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  badgeTopRight: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f59e0b', // Amber 500
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f172a',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeBottomLeft: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    backgroundColor: '#f97316', // Orange 500
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fdba74', // Orange 300
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  textContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 44,
    textAlign: 'center',
  },
  textWhite: {
    color: '#ffffff',
  },
  textGold: {
    color: '#f59e0b', // Gold / Amber 500
  },
  divider: {
    height: 2,
    width: 100,
    marginTop: 12,
    opacity: 0.5,
  },
  subtitle: {
    marginTop: 12,
    color: '#cbd5e1', // Slate 300
    fontSize: 14,
    letterSpacing: 1.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSection: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButtonWrapper: {
    shadowColor: '#f97316', // Orange glow shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryButton: {
    width: '100%',
    height: 56, // h-14 equivalent (56px)
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryGradient: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 14, 26, 0.75)', // Dark backing mask to prevent text-light overlap
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.5)', // border-amber-500/50
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: 'rgba(245, 158, 11, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#fbbf24', // text-amber-400
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forgotPasswordButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  forgotPasswordText: {
    color: '#cbd5e1', // Slate 300
    fontSize: 13,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
