import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList, Group } from "../types";
import { styles } from "../styles/screens/GroupsScreen.styles";

type GroupsNavigationProp = StackNavigationProp<RootStackParamList>;

export default function GroupsScreen() {
  const navigation = useNavigation<GroupsNavigationProp>();
  const { state } = useApp();

  const calculateGroupBalance = (group: Group) => {
    const groupExpenses = state.expenses.filter(
      (expense) => expense.groupId === group.id
    );
    let totalOwed = 0;
    let totalOwing = 0;

    groupExpenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === state.currentUser?.id
      );
      if (userSplit) {
        if (expense.paidBy.id === state.currentUser?.id) {
          totalOwed += expense.amount - userSplit.amount;
        } else {
          totalOwing += userSplit.amount;
        }
      }
    });

    return totalOwed - totalOwing;
  };

  const renderGroupItem = ({ item: group }: { item: Group }) => {
    const balance = calculateGroupBalance(group);
    const groupExpenses = state.expenses.filter(
      (expense) => expense.groupId === group.id
    );

    return (
      <TouchableOpacity style={styles.groupItem}>
        <View style={styles.groupIcon}>
          <Ionicons name="people" size={24} color="#5bc5a7" />
        </View>
        <View style={styles.groupDetails}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDescription}>{group.description}</Text>
          <Text style={styles.groupMembers}>
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}{" "}
            • {groupExpenses.length} expense
            {groupExpenses.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.groupBalance}>
          {balance !== 0 && (
            <>
              <Text
                style={[
                  styles.balanceAmount,
                  { color: balance >= 0 ? "#4CAF50" : "#F44336" },
                ]}
              >
                ₹{Math.abs(balance).toFixed(2)}
              </Text>
              <Text style={styles.balanceText}>
                {balance >= 0 ? "you are owed" : "you owe"}
              </Text>
            </>
          )}
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#ccc"
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={state.groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.groupsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>
              Create a group to split expenses with friends
            </Text>
          </View>
        }
      />

      {/* Create Group FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateGroup")}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
