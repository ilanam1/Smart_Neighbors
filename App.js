
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
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
import CommitteePendingUsersScreen from './screens/CommitteePendingUsersScreen';
import CommitteePaymentSetupScreen from './screens/CommitteePaymentSetupScreen';
import PublicRequestsScreen from './screens/PublicRequestsScreen';
import ProfilePageScreen from './screens/ProfilePageScreen';
import MfaSetupScreen from './screens/MfaSetupScreen';
import StandaloneMfaChallengeScreen from './screens/StandaloneMfaChallengeScreen';
import PendingApprovalScreen from './screens/PendingApprovalScreen';
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import BuildingDocumentsScreen from "./screens/BuildingDocumentsScreen";
import BuildingRulesScreen from "./screens/BuildingRulesScreen";
import { getSupabase } from './DataBase/supabase';
import CommitteeProvidersScreen from './screens/CommitteeProvidersScreen';
import AdminScreen from './screens/AdminScreen';
import AdminPendingCommitteesScreen from './screens/AdminPendingCommitteesScreen';
import AdminAddBuildingScreen from './screens/AdminAddBuildingScreen';
import AdminBuildingsScreen from './screens/AdminBuildingsScreen';
import AdminServiceCompaniesScreen from './screens/AdminServiceCompaniesScreen';
import AdminAddCompanyScreen from './screens/AdminAddCompanyScreen';
import AdminCompanyDetailsScreen from './screens/AdminCompanyDetailsScreen';
import AdminAddEmployeeScreen from './screens/AdminAddEmployeeScreen';
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
import CommitteeMonthlyFeeScreen from './screens/CommitteeMonthlyFeeScreen';
import CommitteePaymentsManagementScreen from './screens/CommitteePaymentsManagementScreen';
import CommitteeInsightsScreen from "./screens/CommitteeInsightsScreen";
import EmployeeMonthlyReportScreen from "./screens/EmployeeMonthlyReportScreen";
import CommitteeInspectionsScreen from "./screens/CommitteeInspectionsScreen";
import EmployeePeriodicInspectionsScreen from "./screens/EmployeePeriodicInspectionsScreen";
import EmployeeInspectionDetailsScreen from "./screens/EmployeeInspectionDetailsScreen";
import BuildingCalendarScreen from "./screens/BuildingCalendarScreen";
import AdminLoadMonitoringScreen from './screens/AdminLoadMonitoringScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [mfaChallengeConfig, setMfaChallengeConfig] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const supabase = getSupabase();

  const processSession = async (session) => {
    if (!session) {
      setUser(null);
      setMfaChallengeConfig(null);
      setAuthChecking(false);
      return;
    }

    try {
      const { data: profile } = await supabase.from('profiles').select('is_approved, is_house_committee').eq('auth_uid', session.user.id).single();
      if (profile && profile.is_approved === false) {
        session.user.needs_approval = true;
      }
    } catch(e){}

    try {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aalError && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
        const factors = await supabase.auth.mfa.listFactors();
        const totpFactor = factors.data?.totp?.find(f => f.status === 'verified');
        if (totpFactor) {
          setMfaChallengeConfig({ factorId: totpFactor.id, user: session.user });
          setUser(null);
          setAuthChecking(false);
          return;
        }
      }
    } catch(e) {}

    setMfaChallengeConfig(null);
    setUser(session.user);
    setAuthChecking(false);
  };

  useEffect(() => {
    let subscription = null;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await processSession(data?.session);
      } catch (e) {
        processSession(null);
      }
    })();

    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsRecovering(true);
        }
        if (event === "SIGNED_OUT") {
          processSession(null);
          return;
        }
        
        // Push processSession to the next tick to heavily avoid React Native AsyncStorage deadlocks
        // during token upgrade processes like mfa.verify
        setTimeout(() => {
          processSession(session);
        }, 500);
      });
      subscription = data?.subscription || null;
    } catch (e) {
      console.log('auth listener failed', e);
      processSession(null);
    }

    return () => {
      try {
        subscription?.unsubscribe?.();
      } catch { }
    };
  }, [supabase]);

  if (authChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00f2ff" />
      </View>
    );
  }

  return (
    <StripeProvider
      publishableKey="pk_test_51TQPOECyAT1eCIn0Xwk2MVZPL4i29Gf7lBT6aOp0PCWHCKE80Bsa4LhAUcv4Dr2jA1CcpRwtEptZGnj1OI7Vplrq00QDKbSLcM"
      merchantIdentifier="com.smartneighbors"
    >
      <SafeAreaProvider>
        <NavigationContainer>
        {mfaChallengeConfig ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="StandaloneMfaChallenge">
              {props => (
                <StandaloneMfaChallengeScreen 
                  {...props} 
                  factorId={mfaChallengeConfig.factorId} 
                  onCancel={() => processSession(null)} 
                  onVerify={(session) => {
                    setMfaChallengeConfig(null);
                    if (session && session.user) {
                      // Preserve needs_approval if it was attached
                      session.user.needs_approval = mfaChallengeConfig.user?.needs_approval;
                      setUser(session.user);
                    } else {
                      supabase.auth.getUser().then(({ data }) => {
                        if (data?.user) data.user.needs_approval = mfaChallengeConfig.user?.needs_approval;
                        setUser(data?.user);
                      });
                    }
                  }}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        ) : user?.needs_approval ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
          </Stack.Navigator>
        ) : user && user.role !== 'admin' && user.role !== 'employee' ? (
          // --------- המשתמש מחובר ---------
          <Stack.Navigator initialRouteName={isRecovering ? "ChangePassword" : "Home"}>
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
              name="MfaSetupScreen"
              component={MfaSetupScreen}
              options={{ title: 'הגדרת אימות דו-שלבי' }}
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
              name="CommitteePendingUsers"
              component={CommitteePendingUsersScreen}
              options={{ title: 'אישור דיירים' }}
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


            <Stack.Screen
              name="CommitteeMonthlyFee"
              component={CommitteeMonthlyFeeScreen}
              options={{ title: 'ניהול סכום חודשי' }}
            />

            <Stack.Screen
              name="CommitteePaymentsManagement"
              component={CommitteePaymentsManagementScreen}
              options={{ title: 'ניהול תשלומים' }}
            />



            <Stack.Screen
              name="CommitteeInsights"
              component={CommitteeInsightsScreen}
              options={{ title: "סטטיסטיקות ועד הבית" }}
            />



            <Stack.Screen
              name="CommitteeInspections"
              component={CommitteeInspectionsScreen}
              options={{ headerShown: false }}
            />


            <Stack.Screen
              name="BuildingCalendar"
              component={BuildingCalendarScreen}
              options={{ headerShown: false }}
            />

          </Stack.Navigator>
        ) : user?.role === 'admin' ? (
          // --------- ADMIN ---------
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AdminDashboard">
              {props => <AdminScreen {...props} user={user} onSignOut={() => setUser(null)} />}
            </Stack.Screen>
            <Stack.Screen name="AdminPendingCommittees" component={AdminPendingCommitteesScreen} />
            <Stack.Screen name="AdminAddBuilding" component={AdminAddBuildingScreen} />
            <Stack.Screen name="AdminBuildings" component={AdminBuildingsScreen} />
            <Stack.Screen name="AdminServiceCompanies" component={AdminServiceCompaniesScreen} />
            <Stack.Screen name="AdminAddCompany" component={AdminAddCompanyScreen} />
            <Stack.Screen name="AdminCompanyDetails" component={AdminCompanyDetailsScreen} />
            <Stack.Screen name="AdminAddEmployee" component={AdminAddEmployeeScreen} />
            <Stack.Screen name="DeleteUsers" component={DeleteUserScreen} />
            <Stack.Screen
              name="AdminLoadMonitoring"
              component={AdminLoadMonitoringScreen}
            />
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
            <Stack.Screen
              name="EmployeeMonthlyReport"
              component={EmployeeMonthlyReportScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="EmployeePeriodicInspections"
              component={EmployeePeriodicInspectionsScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="EmployeeInspectionDetails"
              component={EmployeeInspectionDetailsScreen}
              options={{ headerShown: false }}
            />
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
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
    </StripeProvider>
  );
}
