import React, { useMemo } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { ThemeColors } from "../context/ThemeContext";

interface CategoryPieChartProps {
  data?: { category: string; amount: number; percentage: number }[];
  colors: ThemeColors;
}

const COLORS = [
  "#5bc5a7",
  "#4CAF50",
  "#2196F3",
  "#FF9800",
  "#9C27B0",
  "#F44336",
  "#795548",
  "#607D8B",
];

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data = [],
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Category Breakdown</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No category data available</Text>
        </View>
      </View>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Category Breakdown</Text>
      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const percentage = item.percentage;
            const color = COLORS[index % COLORS.length];

            return (
              <View key={item.category} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[styles.colorIndicator, { backgroundColor: color }]}
                  />
                  <Text style={styles.categoryName}>{item.category}</Text>
                </View>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.categoryBar,
                      {
                        width: `${percentage}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
                <View style={styles.valueContainer}>
                  <Text style={styles.categoryAmount}>
                    ₹{item.amount.toFixed(0)}
                  </Text>
                  <Text style={styles.categoryPercentage}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {totalAmount > 0 && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Spending:</Text>
            <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        )}
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
    chartContainer: {
      flex: 1,
    },
    barsContainer: {
      marginBottom: 16,
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      paddingVertical: 4,
    },
    categoryInfo: {
      flexDirection: "row",
      alignItems: "center",
      width: 100,
    },
    colorIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    categoryName: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: "500",
      flex: 1,
    },
    barContainer: {
      flex: 1,
      height: 20,
      backgroundColor: colors.borderLight,
      borderRadius: 10,
      marginHorizontal: 8,
      overflow: "hidden",
    },
    categoryBar: {
      height: "100%",
      borderRadius: 10,
      minWidth: 4,
    },
    valueContainer: {
      width: 80,
      alignItems: "flex-end",
    },
    categoryAmount: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    categoryPercentage: {
      fontSize: 10,
      color: colors.textTertiary,
    },
    totalContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    totalLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    totalAmount: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: "bold",
    },
  });
