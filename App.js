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

import AuthScreen from './AuthScreen';
import CreateRequestScreen from './CreateRequestScreen';
import { getSupabase } from './supabase.js';

const Stack = createNativeStackNavigator();

// ---------------------------------------------------------------------
// קומפוננטת הבית למשתמש מחובר – פה יהיה "ברוך הבא" וכפתור לבקשה חדשה
// ---------------------------------------------------------------------
function HomeScreen({ navigation, route }) {
  const { user, supabase, onSignOut } = route.params || {};

  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.text}>Welcome {user?.email || 'user'}!</Text>

        {/* כפתור מעבר למסך פרסום בקשה חדשה */}
        <TouchableOpacity
          style={{
            marginTop: 16,
            backgroundColor: '#3b82f6',
            padding: 10,
            borderRadius: 8,
          }}
          onPress={() => navigation.navigate('CreateRequest')}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            פרסום בקשה חדשה
          </Text>
        </TouchableOpacity>

        {/* כפתור יציאה */}
        <TouchableOpacity
          style={{
            marginTop: 16,
            backgroundColor: '#ef4444',
            padding: 10,
            borderRadius: 8,
          }}
          onPress={async () => {
            try {
              if (supabase && supabase.auth) {
                await supabase.auth.signOut();
              }
              if (typeof onSignOut === 'function') {
                onSignOut();
              }
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

// ---------------------------------------------------------------------
// קומפוננטת App הראשית – מנהלת user + Supabase + ניווט
// ---------------------------------------------------------------------
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [user, setUser] = useState(null);
  const supabase = getSupabase();

  // מאזין לשינויים ב-Auth + טעינת session בהתחלה
  useEffect(() => {
    let listener = null;
    try {
      if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
        listener = supabase.auth.onAuthStateChange((event, session) => {
          setUser(session?.user || null);
        });
      }

      (async () => {
        try {
          if (supabase && supabase.auth && supabase.auth.getSession) {
            const { data } = await supabase.auth.getSession();
            setUser(data?.session?.user ?? null);
          }
        } catch (e) {
          console.log('getSession failed', e);
        }
      })();
    } catch (e) {
      console.log('auth listener failed to attach', e);
    }

    return () => {
      try {
        if (listener && typeof listener.unsubscribe === 'function') {
          listener.unsubscribe();
        }
      } catch (e) {
        /* ignore */
      }
    };
  }, [supabase]);

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Stack.Navigator>

        {/* אם אין משתמש – מסך התחברות */}
        {!user ? (
          <Stack.Screen
            name="Auth"
            options={{ title: 'התחברות', headerShown: false }}
          >
            {(props) => (
              <AuthScreen
                {...props}
                onSignIn={(u) => setUser(u)}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            {/* מסך הבית לאחר התחברות */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'שכנים חכמים' }}
              initialParams={{
                user,
                supabase,
                onSignOut: () => setUser(null),
              }}
            />

            {/* מסך יצירת בקשה חדשה */}
            <Stack.Screen
              name="CreateRequest"
              component={CreateRequestScreen}
              options={{ title: 'בקשה חדשה' }}
            />
          </>
        )}
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

export default App;
