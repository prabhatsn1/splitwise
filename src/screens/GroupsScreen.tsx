import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList, Group } from "../types";
import { styles } from "../styles/screens/GroupsScreen.styles";

type GroupsNavigationProp = StackNavigationProp<RootStackParamList>;
type BalanceFilter = "all" | "owed" | "owing" | "settled";

export default function GroupsScreen() {
  const navigation = useNavigation<GroupsNavigationProp>();
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");

  const calculateGroupBalance = (group: Group) => {
    const groupExpenses = state.expenses.filter(
      (expense) => expense.groupId === group.id,
    );
    let totalOwed = 0;
    let totalOwing = 0;

    groupExpenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === state.currentUser?.id,
      );
      if (userSplit) {
        const splitAmount = userSplit.amount ?? 0;
        if (expense.paidBy.id === state.currentUser?.id) {
          totalOwed += expense.amount - splitAmount;
        } else {
          totalOwing += splitAmount;
        }
      }
    });

    return totalOwed - totalOwing;
  };

  const filteredGroups = useMemo(() => {
    return state.groups.filter((group) => {
      const matchesSearch = group.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (balanceFilter === "all") return true;
      const balance = calculateGroupBalance(group);
      if (balanceFilter === "owed") return balance > 0;
      if (balanceFilter === "owing") return balance < 0;
      if (balanceFilter === "settled") return balance === 0;
      return true;
    });
  }, [state.groups, state.expenses, searchQuery, balanceFilter]);

  const renderGroupItem = ({ item: group }: { item: Group }) => {
    const balance = calculateGroupBalance(group);
    const groupExpenses = state.expenses.filter(
      (expense) => expense.groupId === group.id,
    );

    return (
      <TouchableOpacity
        style={styles.groupItem}
        onPress={() =>
          navigation.navigate("GroupDetails", { groupId: group.id })
        }
      >
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

  const balanceFilters: { key: BalanceFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "owed", label: "Owed to you" },
    { key: "owing", label: "You owe" },
    { key: "settled", label: "Settled" },
  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Balance Filter Chips */}
      <View style={styles.filterRow}>
        {balanceFilters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              balanceFilter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setBalanceFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                balanceFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredGroups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.groupsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery || balanceFilter !== "all"
                ? "No groups match your filters"
                : "No groups yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || balanceFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Create a group to split expenses with friends"}
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
