import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../context/ThemeContext";

interface SpendingTrendsCardProps {
  trends?: "increasing" | "decreasing" | "stable";
  colors: ThemeColors;
}

export const SpendingTrendsCard: React.FC<SpendingTrendsCardProps> = ({
  trends = "stable",
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getTrendInfo = () => {
    switch (trends) {
      case "increasing":
        return {
          icon: "trending-up" as const,
          color: colors.error,
          title: "Spending Increasing",
          description:
            "Your spending has been trending upward over the last 3 months.",
          advice:
            "Consider reviewing your expenses and setting a budget to control spending.",
        };
      case "decreasing":
        return {
          icon: "trending-down" as const,
          color: colors.success,
          title: "Spending Decreasing",
          description:
            "Great job! Your spending has been decreasing over the last 3 months.",
          advice: "Keep up the good work with your expense management.",
        };
      default:
        return {
          icon: "remove" as const,
          color: colors.warning,
          title: "Spending Stable",
          description:
            "Your spending has remained relatively stable over the last 3 months.",
          advice:
            "Your spending pattern is consistent. Consider optimizing categories with high spending.",
        };
    }
  };

  const trendInfo = getTrendInfo();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${trendInfo.color}18` },
          ]}
        >
          <Ionicons name={trendInfo.icon} size={24} color={trendInfo.color} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{trendInfo.title}</Text>
          <Text style={styles.description}>{trendInfo.description}</Text>
        </View>
      </View>

      <View
        style={[styles.adviceContainer, { borderLeftColor: trendInfo.color }]}
      >
        <Text style={[styles.adviceLabel, { color: trendInfo.color }]}>
          Insight:
        </Text>
        <Text style={styles.advice}>{trendInfo.advice}</Text>
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
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: "700",
      marginBottom: 4,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    adviceContainer: {
      backgroundColor: colors.backgroundDark,
      borderRadius: 10,
      padding: 12,
      borderLeftWidth: 3,
    },
    adviceLabel: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    advice: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 19,
    },
  });
