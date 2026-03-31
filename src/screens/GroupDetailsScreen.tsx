import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList, User } from "../types";
import { styles } from "../styles/screens/GroupDetailsScreen.styles";

type GroupDetailsRouteProp = RouteProp<RootStackParamList, "GroupDetails">;
type GroupDetailsNavProp = StackNavigationProp<RootStackParamList>;

export default function GroupDetailsScreen() {
  const route = useRoute<GroupDetailsRouteProp>();
  const navigation = useNavigation<GroupDetailsNavProp>();
  const { state, addMemberToGroup, removeMemberFromGroup } = useApp();
  const { groupId } = route.params;
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const group = state.groups.find((g) => g.id === groupId);
  const groupExpenses = state.expenses
    .filter((e) => e.groupId === groupId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate per-member balance within this group
  const getMemberBalance = (member: User): number => {
    let owedToMember = 0;
    let memberOwes = 0;

    groupExpenses.forEach((expense) => {
      const memberSplit = expense.splits.find((s) => s.userId === member.id);
      if (!memberSplit) return;

      if (expense.paidBy.id === member.id) {
        // Member paid; everyone else owes them
        owedToMember += expense.amount - (memberSplit.amount ?? 0);
      } else {
        // Someone else paid; member owes their share
        memberOwes += memberSplit.amount ?? 0;
      }
    });

    return owedToMember - memberOwes;
  };

  const handleAddMember = async (friend: User) => {
    try {
      await addMemberToGroup(groupId, friend);
      setShowAddMemberModal(false);
      Alert.alert("Success", `${friend.name} added to group`);
    } catch (error) {
      Alert.alert("Error", "Failed to add member to group");
    }
  };

  const handleRemoveMember = async (member: User) => {
    if (member.id === state.currentUser?.id) {
      Alert.alert(
        "Leave Group",
        "Are you sure you want to leave this group?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: async () => {
              try {
                await removeMemberFromGroup(groupId, member.id);
                navigation.goBack();
              } catch (error: any) {
                Alert.alert("Cannot Leave Group", error.message || "Failed to leave group");
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Remove Member",
        `Remove ${member.name} from this group?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await removeMemberFromGroup(groupId, member.id);
                Alert.alert("Success", `${member.name} removed from group`);
              } catch (error: any) {
                Alert.alert("Cannot Remove Member", error.message || "Failed to remove member");
              }
            },
          },
        ]
      );
    }
  };

  // Get friends not in the group
  const availableFriends = state.friends.filter(
    (friend) => !group?.members.some((m) => m.id === friend.id)
  );

  const myBalance = state.currentUser ? getMemberBalance(state.currentUser) : 0;

  const totalGroupSpend = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (!group) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Ionicons name="people-outline" size={64} color="#ccc" />
        <Text style={{ color: "#888", marginTop: 12, fontSize: 16 }}>
          Group not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.groupIconCircle}>
          <Ionicons name="people" size={32} color="#fff" />
        </View>
        <Text style={styles.groupName}>{group.name}</Text>
        {!!group.description && (
          <Text style={styles.groupDescription}>{group.description}</Text>
        )}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{group.members.length}</Text>
            <Text style={styles.heroStatLabel}>Members</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{groupExpenses.length}</Text>
            <Text style={styles.heroStatLabel}>Expenses</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              ₹{totalGroupSpend.toFixed(0)}
            </Text>
            <Text style={styles.heroStatLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* My balance summary */}
      {state.currentUser && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Balance in Group</Text>
          <View style={styles.balanceSummaryCard}>
            <View style={styles.balanceSummaryRow}>
              <Text style={styles.balanceSummaryLabel}>
                {myBalance >= 0 ? "You are owed" : "You owe"}
              </Text>
              <Text
                style={[
                  styles.balanceSummaryAmount,
                  { color: myBalance >= 0 ? "#4CAF50" : "#F44336" },
                ]}
              >
                ₹{Math.abs(myBalance).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Members & balances */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members</Text>
          <TouchableOpacity
            style={styles.addMemberButton}
            onPress={() => setShowAddMemberModal(true)}
          >
            <Ionicons name="person-add" size={20} color="#5bc5a7" />
          </TouchableOpacity>
        </View>
        {group.members.map((member) => {
          const balance = getMemberBalance(member);
          const isCurrentUser = member.id === state.currentUser?.id;

          return (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {isCurrentUser ? `${member.name} (You)` : member.name}
                </Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
              <View style={styles.memberBalance}>
                {balance === 0 ? (
                  <Text style={styles.settledBadge}>Settled</Text>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.memberBalanceAmount,
                        { color: balance > 0 ? "#4CAF50" : "#F44336" },
                      ]}
                    >
                      ₹{Math.abs(balance).toFixed(2)}
                    </Text>
                    <Text style={styles.memberBalanceLabel}>
                      {balance > 0 ? "gets back" : "owes"}
                    </Text>
                  </>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeMemberButton}
                onPress={() => handleRemoveMember(member)}
              >
                <Ionicons
                  name={isCurrentUser ? "exit-outline" : "close-circle"}
                  size={24}
                  color="#F44336"
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Expenses in this group */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        {groupExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color="#ddd" />
            <Text style={styles.emptyText}>No expenses yet</Text>
          </View>
        ) : (
          groupExpenses.map((expense) => {
            const youPaid = expense.paidBy.id === state.currentUser?.id;
            return (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseRow}
                onPress={() =>
                  navigation.navigate("ExpenseDetails", {
                    expenseId: expense.id,
                  })
                }
              >
                <View style={styles.expenseIconCircle}>
                  <Ionicons name="receipt" size={18} color="#5bc5a7" />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDescription}>
                    {expense.description}
                  </Text>
                  <Text style={styles.expenseMeta}>
                    {new Date(expense.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
                <View style={styles.expenseAmountCol}>
                  <Text style={styles.expenseAmount}>
                    ₹{expense.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.expensePaidBy}>
                    {youPaid ? "You paid" : `${expense.paidBy.name} paid`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addExpenseButton}
          onPress={() =>
            navigation.navigate("AddExpense", { groupId: group.id })
          }
        >
          <Text style={styles.addExpenseButtonText}>
            + Add Expense to Group
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Analytics button */}
      <TouchableOpacity
        style={styles.analyticsButton}
        onPress={() =>
          navigation.navigate("GroupAnalytics", { groupId: group.id })
        }
      >
        <Ionicons name="analytics" size={20} color="#fff" />
        <Text style={styles.analyticsButtonText}>View Group Analytics</Text>
      </TouchableOpacity>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Member</Text>
              <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {availableFriends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>All friends are already in this group</Text>
                </View>
              ) : (
                availableFriends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendRow}
                    onPress={() => handleAddMember(friend)}
                  >
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>
                        {friend.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendEmail}>{friend.email}</Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#5bc5a7" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
