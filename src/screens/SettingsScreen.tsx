import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme, ThemeMode } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";
import BiometricService from "../services/biometricService";
import { exportToCSV, exportToPDF } from "../services/exportService";
import { RootStackParamList } from "../types";

type SettingsNavProp = StackNavigationProp<RootStackParamList>;

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"];

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "700",
        color: colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

// ─── Row with trailing arrow ──────────────────────────────────────────────────
function SettingsRow({
  icon,
  iconBg,
  label,
  value,
  onPress,
  colors,
  hideArrow = false,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  colors: any;
  hideArrow?: boolean;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.borderLight,
      }}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          backgroundColor: iconBg,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={icon as any} size={18} color="#fff" />
      </View>
      <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}>
        {label}
      </Text>
      {value ? (
        <Text
          style={{ fontSize: 14, color: colors.textSecondary, marginRight: 6 }}
        >
          {value}
        </Text>
      ) : null}
      {!hideArrow && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textTertiary}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Row with a Switch ────────────────────────────────────────────────────────
function ToggleRow({
  icon,
  iconBg,
  label,
  subtitle,
  value,
  onValueChange,
  colors,
}: {
  icon: string;
  iconBg: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.borderLight,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          backgroundColor: iconBg,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={icon as any} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: colors.textPrimary }}>{label}</Text>
        {subtitle ? (
          <Text
            style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { state } = useApp();

  // Biometric
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");

  // Notifications (local state, persisted via AsyncStorage in a real app)
  const [expenseReminders, setExpenseReminders] = useState(true);
  const [settlementAlerts, setSettlementAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Currency
  const [currency, setCurrency] = useState("INR");

  // Privacy
  const [hideAmounts, setHideAmounts] = useState(false);

  useEffect(() => {
    (async () => {
      const bio = BiometricService.getInstance();
      const available = await bio.isAvailable();
      setBiometricAvailable(available);
      if (available) {
        setBiometricEnabled(await bio.isBiometricEnabled());
        setBiometricLabel(await bio.getBiometricLabel());
      }
    })();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleBiometric = async (value: boolean) => {
    const bio = BiometricService.getInstance();
    if (value) {
      const ok = await bio.authenticate(`Confirm ${biometricLabel} to enable`);
      if (!ok) return;
    }
    await bio.setBiometricEnabled(value);
    setBiometricEnabled(value);
  };

  const handleTheme = () => {
    const options: { text: string; mode: ThemeMode }[] = [
      { text: "Light", mode: "light" },
      { text: "Dark", mode: "dark" },
      { text: "System Default", mode: "system" },
    ];
    Alert.alert(
      "Choose Theme",
      `Current: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}`,
      [
        ...options.map((o) => ({
          text: o.text + (themeMode === o.mode ? "  ✓" : ""),
          onPress: () => setThemeMode(o.mode),
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  };

  const handleCurrency = () => {
    Alert.alert("Default Currency", "Select your preferred currency", [
      ...CURRENCIES.map((c) => ({
        text: c + (currency === c ? "  ✓" : ""),
        onPress: () => setCurrency(c),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const handleBudgetSettings = () => {
    navigation.navigate("BudgetSettings");
  };

  const handleExportCSV = async () => {
    try {
      await exportToCSV(state.expenses);
    } catch {
      Alert.alert("Error", "Failed to export CSV.");
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF(state.expenses, state.currentUser?.name ?? "User");
    } catch {
      Alert.alert("Error", "Failed to export PDF.");
    }
  };

  const handleExportData = () => {
    Alert.alert("Export Data", `Export ${state.expenses.length} expenses as:`, [
      { text: "Cancel", style: "cancel" },
      { text: "CSV", onPress: handleExportCSV },
      { text: "PDF", onPress: handleExportPDF },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear locally cached data. Your synced data will remain intact.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => Alert.alert("Done", "Cache cleared successfully."),
        },
      ],
    );
  };

  const handleSupport = () =>
    Alert.alert("Support", "Email us at support@splitwise.com");

  const handlePrivacyPolicy = () =>
    Alert.alert("Privacy Policy", "Opens privacy policy in browser.");

  const handleTerms = () =>
    Alert.alert("Terms of Service", "Opens terms of service in browser.");

  const handleRateApp = () =>
    Alert.alert("Rate App", "Opens app store rating page.");

  const themeLabel =
    themeMode === "light" ? "Light" : themeMode === "dark" ? "Dark" : "System";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Appearance ─────────────────────────────────────────────────────── */}
      <SectionHeader title="Appearance" colors={colors} />
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
        }}
      >
        <SettingsRow
          icon="color-palette-outline"
          iconBg="#9C27B0"
          label="Theme"
          value={themeLabel}
          onPress={handleTheme}
          colors={colors}
        />
        <ToggleRow
          icon="moon-outline"
          iconBg="#3F51B5"
          label="Dark Mode"
          subtitle="Overrides system theme setting"
          value={isDark}
          onValueChange={(v) => setThemeMode(v ? "dark" : "light")}
          colors={colors}
        />
      </View>

      {/* ── Notifications ───────────────────────────────────────────────────── */}
      <SectionHeader title="Notifications" colors={colors} />
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
        }}
      >
        <ToggleRow
          icon="notifications-outline"
          iconBg="#FF9800"
          label="Expense Reminders"
          subtitle="Remind you of unpaid balances"
          value={expenseReminders}
          onValueChange={setExpenseReminders}
          colors={colors}
        />
        <ToggleRow
          icon="checkmark-circle-outline"
          iconBg="#4CAF50"
          label="Settlement Alerts"
          subtitle="Notify when someone settles up"
          value={settlementAlerts}
          onValueChange={setSettlementAlerts}
          colors={colors}
        />
        <ToggleRow
          icon="calendar-outline"
          iconBg="#2196F3"
          label="Weekly Digest"
          subtitle="Summary every Monday morning"
          value={weeklyDigest}
          onValueChange={setWeeklyDigest}
          colors={colors}
        />
      </View>

      {/* ── Privacy & Security ──────────────────────────────────────────────── */}
      <SectionHeader title="Privacy & Security" colors={colors} />
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
        }}
      >
        {biometricAvailable && (
          <ToggleRow
            icon="finger-print-outline"
            iconBg="#5bc5a7"
            label={biometricLabel}
            subtitle={`Require ${biometricLabel} to open the app`}
            value={biometricEnabled}
            onValueChange={handleToggleBiometric}
            colors={colors}
          />
        )}
        <ToggleRow
          icon="eye-off-outline"
          iconBg="#607D8B"
          label="Hide Amounts"
          subtitle="Blur money values on the main screen"
          value={hideAmounts}
          onValueChange={setHideAmounts}
          colors={colors}
        />
      </View>

      {/* ── Currency & Locale ───────────────────────────────────────────────── */}
      <SectionHeader title="Currency & Locale" colors={colors} />
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
        }}
      >
        <SettingsRow
          icon="cash-outline"
          iconBg="#5bc5a7"
          label="Default Currency"
          value={currency}
          onPress={handleCurrency}
          colors={colors}
        />
        <SettingsRow
          icon="wallet-outline"
          iconBg="#FF5722"
          label="Monthly Budgets"
          value="Set limits"
          onPress={handleBudgetSettings}
          colors={colors}
        />
      </View>

      {/* ── Data Management ─────────────────────────────────────────────────── */}
      <SectionHeader title="Data Management" colors={colors} />
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
        }}
      >
        <SettingsRow
          icon="download-outline"
          iconBg="#009688"
          label="Export Data"
          value={`${state.expenses.length} expenses`}
          onPress={handleExportData}
          colors={colors}
        />
        <SettingsRow
          icon="trash-outline"
          iconBg="#F44336"
          label="Clear Cache"
          onPress={handleClearCache}
          colors={colors}
        />
      </View>

      {/* ── Support ─────────────────────────────────────────────────────────── */}
      <SectionHeader title="Support" colors={colors} />
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
        }}
      >
        <SettingsRow
          icon="chatbubble-ellipses-outline"
          iconBg="#2196F3"
          label="Contact Support"
          onPress={handleSupport}
          colors={colors}
        />
        <SettingsRow
          icon="document-text-outline"
          iconBg="#607D8B"
          label="Privacy Policy"
          onPress={handlePrivacyPolicy}
          colors={colors}
        />
        <SettingsRow
          icon="newspaper-outline"
          iconBg="#795548"
          label="Terms of Service"
          onPress={handleTerms}
          colors={colors}
        />
        <SettingsRow
          icon="star-outline"
          iconBg="#FF9800"
          label="Rate the App"
          onPress={handleRateApp}
          colors={colors}
        />
      </View>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <View style={{ alignItems: "center", paddingTop: 32 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            backgroundColor: colors.primary,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Ionicons name="wallet-outline" size={28} color="#fff" />
        </View>
        <Text
          style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}
        >
          Splitwise Clone
        </Text>
        <Text
          style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}
        >
          Version 1.0.0
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textTertiary,
            marginTop: 6,
            textAlign: "center",
            paddingHorizontal: 32,
          }}
        >
          Split expenses easily with friends and groups.
        </Text>
      </View>
    </ScrollView>
  );
}
