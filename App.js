import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import { getSupabase } from './DataBase/supabase.js';

const Stack = createNativeStackNavigator();

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [user, setUser] = useState(null);
  const supabase = getSupabase();

  // AUTH LISTENER
  useEffect(() => {
    let listener = null;

    try {
      if (supabase?.auth?.onAuthStateChange) {
        listener = supabase.auth.onAuthStateChange((event, session) => {
          setUser(session?.user || null);
        });
      }

      (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          setUser(data?.session?.user ?? null);
        } catch (e) {
          console.log('getSession failed', e);
        }
      })();
    } catch (e) {
      console.log('auth listener failed', e);
    }

    return () => {
      try {
        listener?.unsubscribe?.();
      } catch {}
    };
  }, [supabase]);

  // IF USER LOGGED IN
  if (user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.text}>Welcome {user.email}!</Text>

          <TouchableOpacity
            style={{
              marginTop: 16,
              backgroundColor: '#ef4444',
              padding: 10,
              borderRadius: 8,
            }}
            onPress={async () => {
              try {
                await supabase.auth.signOut();
                setUser(null);
              } catch (e) {
                console.error('Sign out error', e);
              }
            }}
          >
            <Text style={{ color: '#fff' }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // IF NOT LOGGED IN
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login">
          {(props) => <LoginScreen {...props} onSignIn={(u) => setUser(u)} />}
        </Stack.Screen>
        <Stack.Screen name="Signup">
          {(props) => <SignupScreen {...props} onSignIn={(u) => setUser(u)} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});
