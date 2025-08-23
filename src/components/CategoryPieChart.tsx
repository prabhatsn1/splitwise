import React from "react";
import { View, Text, Dimensions } from "react-native";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
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
    paddingVertical: 8,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    width: 100,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: "#f5f5f5",
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
    color: "#333",
    fontWeight: "600",
  },
  categoryPercentage: {
    fontSize: 10,
    color: "#666",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  totalLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 16,
    color: "#5bc5a7",
    fontWeight: "bold",
  },
});

interface CategoryPieChartProps {
  data?: { category: string; amount: number; percentage: number }[];
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
}) => {
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
        {/* Simple horizontal bar representation instead of pie chart */}
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
