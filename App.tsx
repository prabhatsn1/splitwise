import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

// Import context
import { AppProvider, useApp } from "./src/context/AppContext";

// Import components
import LoadingScreen from "./src/components/LoadingScreen";

// Import screens
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ExpensesScreen from "./src/screens/ExpensesScreen";
import GroupsScreen from "./src/screens/GroupsScreen";
import FriendsScreen from "./src/screens/FriendsScreen";
import AccountScreen from "./src/screens/AccountScreen";
import AddExpenseScreen from "./src/screens/AddExpenseScreen";
import CreateGroupScreen from "./src/screens/CreateGroupScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  const { state } = useApp();

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
        tabBarActiveTintColor: "#5bc5a7",
        tabBarInactiveTintColor: "gray",
        headerStyle: {
          backgroundColor: "#5bc5a7",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerRight: () => (
          <Ionicons
            name={state.isOfflineMode ? "cloud-offline" : "cloud-done"}
            size={20}
            color="#fff"
            style={{ marginRight: 16 }}
          />
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

  // Show main app navigation
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{
            title: "Add Expense",
            headerStyle: {
              backgroundColor: "#5bc5a7",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        />
        <Stack.Screen
          name="CreateGroup"
          component={CreateGroupScreen}
          options={{
            title: "Create Group",
            headerStyle: {
              backgroundColor: "#5bc5a7",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
