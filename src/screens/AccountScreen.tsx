import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { styles } from "../styles/screens/AccountScreen.styles";

export default function AccountScreen() {
  const { state, logout, syncData } = useApp();

  const calculateTotalBalance = () => {
    let totalOwed = 0;
    let totalOwing = 0;

    state.expenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === state.currentUser?.id
      );
      if (userSplit) {
        if (expense.paidBy.id === state.currentUser?.id) {
          totalOwed += expense.amount - (userSplit.amount ?? 0);
        } else {
          totalOwing += userSplit.amount ?? 0;
        }
      }
    });

    return { totalOwed, totalOwing, netBalance: totalOwed - totalOwing };
  };

  const { totalOwed, totalOwing, netBalance } = calculateTotalBalance();

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "This feature would allow you to export your expense data."
    );
  };

  const handleSettings = () => {
    Alert.alert("Settings", "This would open app settings.");
  };

  const handleSupport = () => {
    Alert.alert("Support", "Contact support at support@splitwise.com");
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      state.isOfflineMode
        ? "Are you sure you want to logout? Your offline data will be lost."
        : "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  const handleSyncData = async () => {
    if (!state.isOfflineMode) return;

    Alert.alert(
      "Sync Data",
      "This will sync your offline data to the cloud. You need to login first.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync",
          onPress: async () => {
            try {
              await syncData();
              Alert.alert("Success", "Data synced successfully!");
            } catch (error) {
              Alert.alert("Error", "Failed to sync data. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {state.currentUser?.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{state.currentUser?.name}</Text>
        <Text style={styles.userEmail}>{state.currentUser?.email}</Text>
        {state.isOfflineMode && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
              backgroundColor: "#fff3cd",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <Ionicons name="cloud-offline" size={16} color="#856404" />
            <Text
              style={{
                marginLeft: 6,
                fontSize: 12,
                color: "#856404",
                fontWeight: "500",
              }}
            >
              Offline Mode
            </Text>
          </View>
        )}
      </View>

      {/* Balance Summary */}
      <View style={styles.balanceSection}>
        <Text style={styles.sectionTitle}>Your Balance Summary</Text>

        <View style={styles.balanceCard}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Total you are owed</Text>
            <Text style={[styles.balanceValue, { color: "#4CAF50" }]}>
              ₹{totalOwed.toFixed(2)}
            </Text>
          </View>

          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Total you owe</Text>
            <Text style={[styles.balanceValue, { color: "#F44336" }]}>
              ₹{totalOwing.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.balanceItem, styles.netBalanceItem]}>
            <Text style={styles.netBalanceLabel}>Net balance</Text>
            <Text
              style={[
                styles.netBalanceValue,
                { color: netBalance >= 0 ? "#4CAF50" : "#F44336" },
              ]}
            >
              {netBalance >= 0 ? "+" : "-"}₹{Math.abs(netBalance).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Statistics</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.expenses.length}</Text>
            <Text style={styles.statLabel}>Total Expenses</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.groups.length}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.friends.length}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              ₹
              {state.expenses
                .reduce(
                  (sum, expense) =>
                    expense.paidBy.id === state.currentUser?.id
                      ? sum + expense.amount
                      : sum,
                  0
                )
                .toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Paid</Text>
          </View>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        {state.isOfflineMode && (
          <TouchableOpacity style={styles.menuItem} onPress={handleSyncData}>
            <View style={styles.menuIcon}>
              <Ionicons name="sync-outline" size={20} color="#5bc5a7" />
            </View>
            <Text style={styles.menuText}>Sync Data</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={handleExportData}>
          <View style={styles.menuIcon}>
            <Ionicons name="download-outline" size={20} color="#5bc5a7" />
          </View>
          <Text style={styles.menuText}>Export Data</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
          <View style={styles.menuIcon}>
            <Ionicons name="settings-outline" size={20} color="#5bc5a7" />
          </View>
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleSupport}>
          <View style={styles.menuIcon}>
            <Ionicons name="help-circle-outline" size={20} color="#5bc5a7" />
          </View>
          <Text style={styles.menuText}>Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <View style={[styles.menuIcon, { backgroundColor: "#ffebee" }]}>
            <Ionicons name="log-out-outline" size={20} color="#F44336" />
          </View>
          <Text style={[styles.menuText, { color: "#F44336" }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>Splitwise Clone v1.0.0</Text>
        <Text style={styles.appDescription}>
          Split expenses with friends and family
        </Text>
        <Text style={styles.appDescription}>
          {state.isOfflineMode
            ? "Running in offline mode"
            : "Connected to cloud"}
        </Text>
      </View>
    </ScrollView>
  );
}
