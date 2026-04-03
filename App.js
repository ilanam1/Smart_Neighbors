
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
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import BuildingDocumentsScreen from "./screens/BuildingDocumentsScreen";
import BuildingRulesScreen from "./screens/BuildingRulesScreen";
import { getSupabase } from './DataBase/supabase';
import CommitteeProvidersScreen from './screens/CommitteeProvidersScreen';
import AdminScreen from './screens/AdminScreen';
import DeleteUserScreen from './screens/DeleteUserScreen';
import EquipmentCategoriesScreen from './screens/EquipmentCategoriesScreen';
import EquipmentListScreen from './screens/EquipmentListScreen';
import AddEquipmentScreen from './screens/AddEquipmentScreen';
import EquipmentDetailsScreen from './screens/EquipmentDetailsScreen';
import RequestLoanScreen from './screens/RequestLoanScreen';
import IncomingLoanRequestsScreen from './screens/IncomingLoanRequestsScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import SelectUserForChatScreen from './screens/SelectUserForChatScreen';
import CommitteeWeeklyForecastScreen from "./screens/CommitteeWeeklyForecastScreen";
import EmployeeHomeScreen from './screens/EmployeeHomeScreen';
import EmployeeBuildingsScreen from './screens/EmployeeBuildingsScreen';
import EmployeeAssignmentRequestScreen from './screens/EmployeeAssignmentRequestScreen';
import EmployeeJobRequestScreen from './screens/EmployeeJobRequestScreen';
import EmployeeJobRequestsListScreen from './screens/EmployeeJobRequestsListScreen';
import EmployeeCompletedJobsScreen from './screens/EmployeeCompletedJobsScreen';

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
        {user && user.role !== 'admin' && user.role !== 'employee' ? (
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
              name="VerifyEmail"
              component={VerifyEmailScreen}
              options={{ title: 'אימות אימייל' }}
            />

            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ title: 'שינוי סיסמה חדשה' }}
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



            <Stack.Screen 
              name="EquipmentCategories" 
              component={EquipmentCategoriesScreen} 
            />


            <Stack.Screen 
            name="EquipmentList" 
            component={EquipmentListScreen} 
            />



            <Stack.Screen 
            name="AddEquipment" 
            component={AddEquipmentScreen} 
            />


            <Stack.Screen 
            name="EquipmentDetails" 
            component={EquipmentDetailsScreen} 
            />


            <Stack.Screen 
            name="RequestLoan" 
            component={RequestLoanScreen} 
            />


            <Stack.Screen
            name="IncomingLoanRequests"
            component={IncomingLoanRequestsScreen}
            options={{ title: 'בקשות השאלה שקיבלתי' }}
            />

            <Stack.Screen
              name="ChatList"
              component={ChatListScreen}
              options={{ title: 'צ\'אטים' }}
            />

            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={{ title: 'שיחה' }}
            />

            <Stack.Screen
              name="SelectUserForChat"
              component={SelectUserForChatScreen}
              options={{ title: 'בחר שכן' }}
            />


            <Stack.Screen
              name="CommitteeWeeklyForecast"
              component={CommitteeWeeklyForecastScreen}
              options={{ title: "תחזית שבועית" }}
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
        ) : user?.role === 'employee' ? (
          // --------- ספק שירות / עובד ---------
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="EmployeeHome">
              {props => <EmployeeHomeScreen {...props} user={user} onSignOut={() => setUser(null)} />}
            </Stack.Screen>
            <Stack.Screen name="EmployeeBuildings" component={EmployeeBuildingsScreen} />
            <Stack.Screen name="EmployeeAssignmentRequest" component={EmployeeAssignmentRequestScreen} />
            <Stack.Screen name="EmployeeJobRequest" component={EmployeeJobRequestScreen} />
            <Stack.Screen name="EmployeeJobRequestsList" component={EmployeeJobRequestsListScreen} />
            <Stack.Screen name="EmployeeCompletedJobs" component={EmployeeCompletedJobsScreen} />
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
