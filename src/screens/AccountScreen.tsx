import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { useTheme, ThemeMode } from "../context/ThemeContext";
import BiometricService from "../services/biometricService";
import SyncQueueService from "../services/syncQueueService";
import { exportToCSV, exportToPDF } from "../services/exportService";

export default function AccountScreen() {
  const { state, logout, syncData } = useApp();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    (async () => {
      const bio = BiometricService.getInstance();
      const available = await bio.isAvailable();
      setBiometricAvailable(available);
      if (available) {
        const enabled = await bio.isBiometricEnabled();
        setBiometricEnabled(enabled);
        const label = await bio.getBiometricLabel();
        setBiometricLabel(label);
      }
    })();
  }, []);

  // Track pending sync queue
  useEffect(() => {
    const syncQueue = SyncQueueService.getInstance();
    setPendingSyncCount(syncQueue.pendingCount);
    const unsub = syncQueue.addProgressListener((progress) => {
      setPendingSyncCount(syncQueue.pendingCount);
    });
    return unsub;
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    const bio = BiometricService.getInstance();
    if (value) {
      // Verify identity before enabling
      const success = await bio.authenticate(
        `Confirm ${biometricLabel} to enable`,
      );
      if (!success) return;
    }
    await bio.setBiometricEnabled(value);
    setBiometricEnabled(value);
  };

  const calculateTotalBalance = () => {
    let totalOwed = 0;
    let totalOwing = 0;

    state.expenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === state.currentUser?.id,
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
    Alert.alert("Export Data", `Export ${state.expenses.length} expenses as:`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "CSV",
        onPress: async () => {
          try {
            await exportToCSV(state.expenses);
          } catch {
            Alert.alert("Error", "Failed to export CSV.");
          }
        },
      },
      {
        text: "PDF",
        onPress: async () => {
          try {
            await exportToPDF(
              state.expenses,
              state.currentUser?.name ?? "User",
            );
          } catch {
            Alert.alert("Error", "Failed to export PDF.");
          }
        },
      },
    ]);
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
      ],
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
      ],
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Profile Section */}
      <View
        style={{
          backgroundColor: colors.card,
          alignItems: "center",
          padding: 32,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.primary,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "bold" }}>
            {state.currentUser?.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: colors.textPrimary,
            marginBottom: 4,
          }}
        >
          {state.currentUser?.name}
        </Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary }}>
          {state.currentUser?.email}
        </Text>
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
      <View
        style={{ backgroundColor: colors.card, marginBottom: 16, padding: 16 }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: colors.textPrimary,
            marginBottom: 16,
          }}
        >
          Your Balance Summary
        </Text>
        <View
          style={{
            backgroundColor: colors.backgroundDark,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              Total you are owed
            </Text>
            <Text
              style={{ fontSize: 16, fontWeight: "500", color: colors.success }}
            >
              ₹{totalOwed.toFixed(2)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              Total you owe
            </Text>
            <Text
              style={{ fontSize: 16, fontWeight: "500", color: colors.error }}
            >
              ₹{totalOwing.toFixed(2)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 12,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "500",
                color: colors.textPrimary,
              }}
            >
              Net balance
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: netBalance >= 0 ? colors.success : colors.error,
              }}
            >
              {netBalance >= 0 ? "+" : "-"}₹{Math.abs(netBalance).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <View
        style={{ backgroundColor: colors.card, marginBottom: 16, padding: 16 }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: colors.textPrimary,
            marginBottom: 16,
          }}
        >
          Statistics
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {[
            { value: state.expenses.length, label: "Total Expenses" },
            { value: state.groups.length, label: "Groups" },
            { value: state.friends.length, label: "Friends" },
            {
              value: `₹${state.expenses.reduce((sum, e) => (e.paidBy.id === state.currentUser?.id ? sum + e.amount : sum), 0).toFixed(0)}`,
              label: "Total Paid",
            },
          ].map((stat, i) => (
            <View
              key={i}
              style={{
                width: "48%",
                backgroundColor: colors.backgroundDark,
                borderRadius: 8,
                padding: 16,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: colors.primary,
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  textAlign: "center",
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Menu Options */}
      <View style={{ backgroundColor: colors.card, marginBottom: 16 }}>
        {/* Dark Mode Toggle */}
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primaryLight,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
              }}
            >
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={20}
                color={colors.primary}
              />
            </View>
            <Text style={{ flex: 1, fontSize: 16, color: colors.textPrimary }}>
              Theme
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, paddingLeft: 48 }}>
            {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    themeMode === mode ? colors.primary : colors.backgroundDark,
                  borderWidth: 1,
                  borderColor:
                    themeMode === mode ? colors.primary : colors.border,
                }}
                onPress={() => setThemeMode(mode)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: themeMode === mode ? "#fff" : colors.textPrimary,
                    fontWeight: themeMode === mode ? "600" : "400",
                  }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {state.isOfflineMode && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
            onPress={handleSyncData}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primaryLight,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
              }}
            >
              <Ionicons name="sync-outline" size={20} color={colors.primary} />
            </View>
            <Text style={{ flex: 1, fontSize: 16, color: colors.textPrimary }}>
              Sync Data
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}

        {pendingSyncCount > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              backgroundColor: "#fff3cd",
              borderRadius: 8,
              marginHorizontal: 8,
              marginVertical: 4,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#ffeeba",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
              }}
            >
              <Ionicons name="time-outline" size={20} color="#856404" />
            </View>
            <Text style={{ color: "#856404", flex: 1, fontSize: 16 }}>
              {pendingSyncCount} pending sync{" "}
              {pendingSyncCount === 1 ? "item" : "items"}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
          onPress={handleExportData}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primaryLight,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Ionicons
              name="download-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={{ flex: 1, fontSize: 16, color: colors.textPrimary }}>
            Export Data
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
          onPress={handleSettings}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primaryLight,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={{ flex: 1, fontSize: 16, color: colors.textPrimary }}>
            Settings
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        {biometricAvailable && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primaryLight,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
              }}
            >
              <Ionicons
                name="finger-print-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <Text style={{ flex: 1, fontSize: 16, color: colors.textPrimary }}>
              Unlock with {biometricLabel}
            </Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={biometricEnabled ? "#fff" : "#f4f3f4"}
            />
          </View>
        )}

        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
          onPress={handleSupport}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primaryLight,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={{ flex: 1, fontSize: 16, color: colors.textPrimary }}>
            Support
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
          onPress={handleLogout}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#ffebee",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </View>
          <Text style={{ flex: 1, fontSize: 16, color: colors.error }}>
            Logout
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={{ alignItems: "center", padding: 32 }}>
        <Text
          style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}
        >
          Splitwise Clone v1.0.0
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textTertiary,
            textAlign: "center",
          }}
        >
          Split expenses with friends and family
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textTertiary,
            textAlign: "center",
          }}
        >
          {state.isOfflineMode
            ? "Running in offline mode"
            : "Connected to cloud"}
        </Text>
      </View>
    </ScrollView>
  );
}
