import React, { useMemo } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { YearOverYearData } from "../types";
import { ThemeColors } from "../context/ThemeContext";

const { width: screenWidth } = Dimensions.get("window");
const chartWidth = screenWidth - 32;

interface YearOverYearChartProps {
  data?: YearOverYearData[];
  colors: ThemeColors;
  currentYearLabel?: string;
  previousYearLabel?: string;
}

export const YearOverYearChart: React.FC<YearOverYearChartProps> = ({
  data = [],
  colors,
  currentYearLabel,
  previousYearLabel,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          <View
            style={[styles.legendDot, { backgroundColor: colors.primary }]}
          />
          <Text style={styles.legendLabel}>{cyLabel}</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.textTertiary }]}
          />
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
                          item.previousYear > 0
                            ? colors.textTertiary
                            : colors.border,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: cyHeight,
                        backgroundColor:
                          item.currentYear > 0 ? colors.primary : colors.border,
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
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            ₹{data.reduce((s, d) => s + d.currentYear, 0).toFixed(0)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{pyLabel} Total</Text>
          <Text style={[styles.summaryValue, { color: colors.textTertiary }]}>
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
                  { color: isUp ? colors.error : colors.success },
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
      color: colors.textSecondary,
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
      paddingRight: 6,
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
      color: colors.textTertiary,
      marginTop: 4,
      textAlign: "center",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
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
      fontSize: 15,
      fontWeight: "bold",
    },
  });
