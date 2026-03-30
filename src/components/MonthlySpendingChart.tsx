import React, { useMemo } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { ThemeColors } from "../context/ThemeContext";

interface MonthlySpendingChartProps {
  data?: { month: string; amount: number }[];
  colors: ThemeColors;
}

const { width: screenWidth } = Dimensions.get("window");
const chartWidth = screenWidth - 32;

export const MonthlySpendingChart: React.FC<MonthlySpendingChartProps> = ({
  data = [],
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Monthly Spending</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No spending data available</Text>
        </View>
      </View>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount));
  const chartHeight = 200;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Spending</Text>
      <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
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
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barArea}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor:
                          item.amount > 0 ? colors.primary : colors.border,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.month.split(" ")[0]}</Text>
                <Text style={styles.barAmount}>₹{item.amount.toFixed(0)}</Text>
              </View>
            );
          })}
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
      width: 60,
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
      paddingHorizontal: 8,
    },
    barContainer: {
      flex: 1,
      alignItems: "center",
      marginHorizontal: 2,
    },
    barArea: {
      flex: 1,
      justifyContent: "flex-end",
      width: "100%",
      minHeight: 160,
    },
    bar: {
      width: "100%",
      minHeight: 2,
      borderRadius: 4,
    },
    barLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      marginTop: 4,
      textAlign: "center",
    },
    barAmount: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: "600",
      textAlign: "center",
    },
  });
