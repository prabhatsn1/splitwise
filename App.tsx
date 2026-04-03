import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: expo-notifications may not be installed yet
import * as Notifications from "expo-notifications";
import { NavigationContainerRef } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState as RNAppState,
} from "react-native";

// Import context
import { AppProvider, useApp } from "./src/context/AppContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";

// Import components
import LoadingScreen from "./src/components/LoadingScreen";
import AnimatedSplashScreen from "./src/components/AnimatedSplashScreen";
import ErrorBoundary from "./src/components/ErrorBoundary";

// Import screens
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ExpensesScreen from "./src/screens/ExpensesScreen";
import GroupsScreen from "./src/screens/GroupsScreen";
import FriendsScreen from "./src/screens/FriendsScreen";
import AccountScreen from "./src/screens/AccountScreen";
import AddExpenseScreen from "./src/screens/AddExpenseScreen";
import EditExpenseScreen from "./src/screens/EditExpenseScreen";
import CreateGroupScreen from "./src/screens/CreateGroupScreen";
import SettleUpScreen from "./src/screens/SettleUpScreen";
import SettlementHistoryScreen from "./src/screens/SettlementHistoryScreen";
import ExpenseDetailsScreen from "./src/screens/ExpenseDetailsScreen";
import GroupDetailsScreen from "./src/screens/GroupDetailsScreen";
import GroupInviteScreen from "./src/screens/GroupInviteScreen";
import GroupAnalyticsScreen from "./src/screens/GroupAnalyticsScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import BudgetSettingsScreen from "./src/screens/BudgetSettingsScreen";
import CustomCategoriesScreen from "./src/screens/CustomCategoriesScreen";
import InviteFriendScreen from "./src/screens/InviteFriendScreen";

// Import services
import * as SplashScreen from "expo-splash-screen";
import NotificationService from "./src/services/notificationService";
import BiometricService from "./src/services/biometricService";
import { RootStackParamList } from "./src/types";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

function TabNavigator() {
  const { state, loadUserGroups, loadUserExpenses, loadFriends, calculateUserBalance, loadSettlements } = useApp();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        loadUserGroups(),
        loadUserExpenses(),
        loadFriends(),
        loadSettlements(),
      ]);
      await calculateUserBalance();
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Expenses") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Groups") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Friends") {
            iconName = focused ? "person-add" : "person-add-outline";
          } else if (route.name === "Account") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginRight: 16 }}>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              style={{ opacity: refreshing ? 0.5 : 1 }}
            >
              <Ionicons
                name="refresh"
                size={22}
                color={colors.headerText}
              />
            </TouchableOpacity>
            <Ionicons
              name={state.isOfflineMode ? "cloud-offline" : "cloud-done"}
              size={20}
              color={colors.headerText}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { state } = useApp();
  const { colors, isDark } = useTheme();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);
  const notificationResponseListener =
    useRef<Notifications.EventSubscription>(undefined);

  // Biometric lock state
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);

  // Check biometric on mount and when returning from background
  useEffect(() => {
    const checkBiometric = async () => {
      const bio = BiometricService.getInstance();
      const enabled = await bio.isBiometricEnabled();
      if (enabled && !state.needsLogin) {
        setBiometricLocked(true);
        const success = await bio.authenticate();
        setBiometricLocked(!success);
      }
      setBiometricChecked(true);
    };

    checkBiometric();

    // Re-lock when app comes back from background
    const subscription = RNAppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkBiometric();
      }
    });

    return () => subscription.remove();
  }, [state.needsLogin]);

  // Initialize push notifications
  useEffect(() => {
    NotificationService.getInstance().registerForPushNotifications();

    // Handle tap on notification — deep link into the app
    notificationResponseListener.current =
      NotificationService.getInstance().addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data as Record<
            string,
            string
          >;
          if (!navigationRef.current) return;

          if (data.type === "new_expense" && data.expenseId) {
            navigationRef.current.navigate("ExpenseDetails", {
              expenseId: data.expenseId,
            });
          }
        },
      );

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, []);

  // Show loading screen while initializing
  if (state.loading) {
    return (
      <LoadingScreen
        message={
          state.isOfflineMode ? "Loading offline data..." : "Connecting..."
        }
        error={state.error}
      />
    );
  }

  // Show login screen if user needs to login
  if (state.needsLogin) {
    return <LoginScreen />;
  }

  // Show biometric lock screen
  if (biometricLocked || !biometricChecked) {
    return (
      <View
        style={[lockStyles.container, { backgroundColor: colors.background }]}
      >
        <Ionicons name="lock-closed" size={64} color={colors.primary} />
        <Text style={[lockStyles.title, { color: colors.textPrimary }]}>
          Splitwise is Locked
        </Text>
        <Text style={[lockStyles.subtitle, { color: colors.textSecondary }]}>
          Authenticate to continue
        </Text>
        <TouchableOpacity
          style={[lockStyles.button, { backgroundColor: colors.primary }]}
          onPress={async () => {
            const bio = BiometricService.getInstance();
            const success = await bio.authenticate();
            if (success) setBiometricLocked(false);
          }}
        >
          <Ionicons name="finger-print" size={24} color="#fff" />
          <Text style={lockStyles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show main app navigation
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={isDark ? "light" : "light"} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ title: "Add Expense" }}
        />
        <Stack.Screen
          name="EditExpense"
          component={EditExpenseScreen}
          options={{ title: "Edit Expense" }}
        />
        <Stack.Screen
          name="CreateGroup"
          component={CreateGroupScreen}
          options={{ title: "Create Group" }}
        />
        <Stack.Screen
          name="SettleUp"
          component={SettleUpScreen}
          options={{ title: "Settle Up" }}
        />
        <Stack.Screen
          name="SettlementHistory"
          component={SettlementHistoryScreen}
          options={{ title: "Settlement History" }}
        />
        <Stack.Screen
          name="ExpenseDetails"
          component={ExpenseDetailsScreen}
          options={{ title: "Expense Details" }}
        />
        <Stack.Screen
          name="GroupDetails"
          component={GroupDetailsScreen}
          options={{ title: "Group Details" }}
        />
        <Stack.Screen
          name="GroupInvite"
          component={GroupInviteScreen}
          options={{ title: "Invite to Group" }}
        />
        <Stack.Screen
          name="GroupAnalytics"
          component={GroupAnalyticsScreen}
          options={{ title: "Group Analytics" }}
        />
        <Stack.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{ title: "Analytics" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
        <Stack.Screen
          name="BudgetSettings"
          component={BudgetSettingsScreen}
          options={{ title: "Monthly Budgets" }}
        />
        <Stack.Screen
          name="CustomCategories"
          component={CustomCategoriesScreen}
          options={{ title: "Expense Categories" }}
        />
        <Stack.Screen
          name="InviteFriend"
          component={InviteFriendScreen}
          options={{ title: "Invite Friend" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const lockStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5bc5a7",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(async () => {
    await SplashScreen.hideAsync();
    setSplashDone(true);
  }, []);

  if (!splashDone) {
    return <AnimatedSplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
