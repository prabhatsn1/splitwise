import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  adviceContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#5bc5a7",
  },
  adviceLabel: {
    fontSize: 12,
    color: "#5bc5a7",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  advice: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
});

interface SpendingTrendsCardProps {
  trends?: "increasing" | "decreasing" | "stable";
}

export const SpendingTrendsCard: React.FC<SpendingTrendsCardProps> = ({
  trends = "stable",
}) => {
  const getTrendInfo = () => {
    switch (trends) {
      case "increasing":
        return {
          icon: "trending-up" as const,
          color: "#F44336",
          title: "Spending Increasing",
          description:
            "Your spending has been trending upward over the last 3 months.",
          advice:
            "Consider reviewing your expenses and setting a budget to control spending.",
        };
      case "decreasing":
        return {
          icon: "trending-down" as const,
          color: "#4CAF50",
          title: "Spending Decreasing",
          description:
            "Great job! Your spending has been decreasing over the last 3 months.",
          advice: "Keep up the good work with your expense management.",
        };
      default:
        return {
          icon: "remove" as const,
          color: "#FF9800",
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
            { backgroundColor: `${trendInfo.color}20` },
          ]}
        >
          <Ionicons name={trendInfo.icon} size={24} color={trendInfo.color} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{trendInfo.title}</Text>
          <Text style={styles.description}>{trendInfo.description}</Text>
        </View>
      </View>

      <View style={styles.adviceContainer}>
        <Text style={styles.adviceLabel}>Insight:</Text>
        <Text style={styles.advice}>{trendInfo.advice}</Text>
      </View>
    </View>
  );
};
