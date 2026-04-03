import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList, User } from "../types";
import { formatCurrency } from "../services/currencyService";
import { styles } from "../styles/screens/GroupDetailsScreen.styles";

type GroupDetailsRouteProp = RouteProp<RootStackParamList, "GroupDetails">;
type GroupDetailsNavProp = StackNavigationProp<RootStackParamList>;

export default function GroupDetailsScreen() {
  const route = useRoute<GroupDetailsRouteProp>();
  const navigation = useNavigation<GroupDetailsNavProp>();
  const { state, addMemberToGroup, removeMemberFromGroup } = useApp();
  const { groupId } = route.params;
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const group = useMemo(
    () => state.groups.find((g) => g.id === groupId),
    [state.groups, groupId],
  );

  const groupExpenses = useMemo(
    () =>
      state.expenses
        .filter((e) => e.groupId === groupId)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [state.expenses, groupId],
  );

  const availableFriends = useMemo(
    () =>
      state.friends.filter(
        (friend) => !group?.members.some((m) => m.id === friend.id),
      ),
    [state.friends, group],
  );

  const totalGroupSpend = useMemo(
    () => groupExpenses.reduce((sum, e) => sum + e.amount, 0),
    [groupExpenses],
  );

  // Calculate current user's net balance in this group, accounting for settlements
  const myBalance = useMemo(() => {
    if (!state.currentUser || !group) return 0;

    const userId = state.currentUser.id;
    let owedToMe = 0;
    let iOwe = 0;

    groupExpenses.forEach((expense) => {
      const mySplit = expense.splits.find((s) => s.userId === userId);
      if (!mySplit) return;
      if (expense.paidBy.id === userId) {
        owedToMe += expense.amount - (mySplit.amount ?? 0);
      } else {
        iOwe += mySplit.amount ?? 0;
      }
    });

    // Incorporate settlements between group members
    const groupMemberIds = new Set(group.members.map((m) => m.id));
    state.settlements.forEach((s) => {
      if (!groupMemberIds.has(s.fromUserId) || !groupMemberIds.has(s.toUserId))
        return;
      if (s.toUserId === userId) {
        // Someone paid me — clears what they owed
        owedToMe = Math.max(0, owedToMe - s.amount);
      } else if (s.fromUserId === userId) {
        // I paid someone — clears what I owed
        iOwe = Math.max(0, iOwe - s.amount);
      }
    });

    return owedToMe - iOwe;
  }, [groupExpenses, group, state.settlements, state.currentUser]);

  const calculateMemberBalance = (memberId: string) => {
    if (!state.currentUser || !group) return 0;

    const userId = state.currentUser.id;
    let owedToMe = 0;
    let iOwe = 0;

    groupExpenses.forEach((expense) => {
      const mySplit = expense.splits.find((s) => s.userId === userId);
      const memberSplit = expense.splits.find((s) => s.userId === memberId);
      if (!mySplit || !memberSplit) return;

      if (expense.paidBy.id === userId && memberId !== userId) {
        owedToMe += memberSplit.amount ?? 0;
      } else if (expense.paidBy.id === memberId && userId !== expense.paidBy.id) {
        iOwe += mySplit.amount ?? 0;
      }
    });

    // Incorporate settlements
    state.settlements.forEach((s) => {
      if (s.fromUserId === memberId && s.toUserId === userId) {
        owedToMe = Math.max(0, owedToMe - s.amount);
      } else if (s.fromUserId === userId && s.toUserId === memberId) {
        iOwe = Math.max(0, iOwe - s.amount);
      }
    });

    return owedToMe - iOwe;
  };

  const handleAddMember = async (friend: User) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addMemberToGroup(groupId, friend);
      setShowAddMemberModal(false);
      Alert.alert("Success", `${friend.name} added to group`);
    } catch (error) {
      Alert.alert("Error", "Failed to add member to group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: User) => {
    if (isSubmitting) return;
    if (member.id === state.currentUser?.id) {
      Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await removeMemberFromGroup(groupId, member.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(
                "Cannot Leave Group",
                error.message || "Failed to leave group",
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]);
    } else {
      Alert.alert("Remove Member", `Remove ${member.name} from this group?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await removeMemberFromGroup(groupId, member.id);
              Alert.alert("Success", `${member.name} removed from group`);
            } catch (error: any) {
              Alert.alert(
                "Cannot Remove Member",
                error.message || "Failed to remove member",
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]);
    }
  };

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
              {formatCurrency(totalGroupSpend)}
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
                {formatCurrency(Math.abs(myBalance))}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Settle Up in Group */}
      {state.currentUser && group.members.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settle Up</Text>
          {group.members
            .filter((m) => m.id !== state.currentUser?.id)
            .map((member) => {
              const memberBalance = calculateMemberBalance(member.id);
              if (memberBalance === 0) return null;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={styles.settleUpRow}
                  onPress={() => navigation.navigate("SettleUp", { userId: member.id })}
                >
                  <View style={styles.settleUpAvatar}>
                    <Text style={styles.settleUpAvatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.settleUpInfo}>
                    <Text style={styles.settleUpName}>{member.name}</Text>
                    <Text
                      style={[
                        styles.settleUpBalance,
                        { color: memberBalance > 0 ? "#4CAF50" : "#F44336" },
                      ]}
                    >
                      {memberBalance > 0
                        ? `owes you ${formatCurrency(Math.abs(memberBalance))}`
                        : `you owe ${formatCurrency(Math.abs(memberBalance))}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#888" />
                </TouchableOpacity>
              );
            })}
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
        <View style={styles.memberAvatarsRow}>
          {group.members.slice(0, 6).map((member, index) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberAvatarChip,
                { marginLeft: index === 0 ? 0 : -10 },
              ]}
              onLongPress={() => !isSubmitting && handleRemoveMember(member)}
              delayLongPress={400}
            >
              <Text style={styles.memberAvatarChipText}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
          {group.members.length > 6 && (
            <View
              style={[
                styles.memberAvatarChip,
                styles.memberAvatarOverflow,
                { marginLeft: -10 },
              ]}
            >
              <Text style={styles.memberAvatarOverflowText}>
                +{group.members.length - 6}
              </Text>
            </View>
          )}
          <Text style={styles.memberCountLabel}>
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Expenses in this group */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        <FlatList
          data={groupExpenses}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item: expense }) => {
            const youPaid = expense.paidBy.id === state.currentUser?.id;
            return (
              <TouchableOpacity
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
                    {formatCurrency(expense.amount)}
                  </Text>
                  <Text style={styles.expensePaidBy}>
                    {youPaid ? "You paid" : `${expense.paidBy.name} paid`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color="#ddd" />
              <Text style={styles.emptyText}>No expenses yet</Text>
            </View>
          }
        />

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

      {/* Invite via QR / Link button */}
      <TouchableOpacity
        style={[
          styles.analyticsButton,
          { backgroundColor: "#3B82F6", marginTop: 8 },
        ]}
        onPress={() =>
          navigation.navigate("GroupInvite", { groupId: group.id })
        }
      >
        <Ionicons name="qr-code-outline" size={20} color="#fff" />
        <Text style={styles.analyticsButtonText}>Invite via QR / Link</Text>
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
                  <Text style={styles.emptyText}>
                    All friends are already in this group
                  </Text>
                </View>
              ) : (
                availableFriends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendRow}
                    disabled={isSubmitting}
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
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#5bc5a7" />
                    ) : (
                      <Ionicons name="add-circle" size={24} color="#5bc5a7" />
                    )}
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
