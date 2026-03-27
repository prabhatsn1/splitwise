import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../types";
import { styles } from "../styles/screens/DashboardScreen.styles";

type DashboardNavigationProp = StackNavigationProp<RootStackParamList>;

const CATEGORY_ICONS: Record<string, string> = {
  Food: "restaurant",
  Transport: "car",
  Entertainment: "game-controller",
  Bills: "flash",
  Shopping: "bag",
  Travel: "airplane",
  Other: "ellipsis-horizontal",
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#FF6B6B",
  Transport: "#4ECDC4",
  Entertainment: "#A78BFA",
  Bills: "#FBBF24",
  Shopping: "#F472B6",
  Travel: "#60A5FA",
  Other: "#94A3B8",
};

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const { state } = useApp();

  const getUserBalanceBreakdown = () => {
    const userBalance = state.balances.find(
      (balance) => balance.userId === state.currentUser?.id,
    );

    if (userBalance) {
      const totalOwed = Object.values(userBalance.owedBy).reduce(
        (sum, v) => sum + v,
        0,
      );
      const totalOwing = Object.values(userBalance.owes).reduce(
        (sum, v) => sum + v,
        0,
      );
      return {
        total: userBalance.totalBalance,
        owed: totalOwed,
        owing: totalOwing,
      };
    }

    let totalOwed = 0;
    let totalOwing = 0;

    state.expenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === state.currentUser?.id,
      );
      if (userSplit) {
        if (expense.paidBy.id === state.currentUser?.id) {
          totalOwed += expense.amount - userSplit.amount!;
        } else {
          totalOwing += userSplit.amount!;
        }
      }
    });

    return {
      total: totalOwed - totalOwing,
      owed: totalOwed,
      owing: totalOwing,
    };
  };

  const { total: balance, owed, owing } = getUserBalanceBreakdown();

  const recentExpenses = [...state.expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleAddExpense = () => {
    navigation.navigate("AddExpense", {});
  };

  const handleSettleUp = () => {
    if (state.friends.length === 0) {
      Alert.alert("No Friends", "Add friends first before settling up.");
      return;
    }
    navigation.navigate("Main" as any);
    const userBalance = state.balances.find(
      (b) => b.userId === state.currentUser?.id,
    );
    if (userBalance) {
      const friendIds = [
        ...Object.keys(userBalance.owes),
        ...Object.keys(userBalance.owedBy),
      ];
      if (friendIds.length === 1) {
        navigation.navigate("SettleUp", { userId: friendIds[0] });
        return;
      }
    }
    Alert.alert(
      "Settle Up",
      "Go to the Friends tab and tap a friend to settle up with them.",
    );
  };

  const firstName = state.currentUser?.name?.split(" ")[0] ?? "";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{firstName || "Friend"}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => navigation.navigate("Account" as any)}
        >
          <Text style={styles.avatarText}>
            {(firstName?.[0] ?? "U").toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceCardInner}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: balance >= 0 ? "#4CAF50" : "#F44336" },
            ]}
          >
            {balance >= 0 ? "+" : "-"}₹{Math.abs(balance).toFixed(2)}
          </Text>
          <Text style={styles.balanceSubtext}>
            {balance >= 0 ? "You are owed overall" : "You owe overall"}
          </Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceBreakdown}>
          <View style={styles.balanceBreakdownItem}>
            <View style={[styles.balanceDot, { backgroundColor: "#4CAF50" }]} />
            <View>
              <Text style={styles.breakdownLabel}>You are owed</Text>
              <Text style={[styles.breakdownAmount, { color: "#4CAF50" }]}>
                ₹{owed.toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceBreakdownItem}>
            <View style={[styles.balanceDot, { backgroundColor: "#F44336" }]} />
            <View>
              <Text style={styles.breakdownLabel}>You owe</Text>
              <Text style={[styles.breakdownAmount, { color: "#F44336" }]}>
                ₹{owing.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddExpense}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: "#E8F8F3" }]}>
            <Ionicons name="add" size={22} color="#5bc5a7" />
          </View>
          <Text style={styles.actionText}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSettleUp}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: "#EDE9FE" }]}>
            <Ionicons name="swap-horizontal" size={22} color="#8B5CF6" />
          </View>
          <Text style={styles.actionText}>Settle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("Groups" as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="people" size={22} color="#D97706" />
          </View>
          <Text style={styles.actionText}>Groups</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("Analytics" as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="stats-chart" size={22} color="#2563EB" />
          </View>
          <Text style={styles.actionText}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentExpenses.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate("Expenses" as any)}
            >
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        {recentExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={36} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "Add" to create your first expense
            </Text>
          </View>
        ) : (
          recentExpenses.map((expense, index) => {
            const catColor =
              CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other;
            const catIcon =
              CATEGORY_ICONS[expense.category] || CATEGORY_ICONS.Other;
            const isLast = index === recentExpenses.length - 1;

            return (
              <TouchableOpacity
                key={expense.id}
                style={[styles.expenseItem, isLast && styles.expenseItemLast]}
                onPress={() =>
                  navigation.navigate("ExpenseDetails", {
                    expenseId: expense.id,
                  })
                }
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.expenseIcon,
                    { backgroundColor: catColor + "18" },
                  ]}
                >
                  <Ionicons name={catIcon as any} size={18} color={catColor} />
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseDescription} numberOfLines={1}>
                    {expense.description}
                  </Text>
                  <Text style={styles.expenseMeta}>
                    {state.groups.find((g) => g.id === expense.groupId)?.name ||
                      "Personal"}{" "}
                    · {new Date(expense.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.expenseAmount}>
                  <Text style={styles.amountText}>
                    ₹{expense.amount.toFixed(2)}
                  </Text>
                  <Text
                    style={[
                      styles.amountSubtext,
                      {
                        color:
                          expense.paidBy.id === state.currentUser?.id
                            ? "#4CAF50"
                            : "#F44336",
                      },
                    ]}
                  >
                    {expense.paidBy.id === state.currentUser?.id
                      ? "You paid"
                      : `${expense.paidBy.name} paid`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Groups Overview */}
      {state.groups.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Groups</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Groups" as any)}
            >
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {state.groups.slice(0, 4).map((group, index) => {
            const isLast = index === Math.min(state.groups.length, 4) - 1;
            return (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupItem, isLast && styles.groupItemLast]}
                onPress={() =>
                  navigation.navigate("GroupDetails", { groupId: group.id })
                }
                activeOpacity={0.6}
              >
                <View style={styles.groupIcon}>
                  <Ionicons name="people" size={18} color="#5bc5a7" />
                </View>
                <View style={styles.groupDetails}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMembers}>
                    {group.members.length} member
                    {group.members.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
