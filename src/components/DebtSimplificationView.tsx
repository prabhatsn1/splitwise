import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SimplifiedDebt } from "../types";

interface DebtSimplificationViewProps {
  debts: SimplifiedDebt[];
  currentUserId?: string;
}

const ARROW_COLORS = [
  "#5bc5a7",
  "#2196F3",
  "#FF9800",
  "#9C27B0",
  "#F44336",
  "#4CAF50",
  "#795548",
  "#607D8B",
];

export const DebtSimplificationView: React.FC<DebtSimplificationViewProps> = ({
  debts,
  currentUserId,
}) => {
  if (!debts || debts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Simplified Debts</Text>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#5bc5a7" />
          <Text style={styles.settledText}>All settled up!</Text>
          <Text style={styles.emptySubtext}>
            There are no outstanding debts in this group.
          </Text>
        </View>
      </View>
    );
  }

  const totalPayments = debts.length;
  const totalAmount = debts.reduce((s, d) => s + d.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simplified Debts</Text>
      <Text style={styles.subtitle}>
        {totalPayments} optimized payment{totalPayments !== 1 ? "s" : ""} to
        settle all debts
      </Text>

      {/* Visual flow */}
      {debts.map((debt, index) => {
        const color = ARROW_COLORS[index % ARROW_COLORS.length];
        const isCurrentUserFrom = debt.from.id === currentUserId;
        const isCurrentUserTo = debt.to.id === currentUserId;

        return (
          <View
            key={index}
            style={[
              styles.debtRow,
              isCurrentUserFrom && styles.debtRowHighlightOwe,
              isCurrentUserTo && styles.debtRowHighlightOwed,
            ]}
          >
            {/* From user */}
            <View style={styles.userNode}>
              <View style={[styles.avatar, { borderColor: color }]}>
                <Text style={[styles.avatarText, { color }]}>
                  {debt.from.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text
                style={styles.userName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isCurrentUserFrom ? "You" : debt.from.name}
              </Text>
            </View>

            {/* Arrow with amount */}
            <View style={styles.arrowContainer}>
              <View style={[styles.arrowLine, { backgroundColor: color }]} />
              <View style={[styles.amountBadge, { backgroundColor: color }]}>
                <Text style={styles.amountText}>₹{debt.amount.toFixed(0)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={color} />
            </View>

            {/* To user */}
            <View style={styles.userNode}>
              <View style={[styles.avatar, { borderColor: color }]}>
                <Text style={[styles.avatarText, { color }]}>
                  {debt.to.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text
                style={styles.userName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isCurrentUserTo ? "You" : debt.to.name}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Total summary */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total to settle</Text>
        <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
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
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
  },
  settledText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5bc5a7",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
    textAlign: "center",
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 4,
  },
  debtRowHighlightOwe: {
    backgroundColor: "#FFF3F0",
  },
  debtRowHighlightOwed: {
    backgroundColor: "#F0FAF7",
  },
  userNode: {
    flex: 1,
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  userName: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
    maxWidth: 80,
    textAlign: "center",
  },
  arrowContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  arrowLine: {
    height: 2,
    flex: 1,
    borderRadius: 1,
  },
  amountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  amountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  totalLabel: {
    fontSize: 15,
    color: "#555",
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 17,
    color: "#5bc5a7",
    fontWeight: "bold",
  },
});
