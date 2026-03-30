import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeColors } from "../context/ThemeContext";

interface MonthlySpendingChartProps {
  data?: { month: string; amount: number }[];
  colors: ThemeColors;
}

const CHART_HEIGHT = 180;
const Y_AXIS_WIDTH = 52;
const GRID_LINES = 4; // number of horizontal reference lines

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

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  // Round max up to a nice number for grid labels
  const niceMax =
    maxAmount <= 0 ? 100 : Math.ceil(maxAmount / GRID_LINES) * GRID_LINES;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Spending</Text>

      <View style={styles.chartRow}>
        {/* Y-axis labels */}
        <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
          {Array.from({ length: GRID_LINES + 1 }).map((_, i) => {
            const value = niceMax - (niceMax / GRID_LINES) * i;
            return (
              <Text key={i} style={styles.axisLabel}>
                ₹
                {value >= 1000
                  ? `${(value / 1000).toFixed(1)}k`
                  : value.toFixed(0)}
              </Text>
            );
          })}
        </View>

        {/* Chart area with grid + bars */}
        <View style={styles.chartArea}>
          {/* Grid lines (behind bars) */}
          <View style={[styles.gridContainer, { height: CHART_HEIGHT }]}>
            {Array.from({ length: GRID_LINES + 1 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  i === GRID_LINES && styles.gridLineBottom,
                ]}
              />
            ))}
          </View>

          {/* Bars */}
          <View style={[styles.barsRow, { height: CHART_HEIGHT }]}>
            {data.map((item, index) => {
              const pct = niceMax > 0 ? item.amount / niceMax : 0;
              const barH = Math.max(
                pct * CHART_HEIGHT,
                item.amount > 0 ? 3 : 0,
              );
              const isLast = index === data.length - 1;

              return (
                <View key={index} style={styles.barSlot}>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barH,
                          backgroundColor: isLast
                            ? colors.warning
                            : item.amount > 0
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* X-axis labels + amounts below chart */}
      <View style={styles.xAxisRow}>
        <View style={{ width: Y_AXIS_WIDTH }} />
        <View style={styles.xLabels}>
          {data.map((item, index) => (
            <View key={index} style={styles.xLabelSlot}>
              <Text style={styles.barLabel}>{item.month.substring(0, 3)}</Text>
              <Text style={styles.barAmount}>
                ₹
                {item.amount >= 1000
                  ? `${(item.amount / 1000).toFixed(1)}k`
                  : item.amount.toFixed(0)}
              </Text>
            </View>
          ))}
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
    /* chart row: y-axis + chart area side-by-side */
    chartRow: {
      flexDirection: "row",
    },
    yAxis: {
      width: Y_AXIS_WIDTH,
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingRight: 6,
    },
    axisLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      lineHeight: 14,
    },
    /* chart area is position-relative so grid + bars stack */
    chartArea: {
      flex: 1,
      position: "relative",
    },
    gridContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "space-between",
    },
    gridLine: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
    },
    gridLineBottom: {
      backgroundColor: colors.border,
    },
    barsRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 4,
    },
    barSlot: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 3,
    },
    barWrapper: {
      width: "100%",
      maxWidth: 28,
      alignItems: "center",
    },
    bar: {
      width: "100%",
      borderRadius: 4,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
    },
    /* x-axis row sits below the chart */
    xAxisRow: {
      flexDirection: "row",
      marginTop: 6,
    },
    xLabels: {
      flex: 1,
      flexDirection: "row",
      paddingHorizontal: 4,
    },
    xLabelSlot: {
      flex: 1,
      alignItems: "center",
    },
    barLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      fontWeight: "500",
    },
    barAmount: {
      fontSize: 9,
      color: colors.textSecondary,
      fontWeight: "600",
      marginTop: 1,
    },
  });
