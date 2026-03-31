import React, { useMemo } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
    1,
  );
  const chartHeight = 240;
  
  const cyTotal = data.reduce((s, d) => s + d.currentYear, 0);
  const pyTotal = data.reduce((s, d) => s + d.previousYear, 0);
  const changePercent = pyTotal > 0 ? ((cyTotal - pyTotal) / pyTotal) * 100 : 0;
  const isIncrease = changePercent > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="trending-up" size={20} color={colors.primary} />
          <Text style={styles.title}>Year-over-Year</Text>
        </View>
        <View style={[styles.changeBadge, { backgroundColor: isIncrease ? colors.errorLight : colors.successLight }]}>
          <Ionicons 
            name={isIncrease ? "arrow-up" : "arrow-down"} 
            size={14} 
            color={isIncrease ? colors.error : colors.success} 
          />
          <Text style={[styles.changeText, { color: isIncrease ? colors.error : colors.success }]}>
            {Math.abs(changePercent).toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark || colors.primary]}
            style={styles.legendDot}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.legendLabel}>{cyLabel}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textTertiary, opacity: 0.6 }]} />
          <Text style={styles.legendLabel}>{pyLabel}</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>₹{(maxAmount / 1000).toFixed(0)}k</Text>
          <Text style={styles.axisLabel}>₹{(maxAmount / 2000).toFixed(0)}k</Text>
          <Text style={styles.axisLabel}>₹0</Text>
        </View>
        <View style={styles.chartArea}>
          {/* Grid lines */}
          <View style={styles.gridLines}>
            <View style={[styles.gridLine, { borderColor: colors.borderLight }]} />
            <View style={[styles.gridLine, { borderColor: colors.borderLight }]} />
            <View style={[styles.gridLine, { borderColor: colors.borderLight }]} />
          </View>
          
          <View style={styles.barsContainer}>
            {data.map((item, index) => {
              const cyHeight = (item.currentYear / maxAmount) * (chartHeight - 60);
              const pyHeight = (item.previousYear / maxAmount) * (chartHeight - 60);
              const isHighlighted = item.currentYear > item.previousYear;
              
              return (
                <View key={index} style={styles.barGroup}>
                  <View style={styles.barPair}>
                    {/* Previous Year Bar */}
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          styles.previousYearBar,
                          {
                            height: Math.max(pyHeight, 3),
                            backgroundColor: colors.textTertiary,
                            opacity: 0.4,
                          },
                        ]}
                      />
                      {item.previousYear > 0 && pyHeight > 20 && (
                        <Text style={styles.barValue}>₹{(item.previousYear / 1000).toFixed(1)}k</Text>
                      )}
                    </View>
                    
                    {/* Current Year Bar */}
                    <View style={styles.barWrapper}>
                      <LinearGradient
                        colors={[
                          isHighlighted ? colors.primary : colors.primary,
                          isHighlighted ? colors.primaryDark || colors.primary : colors.primary,
                        ]}
                        style={[
                          styles.bar,
                          styles.currentYearBar,
                          { height: Math.max(cyHeight, 3) },
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                      {item.currentYear > 0 && cyHeight > 20 && (
                        <Text style={[styles.barValue, { color: colors.primary, fontWeight: '700' }]}>₹{(item.currentYear / 1000).toFixed(1)}k</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.barLabel}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.summaryLabel}>{cyLabel}</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            ₹{(cyTotal / 1000).toFixed(1)}k
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={styles.summaryLabel}>{pyLabel}</Text>
          <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>
            ₹{(pyTotal / 1000).toFixed(1)}k
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: isIncrease ? colors.errorLight : colors.successLight }]}>
          <Text style={styles.summaryLabel}>Difference</Text>
          <Text style={[styles.summaryValue, { color: isIncrease ? colors.error : colors.success }]}>
            {isIncrease ? '+' : ''}₹{((cyTotal - pyTotal) / 1000).toFixed(1)}k
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    changeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    changeText: {
      fontSize: 13,
      fontWeight: '700',
    },
    legend: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 16,
      gap: 24,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    legendLabel: {
      fontSize: 13,
      fontWeight: '600',
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
      marginBottom: 16,
    },
    yAxis: {
      width: 45,
      height: "100%",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingRight: 8,
    },
    axisLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    chartArea: {
      flex: 1,
      position: 'relative',
    },
    gridLines: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '100%',
      justifyContent: 'space-between',
      paddingBottom: 40,
    },
    gridLine: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderStyle: 'dashed',
    },
    barsContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    barGroup: {
      flex: 1,
      alignItems: "center",
      marginHorizontal: 2,
    },
    barPair: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 3,
      minHeight: 160,
    },
    barWrapper: {
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    bar: {
      width: 10,
      borderRadius: 5,
      minHeight: 3,
    },
    previousYearBar: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    currentYearBar: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 3,
    },
    barValue: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.textTertiary,
      marginTop: 4,
      position: 'absolute',
      top: -16,
    },
    barLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textTertiary,
      marginTop: 6,
      textAlign: "center",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    summaryCard: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: "800",
    },
  });
