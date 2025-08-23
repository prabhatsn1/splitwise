import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../types";
import { styles } from "../styles/screens/DashboardScreen.styles";

type DashboardNavigationProp = StackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const { state } = useApp();

  // Use centralized balance calculation from AppContext
  const getUserBalance = () => {
    const userBalance = state.balances.find(
      (balance) => balance.userId === state.currentUser?.id
    );

    if (userBalance) {
      return userBalance.totalBalance;
    }

    // Fallback calculation if no balance data exists
    let totalOwed = 0;
    let totalOwing = 0;

    state.expenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === state.currentUser?.id
      );
      if (userSplit) {
        if (expense.paidBy.id === state.currentUser?.id) {
          // User paid, others owe them
          totalOwed += expense.amount - userSplit.amount;
        } else {
          // User owes someone else
          totalOwing += userSplit.amount;
        }
      }
    });

    return totalOwed - totalOwing;
  };

  const balance = getUserBalance();

  const recentExpenses = state.expenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleAddExpense = () => {
    navigation.navigate("AddExpense", {});
  };

  const handleSettleUp = () => {
    Alert.alert(
      "Settle Up",
      "This feature would allow you to settle debts with friends."
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Balance Summary */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>Your Balance</Text>
        <Text
          style={[
            styles.balanceAmount,
            { color: balance >= 0 ? "#4CAF50" : "#F44336" },
          ]}
        >
          ₹{Math.abs(balance).toFixed(2)}
        </Text>
        <Text style={styles.balanceSubtext}>
          {balance >= 0 ? "You are owed" : "You owe"}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddExpense}
        >
          <Ionicons name="add-circle" size={24} color="#5bc5a7" />
          <Text style={styles.actionText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleSettleUp}>
          <Ionicons name="card" size={24} color="#5bc5a7" />
          <Text style={styles.actionText}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first expense to get started
            </Text>
          </View>
        ) : (
          recentExpenses.map((expense) => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseIcon}>
                <Ionicons name="receipt" size={20} color="#5bc5a7" />
              </View>
              <View style={styles.expenseDetails}>
                <Text style={styles.expenseDescription}>
                  {expense.description}
                </Text>
                <Text style={styles.expenseGroup}>
                  {state.groups.find((g) => g.id === expense.groupId)?.name ||
                    "Personal"}
                </Text>
                <Text style={styles.expenseDate}>
                  {new Date(expense.date).toLocaleDateString()}
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
            </View>
          ))
        )}
      </View>

      {/* Groups Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Groups</Text>
        {state.groups.map((group) => (
          <TouchableOpacity key={group.id} style={styles.groupItem}>
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={20} color="#5bc5a7" />
            </View>
            <View style={styles.groupDetails}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupMembers}>
                {group.members.length} member
                {group.members.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
