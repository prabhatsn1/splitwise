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
    fontSize: 12,
    color: "#666",
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
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  barAmount: {
    fontSize: 10,
    color: "#333",
    fontWeight: "600",
    textAlign: "center",
  },
});

interface MonthlySpendingChartProps {
  data?: { month: string; amount: number }[];
}

const { width: screenWidth } = Dimensions.get("window");
const chartWidth = screenWidth - 32;

export const MonthlySpendingChart: React.FC<MonthlySpendingChartProps> = ({
  data = [],
}) => {
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
                          item.amount > 0 ? "#5bc5a7" : "#e0e0e0",
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
