import React, { useState, useEffect, useMemo } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import {
  ExpenseAnalytics,
  YearOverYearData,
  WeeklySpendingData,
  ExpenseFrequencyData,
  BudgetComparisonData,
} from "../types";
import { AnalyticsService } from "../services/analyticsService";
import { MonthlySpendingChart } from "../components/MonthlySpendingChart";
import { CategoryPieChart } from "../components/CategoryPieChart";
import { SpendingTrendsCard } from "../components/SpendingTrendsCard";
import { YearOverYearChart } from "../components/YearOverYearChart";
import { WeeklySpendingChart } from "../components/WeeklySpendingChart";
import { ExpenseFrequencyChart } from "../components/ExpenseFrequencyChart";
import { BudgetComparisonChart } from "../components/BudgetComparisonChart";
import { createStyles } from "../styles/screens/AnalyticsScreen.styles";

export default function AnalyticsScreen() {
  const { state } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | undefined>();
  const [yoyData, setYoyData] = useState<YearOverYearData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklySpendingData[]>([]);
  const [frequencyData, setFrequencyData] = useState<ExpenseFrequencyData[]>(
    [],
  );
  const [budgetData, setBudgetData] = useState<BudgetComparisonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateAnalytics();
  }, [state.expenses, state.friends, state.currentUser]);

  const calculateAnalytics = () => {
    if (!state.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const analyticsData = AnalyticsService.calculateAnalytics(
        state.expenses,
        state.friends,
        state.currentUser.id,
      );
      setAnalytics(analyticsData);

      const yearOverYear = AnalyticsService.calculateYearOverYear(
        state.expenses,
        state.currentUser.id,
      );
      setYoyData(yearOverYear);

      const weekly = AnalyticsService.calculateWeeklySpending(
        state.expenses,
        state.currentUser.id,
      );
      setWeeklyData(weekly);

      const frequency = AnalyticsService.calculateExpenseFrequency(
        state.expenses,
        state.currentUser.id,
      );
      setFrequencyData(frequency);

      // Default budgets per category — in a full app these would come from Settings
      const defaultBudgets: Record<string, number> = {
        Food: 5000,
        Transport: 2000,
        Entertainment: 3000,
        Bills: 5000,
        Shopping: 4000,
        Travel: 5000,
        Other: 2000,
      };
      const budget = AnalyticsService.calculateBudgetComparison(
        state.expenses,
        state.currentUser.id,
        defaultBudgets,
      );
      setBudgetData(budget);
    } catch (error) {
      console.error("Failed to calculate analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalThisMonth = useMemo(() => {
    if (!analytics?.monthlySpending?.length) return 0;
    return (
      analytics.monthlySpending[analytics.monthlySpending.length - 1]?.amount ??
      0
    );
  }, [analytics]);

  const expenseCount = state.expenses.length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Calculating insights...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="analytics-outline" size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No Analytics Yet</Text>
        <Text style={styles.emptySubtext}>
          Add some expenses to see your spending insights and trends
        </Text>
      </View>
    );
  }

  const summaryCards: {
    icon: keyof typeof Ionicons.glyphMap;
    value: string;
    label: string;
    tint: string;
  }[] = [
    {
      icon: "wallet-outline",
      value: `₹${totalThisMonth.toFixed(0)}`,
      label: "This Month",
      tint: colors.primary,
    },
    {
      icon: "receipt-outline",
      value: `₹${analytics.averageExpenseAmount.toFixed(0)}`,
      label: "Avg Expense",
      tint: colors.secondary,
    },
    {
      icon: "trending-up-outline",
      value: `₹${analytics.mostExpensiveExpense.amount.toFixed(0)}`,
      label: "Highest",
      tint: colors.warning,
    },
    {
      icon: "layers-outline",
      value: `${expenseCount}`,
      label: "Total Expenses",
      tint: colors.info,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Summary Cards – 2x2 */}
      <View style={{ paddingTop: 16, gap: 10 }}>
        <View style={styles.summaryRow}>
          {summaryCards.slice(0, 2).map((card) => (
            <View key={card.label} style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIconWrapper,
                  { backgroundColor: `${card.tint}18` },
                ]}
              >
                <Ionicons name={card.icon} size={20} color={card.tint} />
              </View>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.summaryRow}>
          {summaryCards.slice(2).map((card) => (
            <View key={card.label} style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIconWrapper,
                  { backgroundColor: `${card.tint}18` },
                ]}
              >
                <Ionicons name={card.icon} size={20} color={card.tint} />
              </View>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Trends */}
      <View style={styles.sectionHeader}>
        <Ionicons name="pulse-outline" size={16} color={colors.textTertiary} />
        <Text style={styles.sectionTitle}>Trends</Text>
      </View>
      <SpendingTrendsCard trends={analytics.spendingTrends} colors={colors} />
      <MonthlySpendingChart data={analytics.monthlySpending} colors={colors} />
      <WeeklySpendingChart data={weeklyData} colors={colors} />

      {/* Breakdown */}
      <View style={styles.sectionHeader}>
        <Ionicons
          name="pie-chart-outline"
          size={16}
          color={colors.textTertiary}
        />
        <Text style={styles.sectionTitle}>Breakdown</Text>
      </View>
      <CategoryPieChart data={analytics.categoryBreakdown} colors={colors} />
      <BudgetComparisonChart data={budgetData} colors={colors} />

      {/* Patterns */}
      <View style={styles.sectionHeader}>
        <Ionicons
          name="calendar-outline"
          size={16}
          color={colors.textTertiary}
        />
        <Text style={styles.sectionTitle}>Patterns</Text>
      </View>
      <YearOverYearChart data={yoyData} colors={colors} />
      <ExpenseFrequencyChart data={frequencyData} colors={colors} />

      {/* Friend Spending Ranking */}
      {analytics.friendSpendingRanking.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="people-outline"
              size={16}
              color={colors.textTertiary}
            />
            <Text style={styles.sectionTitle}>Friends</Text>
          </View>
          <View style={styles.rankingContainer}>
            <Text style={styles.rankingTitle}>Spending with Friends</Text>
            {analytics.friendSpendingRanking.slice(0, 5).map((item, index) => (
              <View
                key={item.friend.id}
                style={[
                  styles.rankingItem,
                  index ===
                    Math.min(4, analytics.friendSpendingRanking.length - 1) &&
                    styles.rankingItemLast,
                ]}
              >
                <View style={styles.rankingLeft}>
                  <View style={styles.rankingBadge}>
                    <Text style={styles.rankingPosition}>#{index + 1}</Text>
                  </View>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>
                      {item.friend.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.friendName}>{item.friend.name}</Text>
                </View>
                <Text style={styles.friendAmount}>
                  ₹{item.totalSpent.toFixed(0)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Most Expensive Expense Details */}
      {analytics.mostExpensiveExpense.id !== "default" && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="flash-outline"
              size={16}
              color={colors.textTertiary}
            />
            <Text style={styles.sectionTitle}>Highlights</Text>
          </View>
          <View style={styles.expenseContainer}>
            <Text style={styles.expenseTitle}>Most Expensive Expense</Text>
            <View style={styles.expenseCard}>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseIcon}>
                  <Ionicons name="receipt" size={20} color={colors.primary} />
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseDescription}>
                    {analytics.mostExpensiveExpense.description}
                  </Text>
                  <Text style={styles.expenseCategory}>
                    {analytics.mostExpensiveExpense.category}
                  </Text>
                  <Text style={styles.expenseDate}>
                    {new Date(
                      analytics.mostExpensiveExpense.date,
                    ).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>
                  ₹{analytics.mostExpensiveExpense.amount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}
