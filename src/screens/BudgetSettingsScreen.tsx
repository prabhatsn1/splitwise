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
import AsyncStorage from "@react-native-async-storage/async-storage";

const CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Shopping",
  "Travel",
  "Other",
];

const STORAGE_KEY = "@splitwise_budgets";

export default function BudgetSettingsScreen() {
  const { colors } = useTheme();
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBudgets(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load budgets:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
      Alert.alert("Success", "Monthly budgets saved successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to save budgets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetChange = (category: string, value: string) => {
    setBudgets((prev) => ({ ...prev, [category]: value }));
  };

  const totalBudget = Object.values(budgets).reduce(
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
                    value={budgets[category] || ""}
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
