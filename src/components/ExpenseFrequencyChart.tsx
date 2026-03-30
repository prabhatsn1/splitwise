import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ExpenseFrequencyData } from "../types";
import { ThemeColors } from "../context/ThemeContext";

interface ExpenseFrequencyChartProps {
  data?: ExpenseFrequencyData[];
  colors: ThemeColors;
}

export const ExpenseFrequencyChart: React.FC<ExpenseFrequencyChartProps> = ({
  data = [],
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Spending by Day of Week</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No frequency data available</Text>
        </View>
      </View>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const maxAmount = Math.max(...data.map((d) => d.totalAmount), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending by Day of Week</Text>
      <View style={styles.chartArea}>
        {data.map((item, index) => {
          const barWidthPercent =
            maxAmount > 0 ? (item.totalAmount / maxAmount) * 100 : 0;
          const isHighest = item.totalAmount === maxAmount && maxAmount > 0;
          return (
            <View key={index} style={styles.row}>
              <Text
                style={[
                  styles.dayLabel,
                  isHighest && {
                    color: colors.warning,
                    fontWeight: "700" as const,
                  },
                ]}
              >
                {item.day}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidthPercent}%`,
                      backgroundColor: isHighest
                        ? colors.warning
                        : colors.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.valueContainer}>
                <Text style={styles.countText}>{item.count}x</Text>
                <Text style={styles.amountText}>
                  ₹{item.totalAmount.toFixed(0)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.insight}>
        <Text style={styles.insightText}>
          {(() => {
            const busiestDay = data.reduce((max, d) =>
              d.count > max.count ? d : max,
            );
            const mostExpensiveDay = data.reduce((max, d) =>
              d.totalAmount > max.totalAmount ? d : max,
            );
            if (busiestDay.count === 0) return "Add expenses to see patterns";
            return `Busiest: ${busiestDay.day} (${busiestDay.count} expenses) · Most spent: ${mostExpensiveDay.day}`;
          })()}
        </Text>
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
      marginBottom: 16,
    },
    emptyState: {
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: "center",
    },
    chartArea: {
      gap: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    dayLabel: {
      width: 32,
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    barTrack: {
      flex: 1,
      height: 20,
      backgroundColor: colors.borderLight,
      borderRadius: 10,
      marginHorizontal: 8,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 10,
      minWidth: 4,
    },
    valueContainer: {
      width: 70,
      alignItems: "flex-end",
    },
    countText: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    amountText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    insight: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
      alignItems: "center",
    },
    insightText: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: "center",
    },
  });
