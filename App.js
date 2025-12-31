
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import CreateRequestScreen from './screens/CreateRequestScreen';
import ReportDisturbanceScreen from './screens/ReportDisturbanceScreen';
import BuildingUpdatesScreen from './screens/BuildingUpdatesScreen';
import PayFeesScreen from './screens/PayFeesScreen';
import CommitteeRequestsScreen from './screens/CommitteeRequestsScreen';
import CommitteeDisturbancesScreen from './screens/CommitteeDisturbancesScreen';
import CommitteePaymentSetupScreen from './screens/CommitteePaymentSetupScreen';
import PublicRequestsScreen from './screens/PublicRequestsScreen';
import ProfilePageScreen from './screens/ProfilePageScreen';
import BuildingDocumentsScreen from "./screens/BuildingDocumentsScreen";
import BuildingRulesScreen from "./screens/BuildingRulesScreen";
import { getSupabase } from './DataBase/supabase';
import CommitteeProvidersScreen from './screens/CommitteeProvidersScreen';
import AdminScreen from './screens/AdminScreen';
import DeleteUserScreen from './screens/DeleteUserScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const supabase = getSupabase();

  useEffect(() => {
    let subscription = null;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data?.session?.user ?? null);
      } catch (e) {
        console.log('getSession failed', e);
      }
    })();

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      subscription = data?.subscription || null;
    } catch (e) {
      console.log('auth listener failed', e);
    }

    return () => {
      try {
        subscription?.unsubscribe?.();
      } catch { }
    };
  }, [supabase]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {user && user.role !== 'admin' ? (
          // --------- המשתמש מחובר ---------
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              options={{ title: 'Smart Neighbors', headerShown: false }}
            >
              {props => <HomeScreen {...props} user={user} />}
            </Stack.Screen>

            {/*  PROFILE SCREEN */}
            <Stack.Screen
              name="ProfilePageScreen"
              component={ProfilePageScreen}
              options={{ title: 'הפרופיל שלי' }}
            />

            <Stack.Screen
              name="CreateRequest"
              component={CreateRequestScreen}
              options={{ title: 'יצירת בקשה חדשה' }}
            />

            <Stack.Screen
              name="ReportDisturbance"
              component={ReportDisturbanceScreen}
              options={{ title: 'דיווח על רעש / מטרד' }}
            />

            <Stack.Screen
              name="BuildingUpdates"
              component={BuildingUpdatesScreen}
              options={{ title: 'עדכוני הבניין – סיכום שבועי' }}
            />

            <Stack.Screen
              name="PayFees"
              component={PayFeesScreen}
              options={{ title: 'תשלום מיסי ועד' }}
            />

            <Stack.Screen
              name="CommitteeRequests"
              component={CommitteeRequestsScreen}
            />

            <Stack.Screen
              name="CommitteeDisturbances"
              component={CommitteeDisturbancesScreen}
            />

            <Stack.Screen
              name="CommitteePaymentSetup"
              component={CommitteePaymentSetupScreen}
              options={{ title: 'הגדרת קישור תשלום' }}
            />

            <Stack.Screen
              name="PublicRequests"
              component={PublicRequestsScreen}
              options={{ title: 'בקשות מהשכנים' }}
            />


            <Stack.Screen
              name="BuildingDocuments"
              component={BuildingDocumentsScreen}
              options={{ headerShown: false }} // אם אתה מעצב את ה-header לבד
            />


            <Stack.Screen
              name="BuildingRules"
              component={BuildingRulesScreen}
              options={{ headerShown: false }}
            />


            <Stack.Screen
              name="CommitteeProviders"
              component={CommitteeProvidersScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        ) : user?.role === 'admin' ? (
          // --------- ADMIN ---------
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AdminDashboard">
              {props => <AdminScreen {...props} user={user} onSignOut={() => setUser(null)} />}
            </Stack.Screen>
            <Stack.Screen name="DeleteUsers" component={DeleteUserScreen} />
          </Stack.Navigator>
        ) : (
          // --------- המשתמש לא מחובר ---------
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onSignIn={setUser} />}
            </Stack.Screen>
            <Stack.Screen name="Signup">
              {props => <SignupScreen {...props} onSignIn={setUser} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
