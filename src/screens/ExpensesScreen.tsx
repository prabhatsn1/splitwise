import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList, Expense } from "../types";
import { styles } from "../styles/screens/ExpensesScreen.styles";

type ExpensesNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ExpensesScreen() {
  const navigation = useNavigation<ExpensesNavigationProp>();
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState<"all" | "you-paid" | "you-owe">("all");

  const filteredExpenses = state.expenses
    .filter((expense) => {
      switch (filter) {
        case "you-paid":
          return expense.paidBy.id === state.currentUser?.id;
        case "you-owe":
          return (
            expense.paidBy.id !== state.currentUser?.id &&
            expense.splits.some(
              (split) => split.userId === state.currentUser?.id
            )
          );
        default:
          return true;
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            dispatch({ type: "DELETE_EXPENSE", payload: expenseId }),
        },
      ]
    );
  };

  const renderExpenseItem = ({ item: expense }: { item: Expense }) => {
    const userSplit = expense.splits.find(
      (split) => split.userId === state.currentUser?.id
    );
    const group = state.groups.find((g) => g.id === expense.groupId);

    return (
      <View style={styles.expenseItem}>
        <View style={styles.expenseHeader}>
          <View style={styles.expenseIcon}>
            <Ionicons name="receipt" size={20} color="#5bc5a7" />
          </View>
          <View style={styles.expenseDetails}>
            <Text style={styles.expenseDescription}>{expense.description}</Text>
            <Text style={styles.expenseGroup}>{group?.name || "Personal"}</Text>
            <Text style={styles.expenseDate}>
              {new Date(expense.date).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteExpense(expense.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>

        <View style={styles.expenseFooter}>
          <View style={styles.amountInfo}>
            <Text style={styles.totalAmount}>₹{expense.amount.toFixed(2)}</Text>
            <Text style={styles.paidBy}>
              Paid by{" "}
              {expense.paidBy.id === state.currentUser?.id
                ? "you"
                : expense.paidBy.name}
            </Text>
          </View>

          {userSplit && (
            <View style={styles.userSplit}>
              <Text
                style={[
                  styles.splitAmount,
                  {
                    color:
                      expense.paidBy.id === state.currentUser?.id
                        ? "#4CAF50"
                        : "#F44336",
                  },
                ]}
              >
                {expense.paidBy.id === state.currentUser?.id
                  ? `+₹${(expense.amount - userSplit.amount).toFixed(2)}`
                  : `-₹${userSplit.amount.toFixed(2)}`}
              </Text>
              <Text style={styles.splitText}>
                {expense.paidBy.id === state.currentUser?.id
                  ? "you lent"
                  : "you owe"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.activeFilterTab]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.activeFilterTabText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "you-paid" && styles.activeFilterTab,
          ]}
          onPress={() => setFilter("you-paid")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "you-paid" && styles.activeFilterTabText,
            ]}
          >
            You paid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "you-owe" && styles.activeFilterTab,
          ]}
          onPress={() => setFilter("you-owe")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "you-owe" && styles.activeFilterTabText,
            ]}
          >
            You owe
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expenses List */}
      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.expensesList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No expenses found</Text>
            <Text style={styles.emptySubtext}>
              {filter === "all"
                ? "Add your first expense to get started"
                : "No expenses match your filter"}
            </Text>
          </View>
        }
      />

      {/* Add Expense FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddExpense", {})}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
