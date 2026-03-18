import React, { useMemo } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useApp } from "../context/AppContext";
import { RootStackParamList, GroupAnalytics, SimplifiedDebt } from "../types";
import { AnalyticsService } from "../services/analyticsService";
import { MonthlySpendingChart } from "../components/MonthlySpendingChart";
import { CategoryPieChart } from "../components/CategoryPieChart";
import { DebtSimplificationView } from "../components/DebtSimplificationView";

type GroupAnalyticsRouteProp = RouteProp<RootStackParamList, "GroupAnalytics">;

const COLORS = [
  "#5bc5a7",
  "#2196F3",
  "#FF9800",
  "#9C27B0",
  "#F44336",
  "#4CAF50",
  "#795548",
  "#607D8B",
];

export default function GroupAnalyticsScreen() {
  const route = useRoute<GroupAnalyticsRouteProp>();
  const { state } = useApp();
  const { groupId } = route.params;

  const group = state.groups.find((g) => g.id === groupId);

  const analytics: GroupAnalytics | null = useMemo(() => {
    if (!group) return null;
    return AnalyticsService.calculateGroupAnalytics(
      state.expenses,
      groupId,
      group.members,
    );
  }, [state.expenses, groupId, group]);

  const simplifiedDebts: SimplifiedDebt[] = useMemo(() => {
    if (!group) return [];
    return AnalyticsService.simplifyDebts(
      state.expenses,
      groupId,
      group.members,
    );
  }, [state.expenses, groupId, group]);

  if (!group) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Group Not Found</Text>
      </View>
    );
  }

  if (!analytics || analytics.expenseCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Analytics Yet</Text>
        <Text style={styles.emptySubtext}>
          Add expenses to this group to see analytics
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupSubtitle}>Group Analytics</Text>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="receipt-outline" size={22} color="#5bc5a7" />
          <Text style={styles.summaryValue}>{analytics.expenseCount}</Text>
          <Text style={styles.summaryLabel}>Expenses</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="cash-outline" size={22} color="#FF9800" />
          <Text style={styles.summaryValue}>
            ₹{analytics.totalSpend.toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Total Spend</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="stats-chart-outline" size={22} color="#2196F3" />
          <Text style={styles.summaryValue}>
            ₹{analytics.averageExpense.toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Average</Text>
        </View>
      </View>

      {/* Monthly spending */}
      <MonthlySpendingChart data={analytics.monthlySpending} />

      {/* Category breakdown */}
      <CategoryPieChart data={analytics.categoryBreakdown} />

      {/* Member spending breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Member Spending</Text>
        {analytics.memberSpending.map((item, index) => {
          const color = COLORS[index % COLORS.length];
          const isPositive = item.netBalance >= 0;
          return (
            <View key={item.member.id} style={styles.memberRow}>
              <View style={[styles.memberAvatar, { borderColor: color }]}>
                <Text style={[styles.memberAvatarText, { color }]}>
                  {item.member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {item.member.id === state.currentUser?.id
                    ? `${item.member.name} (You)`
                    : item.member.name}
                </Text>
                <Text style={styles.memberMeta}>
                  Paid ₹{item.totalPaid.toFixed(0)} · Share ₹
                  {item.totalShare.toFixed(0)}
                </Text>
              </View>
              <View style={styles.memberBalance}>
                <Text
                  style={[
                    styles.memberBalanceAmount,
                    { color: isPositive ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {isPositive ? "+" : "-"}₹
                  {Math.abs(item.netBalance).toFixed(0)}
                </Text>
                <Text style={styles.memberBalanceLabel}>
                  {isPositive ? "gets back" : "owes"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Debt simplification */}
      <DebtSimplificationView
        debts={simplifiedDebts}
        currentUserId={state.currentUser?.id}
      />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 22,
    color: "#333",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 15,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
  header: {
    backgroundColor: "#5bc5a7",
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  groupName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  groupSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  sectionCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  memberMeta: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  memberBalance: {
    alignItems: "flex-end",
  },
  memberBalanceAmount: {
    fontSize: 15,
    fontWeight: "bold",
  },
  memberBalanceLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 1,
  },
});
