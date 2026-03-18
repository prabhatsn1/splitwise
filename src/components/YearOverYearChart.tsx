import React from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { YearOverYearData } from "../types";

const { width: screenWidth } = Dimensions.get("window");
const chartWidth = screenWidth - 32;

interface YearOverYearChartProps {
  data?: YearOverYearData[];
  currentYearLabel?: string;
  previousYearLabel?: string;
}

export const YearOverYearChart: React.FC<YearOverYearChartProps> = ({
  data = [],
  currentYearLabel,
  previousYearLabel,
}) => {
  const now = new Date();
  const cyLabel = currentYearLabel ?? `${now.getFullYear()}`;
  const pyLabel = previousYearLabel ?? `${now.getFullYear() - 1}`;

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Year-over-Year Comparison</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No spending data available</Text>
        </View>
      </View>
    );
  }

  const maxAmount = Math.max(
    ...data.map((d) => Math.max(d.currentYear, d.previousYear)),
  );
  const chartHeight = 220;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Year-over-Year Comparison</Text>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#5bc5a7" }]} />
          <Text style={styles.legendLabel}>{cyLabel}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#b0b0b0" }]} />
          <Text style={styles.legendLabel}>{pyLabel}</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>₹{maxAmount.toFixed(0)}</Text>
          <Text style={styles.axisLabel}>₹{(maxAmount / 2).toFixed(0)}</Text>
          <Text style={styles.axisLabel}>₹0</Text>
        </View>
        <View style={styles.chartArea}>
          {data.map((item, index) => {
            const cyHeight =
              maxAmount > 0
                ? (item.currentYear / maxAmount) * (chartHeight - 50)
                : 0;
            const pyHeight =
              maxAmount > 0
                ? (item.previousYear / maxAmount) * (chartHeight - 50)
                : 0;
            return (
              <View key={index} style={styles.barGroup}>
                <View style={styles.barPair}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: pyHeight,
                        backgroundColor:
                          item.previousYear > 0 ? "#b0b0b0" : "#e8e8e8",
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: cyHeight,
                        backgroundColor:
                          item.currentYear > 0 ? "#5bc5a7" : "#e0e0e0",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.month}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{cyLabel} Total</Text>
          <Text style={[styles.summaryValue, { color: "#5bc5a7" }]}>
            ₹{data.reduce((s, d) => s + d.currentYear, 0).toFixed(0)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{pyLabel} Total</Text>
          <Text style={[styles.summaryValue, { color: "#888" }]}>
            ₹{data.reduce((s, d) => s + d.previousYear, 0).toFixed(0)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Change</Text>
          {(() => {
            const cyTotal = data.reduce((s, d) => s + d.currentYear, 0);
            const pyTotal = data.reduce((s, d) => s + d.previousYear, 0);
            const change =
              pyTotal > 0
                ? (((cyTotal - pyTotal) / pyTotal) * 100).toFixed(1)
                : "—";
            const isUp =
              typeof change === "string" && change !== "—"
                ? parseFloat(change) > 0
                : false;
            return (
              <Text
                style={[
                  styles.summaryValue,
                  { color: isUp ? "#F44336" : "#4CAF50" },
                ]}
              >
                {change === "—" ? "—" : `${isUp ? "+" : ""}${change}%`}
              </Text>
            );
          })()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
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
    color: "#666",
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
    width: 55,
    height: "100%",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 6,
  },
  axisLabel: {
    fontSize: 11,
    color: "#666",
  },
  chartArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  barGroup: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 1,
  },
  barPair: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
    minHeight: 140,
  },
  bar: {
    width: 8,
    minHeight: 2,
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 9,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "bold",
  },
});
