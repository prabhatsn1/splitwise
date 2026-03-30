import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BudgetComparisonData } from "../types";
import { ThemeColors } from "../context/ThemeContext";

interface BudgetComparisonChartProps {
  data?: BudgetComparisonData[];
  colors: ThemeColors;
}

export const BudgetComparisonChart: React.FC<BudgetComparisonChartProps> = ({
  data = [],
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Budget vs Actual</Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="pie-chart-outline"
            size={40}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyText}>
            Set budgets per category in Settings to see comparisons
          </Text>
        </View>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.budget, d.actual)),
    1,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget vs Actual (This Month)</Text>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.primary }]}
          />
          <Text style={styles.legendLabel}>Budget</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.warning }]}
          />
          <Text style={styles.legendLabel}>Actual</Text>
        </View>
      </View>

      {data.map((item, index) => {
        const budgetPercent = (item.budget / maxValue) * 100;
        const actualPercent = (item.actual / maxValue) * 100;
        const overBudget = item.actual > item.budget;
        const percentage =
          item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : 0;

        return (
          <View key={index} style={styles.categoryRow}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{item.category}</Text>
              <Text
                style={[
                  styles.percentageText,
                  { color: overBudget ? colors.error : colors.success },
                ]}
              >
                {percentage}%
              </Text>
            </View>
            {/* Budget bar */}
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${budgetPercent}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            {/* Actual bar */}
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${actualPercent}%`,
                    backgroundColor: overBudget ? colors.error : colors.warning,
                  },
                ]}
              />
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>
                ₹{item.actual.toFixed(0)} / ₹{item.budget.toFixed(0)}
              </Text>
              {overBudget && (
                <View style={styles.overBadge}>
                  <Ionicons name="warning" size={10} color={colors.error} />
                  <Text style={[styles.overBadgeText, { color: colors.error }]}>
                    Over
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Budget</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            ₹{data.reduce((s, d) => s + d.budget, 0).toFixed(0)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            ₹{data.reduce((s, d) => s + d.actual, 0).toFixed(0)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Remaining</Text>
          {(() => {
            const remaining =
              data.reduce((s, d) => s + d.budget, 0) -
              data.reduce((s, d) => s + d.actual, 0);
            return (
              <Text
                style={[
                  styles.summaryValue,
                  { color: remaining >= 0 ? colors.success : colors.error },
                ]}
              >
                ₹{Math.abs(remaining).toFixed(0)}
              </Text>
            );
          })()}
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 12,
    },
    emptyState: {
      alignItems: "center",
      padding: 24,
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: "center",
    },
    legend: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 16,
      gap: 20,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 6,
    },
    legendLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    categoryRow: {
      marginBottom: 14,
    },
    categoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    categoryName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    percentageText: {
      fontSize: 13,
      fontWeight: "700",
    },
    barTrack: {
      height: 8,
      backgroundColor: colors.borderLight,
      borderRadius: 4,
      marginBottom: 3,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 4,
      minWidth: 2,
    },
    amountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 2,
    },
    amountLabel: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    overBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${colors.error}12`,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 3,
    },
    overBadgeText: {
      fontSize: 10,
      fontWeight: "600",
    },
    summary: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
      marginTop: 4,
    },
    summaryItem: {
      alignItems: "center",
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      marginBottom: 2,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "bold",
    },
  });
