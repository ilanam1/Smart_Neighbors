import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { UserPlus, LogIn } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />

      {/* Background Image */}
      <Image
        source={require('../assets/welcome_bg_generated.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Top Section: Logo & Titles */}
        <View style={styles.topSection}>
          {/* Logo Container */}
          <View style={styles.logoWrapper}>
            {/* Glow behind logo */}
            <LinearGradient
              colors={['#7c3aed', '#db2777']}
              style={styles.logoGlow}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Logo Image */}
            <View style={styles.imageContainer}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* App Name */}
          <View style={styles.textContainer}>
            <Text style={styles.mainTitle}>
              <Text style={styles.textWhite}>Smart </Text>
              <Text style={styles.textPink}>Neighbors</Text>
            </Text>
            {/* Divider Line */}
            <LinearGradient
              colors={['transparent', '#7c3aed', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.divider}
            />
            <Text style={styles.subtitle}>ניהול חכם בכף ידך</Text>
          </View>
        </View>

        {/* Bottom Section: Buttons (Positioned significantly higher) */}
        <View style={styles.bottomSection}>
          {/* Sign Up Button (Vibrant Gradient) */}
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Signup')}
          >
            <LinearGradient
              colors={['#7c3aed', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <UserPlus size={19} color="#ffffff" />
              <Text style={styles.primaryButtonText}>הרשמה למערכת</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Button (Sleek Glass Outline) */}
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
          >
            <LogIn size={19} color="#00f2ff" />
            <Text style={styles.secondaryButtonText}>כניסה לחשבון קיים</Text>
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => navigation.navigate('VerifyEmail')}
          >
            <Text style={styles.forgotPasswordText}>שכחתי סיסמה</Text>
          </TouchableOpacity>
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
    justifyContent: 'flex-start', // Align items to the top to control layout flow
    paddingTop: 100,
    zIndex: 10,
  },
  topSection: {
    alignItems: 'center',
  },
  logoWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoGlow: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 38,
    opacity: 0.6,
    transform: [{ scale: 1.05 }],
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: 'rgba(10, 14, 26, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 52,
    textAlign: 'center',
  },
  textWhite: {
    color: '#ffffff',
  },
  textPink: {
    color: '#db2777', // Magenta 600
  },
  divider: {
    height: 2,
    width: 120,
    marginTop: 16,
    opacity: 0.6,
  },
  subtitle: {
    marginTop: 16,
    color: '#94a3b8', // Slate 400
    fontSize: 15,
    letterSpacing: 3,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bottomSection: {
    width: '100%',
    maxWidth: 350, // Slightly wider for elegance
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: 120, // Pushed back to the middle of the screen
  },
  primaryButton: {
    width: '100%',
    height: 52, // Slightly taller
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primaryGradient: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16, // Slightly larger text
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    height: 52, // Slightly taller
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 255, 0.25)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  secondaryButtonText: {
    color: '#00f2ff',
    fontSize: 16, // Slightly larger text
    fontWeight: '700',
  },
  forgotPasswordButton: {
    padding: 2,
  },
  forgotPasswordText: {
    color: '#94a3b8',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
