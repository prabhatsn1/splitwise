import React, { useMemo } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { WeeklySpendingData } from "../types";
import { ThemeColors } from "../context/ThemeContext";

const { width: screenWidth } = Dimensions.get("window");

interface WeeklySpendingChartProps {
  data?: WeeklySpendingData[];
  colors: ThemeColors;
}

export const WeeklySpendingChart: React.FC<WeeklySpendingChartProps> = ({
  data = [],
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Weekly Spending</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No weekly data available</Text>
        </View>
      </View>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const chartHeight = 180;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Spending (Last 8 Weeks)</Text>
      <View style={[styles.chart, { height: chartHeight }]}>
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>₹{maxAmount.toFixed(0)}</Text>
          <Text style={styles.axisLabel}>₹{(maxAmount / 2).toFixed(0)}</Text>
          <Text style={styles.axisLabel}>₹0</Text>
        </View>
        <View style={styles.chartArea}>
          {data.map((item, index) => {
            const barHeight =
              maxAmount > 0
                ? (item.amount / maxAmount) * (chartHeight - 40)
                : 0;
            const isCurrentWeek = index === data.length - 1;
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barArea}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isCurrentWeek
                          ? colors.warning
                          : item.amount > 0
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.week}</Text>
                <Text style={styles.barAmount}>₹{item.amount.toFixed(0)}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.dateRange}>
        <Text style={styles.dateText}>
          {data[0]?.startDate} - {data[data.length - 1]?.endDate}
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
    chart: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    yAxis: {
      width: 55,
      height: "100%",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingRight: 8,
    },
    axisLabel: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    chartArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    barContainer: {
      flex: 1,
      alignItems: "center",
      marginHorizontal: 1,
    },
    barArea: {
      flex: 1,
      justifyContent: "flex-end",
      width: "100%",
      minHeight: 140,
    },
    bar: {
      width: "100%",
      minHeight: 2,
      borderRadius: 4,
    },
    barLabel: {
      fontSize: 9,
      color: colors.textTertiary,
      marginTop: 4,
      textAlign: "center",
    },
    barAmount: {
      fontSize: 9,
      color: colors.textSecondary,
      fontWeight: "600",
      textAlign: "center",
    },
    dateRange: {
      alignItems: "center",
      marginTop: 8,
    },
    dateText: {
      fontSize: 11,
      color: colors.textTertiary,
    },
  });
