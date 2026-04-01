import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";

const CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Shopping",
  "Travel",
  "Other",
];

export default function BudgetSettingsScreen() {
  const { colors } = useTheme();
  const { state, saveBudgets } = useApp();

  // Local state stores string values for text input editing
  const [localBudgets, setLocalBudgets] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(state.budgets).map(([k, v]) => [k, String(v)]),
    ),
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const parsed: Record<string, number> = {};
      Object.entries(localBudgets).forEach(([k, v]) => {
        const n = parseFloat(v);
        if (!isNaN(n) && n > 0) parsed[k] = n;
      });
      await saveBudgets(parsed);
      Alert.alert("Success", "Monthly budgets saved successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to save budgets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetChange = (category: string, value: string) => {
    setLocalBudgets((prev) => ({ ...prev, [category]: value }));
  };

  const totalBudget = Object.values(localBudgets).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0,
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: 20,
            lineHeight: 20,
          }}
        >
          Set monthly spending limits for each category. You'll see budget vs
          actual comparisons in Analytics.
        </Text>

        {/* Total Budget Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginBottom: 4,
            }}
          >
            Total Monthly Budget
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: colors.primary,
            }}
          >
            ₹{totalBudget.toFixed(0)}
          </Text>
        </View>

        {/* Category Budgets */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {CATEGORIES.map((category, index) => (
            <View
              key={category}
              style={{
                padding: 16,
                borderBottomWidth:
                  index < CATEGORIES.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.borderLight,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: colors.textPrimary,
                      marginBottom: 4,
                    }}
                  >
                    {category}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textTertiary,
                    }}
                  >
                    Monthly limit
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.backgroundDark,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: colors.textSecondary,
                      marginRight: 4,
                    }}
                  >
                    ₹
                  </Text>
                  <TextInput
                    value={localBudgets[category] || ""}
                    onChangeText={(val) => handleBudgetChange(category, val)}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    style={{
                      fontSize: 16,
                      color: colors.textPrimary,
                      paddingVertical: 8,
                      minWidth: 80,
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            marginTop: 24,
          }}
          onPress={handleSave}
          disabled={loading}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            {loading ? "Saving..." : "Save Budgets"}
          </Text>
        </TouchableOpacity>

        {/* Info Card */}
        <View
          style={{
            backgroundColor: `${colors.primary}15`,
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
            flexDirection: "row",
          }}
        >
          <Ionicons
            name="information-circle"
            size={20}
            color={colors.primary}
            style={{ marginRight: 12, marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
          >
            Budgets are tracked monthly and reset at the start of each month.
            You'll receive alerts when you're close to or over budget.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
