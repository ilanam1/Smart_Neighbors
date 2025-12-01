import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
} from 'react-native';
import { useState } from 'react';
import AuthScreen from './AuthScreen';
import { getSupabase } from './supabase.js';

async function createDummyUser() {
  console.log("STARTED INSERT...");
  try { console.log('attempting to import supabase module...'); } catch (e) { console.log('error logging import attempt', e); }

  // Use the lazy factory to get a supabase client at call-time
  let supabase = null;
  try {
    const mod = await import('./supabase.js');
    const getSupabase = mod.getSupabase || mod.default || null;
    supabase = typeof getSupabase === 'function' ? getSupabase() : null;
    console.log('obtained supabase via getSupabase:', typeof supabase, supabase ? 'defined' : 'null');
  } catch (e) {
    console.error('Error requiring getSupabase:', e && e.message ? e.message : e);
    return { success: false, exception: { message: 'Error requiring getSupabase', detail: e && e.message ? e.message : String(e) } };
  }

  try {
    if (!supabase) {
      const err = new Error('supabase client is undefined');
      console.error(err);
      return { success: false, exception: { message: err.message } };
    }

    // Try insert with capitalized table name first, then fallback to lowercase
    let res = await supabase
      .from('Users')
      .insert([
        { email: "yarin@test.com", password: "123456" }
      ])
      .select();

    if (res.error) {
      console.log('INSERT ERROR (Users):', res.error);
      // Fallback to lowercase table name which is common in Postgres
      const fallback = await supabase
        .from('users')
        .insert([{ email: "yarin@test.com", password: "123456" }])
        .select();

      if (fallback.error) {
        console.log('INSERT ERROR (users):', fallback.error);
        return { success: false, error: res.error, fallbackError: fallback.error };
      }

      console.log('USER CREATED (users):', fallback.data);
      return { success: true, data: fallback.data };
    }

    console.log('USER CREATED (Users):', res.data);
    return { success: true, data: res.data };
  } catch (exception) {
    console.error('EXCEPTION DURING INSERT:', exception);
    return { success: false, exception: { message: exception.message, name: exception.name, stack: exception.stack } };
  }
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [user, setUser] = useState(null);
  const supabase = getSupabase();

  // Attach auth listener and fetch initial session
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
        if (listener && typeof listener.unsubscribe === 'function') listener.unsubscribe();
      } catch (e) {
        /* ignore */
      }
    };
  }, [supabase]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AuthScreen onSignIn={(u) => setUser(u)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.text}>Welcome {user?.email || 'user'}!</Text>
        <TouchableOpacity
          style={{ marginTop: 16, backgroundColor: '#ef4444', padding: 10, borderRadius: 8 }}
          onPress={async () => {
            try {
              if (supabase && supabase.auth) await supabase.auth.signOut();
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
