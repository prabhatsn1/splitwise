import React, { useState, useEffect, useMemo } from "react";
import { ScrollView, View, Text } from "react-native";
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Calculating insights...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Analytics Available</Text>
        <Text style={styles.emptySubtext}>
          Add some expenses to see your spending insights
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="receipt-outline" size={24} color="#5bc5a7" />
          <Text style={styles.summaryValue}>
            ₹{analytics.averageExpenseAmount.toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Average Expense</Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons name="star-outline" size={24} color="#FF9800" />
          <Text style={styles.summaryValue}>
            ₹{analytics.mostExpensiveExpense.amount.toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Highest Expense</Text>
        </View>
      </View>

      {/* Charts */}
      <MonthlySpendingChart data={analytics.monthlySpending} colors={colors} />
      <WeeklySpendingChart data={weeklyData} colors={colors} />
      <YearOverYearChart data={yoyData} colors={colors} />
      <CategoryPieChart data={analytics.categoryBreakdown} colors={colors} />
      <BudgetComparisonChart data={budgetData} colors={colors} />
      <ExpenseFrequencyChart data={frequencyData} colors={colors} />
      <SpendingTrendsCard trends={analytics.spendingTrends} colors={colors} />

      {/* Friend Spending Ranking */}
      {analytics.friendSpendingRanking.length > 0 && (
        <View style={styles.rankingContainer}>
          <Text style={styles.rankingTitle}>Spending with Friends</Text>
          {analytics.friendSpendingRanking.slice(0, 5).map((item, index) => (
            <View key={item.friend.id} style={styles.rankingItem}>
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
      )}

      {/* Most Expensive Expense Details */}
      {analytics.mostExpensiveExpense.id !== "default" && (
        <View style={styles.expenseContainer}>
          <Text style={styles.expenseTitle}>Most Expensive Expense</Text>
          <View style={styles.expenseCard}>
            <View style={styles.expenseHeader}>
              <View style={styles.expenseIcon}>
                <Ionicons name="receipt" size={20} color="#5bc5a7" />
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
      )}
    </ScrollView>
  );
}
