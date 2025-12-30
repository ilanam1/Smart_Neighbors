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
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { ArrowRight, UserPlus, LogIn } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Background Glows */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <RadialGradient
              id="topGlow"
              cx="100%"
              cy="0%"
              rx="60%"
              ry="40%"
              fx="100%"
              fy="0%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#ff0080" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient
              id="bottomGlow"
              cx="0%"
              cy="100%"
              rx="60%"
              ry="40%"
              fx="0%"
              fy="100%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#00f2ff" stopOpacity="0.25" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGlow)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomGlow)" />
        </Svg>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>

        {/* Top Section: Logo & Titles */}
        <View style={styles.topSection}>
          {/* Logo Container */}
          <View style={styles.logoWrapper}>
            {/* Glow behind logo */}
            <LinearGradient
              colors={['#ff0080', '#00f2ff']}
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
              <Text style={styles.textPink}>App</Text>
            </Text>
            {/* Divider Line */}
            <LinearGradient
              colors={['transparent', '#ff0080', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.divider}
            />
            <Text style={styles.subtitle}>ניהול חכם בכף ידך</Text>
          </View>
        </View>

        {/* Bottom Section: Buttons */}
        <View style={styles.bottomSection}>

          {/* Sign Up Button (Gradient Border) */}
          <TouchableOpacity
            style={styles.primaryButtonWrapper}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Signup')}
          >
            <LinearGradient
              colors={['#ff0080', '#00f2ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBorder}
            >
              <View style={styles.primaryButtonInner}>
                <UserPlus size={20} color="#ff0080" />
                <Text style={styles.primaryButtonText}>הרשמה</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Button (Outline-ish) */}
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
          >
            <LogIn size={20} color="#9ca3af" />
            <Text style={styles.secondaryButtonText}>כניסה</Text>
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => console.log('Forgot Password')}
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
    backgroundColor: '#0F172A', // Slate 900
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 60,
    zIndex: 10,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGlow: {
    position: 'absolute',
    width: 132, // Reduced from 140 to make frame narrower
    height: 132,
    borderRadius: 45, // Adjusted for new size
    opacity: 0.6,
    transform: [{ scale: 1.05 }],
  },
  imageContainer: {
    width: 128,
    height: 128,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    fontSize: 56,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -2,
    lineHeight: 60,
    textAlign: 'center',
  },
  textWhite: {
    color: '#ffffff',
  },
  textPink: {
    color: '#ff0080', // Fallback for gradient text
  },
  divider: {
    height: 2,
    width: 100,
    marginTop: 16,
    opacity: 0.5,
  },
  subtitle: {
    marginTop: 24,
    color: '#9ca3af',
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '300',
    textTransform: 'uppercase',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    marginBottom: 100, // Increased from 20 to move buttons up
  },
  primaryButtonWrapper: {
    width: '100%',
    maxWidth: 350,
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow simulation
    shadowColor: '#ff0080',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientBorder: {
    flex: 1,
    padding: 2, // Border width
    borderRadius: 16,
  },
  primaryButtonInner: {
    flex: 1,
    backgroundColor: '#000000', // Inner fill
    borderRadius: 14, // Slightly less than outer
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    maxWidth: 350,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  secondaryButtonText: {
    color: '#d1d5db',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    marginTop: 8,
    padding: 8,
  },
  forgotPasswordText: {
    color: '#9ca3af',
    fontSize: 14,
    textDecorationLine: 'underline',
  },

});

