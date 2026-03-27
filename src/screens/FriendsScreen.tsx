import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { User, FriendInvitation, RootStackParamList } from "../types";
import { styles } from "../styles/screens/FriendsScreen.styles";

type FriendsNavProp = StackNavigationProp<RootStackParamList>;
type BalanceFilter = "all" | "owes_you" | "you_owe" | "settled";

export default function FriendsScreen() {
  const {
    state,
    addFriend,
    loadInvitations,
    cancelInvitation,
    resendInvitation,
    markInvitationAccepted,
  } = useApp();
  const navigation = useNavigation<FriendsNavProp>();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [friendPhone, setFriendPhone] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");

  // Load invitations on mount
  useEffect(() => {
    loadInvitations();
  }, []);

  const calculateFriendBalance = (friend: User) => {
    // Use centralized balance calculation from AppContext
    const userBalance = state.balances.find(
      (balance) => balance.userId === state.currentUser?.id,
    );

    if (userBalance) {
      // Check if friend owes user or user owes friend
      const friendOwesUser = userBalance.owedBy[friend.id] || 0;
      const userOwesFriend = userBalance.owes[friend.id] || 0;

      return friendOwesUser - userOwesFriend;
    }

    // Fallback calculation if no balance data exists
    let totalOwed = 0;
    let totalOwing = 0;

    state.expenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === state.currentUser?.id,
      );
      const friendSplit = expense.splits.find(
        (split) => split.userId === friend.id,
      );

      if (userSplit && friendSplit) {
        if (
          expense.paidBy.id === state.currentUser?.id &&
          expense.splitBetween.some((u) => u.id === friend.id)
        ) {
          // You paid, friend owes you
          totalOwed += friendSplit.amount ?? 0;
        } else if (
          expense.paidBy.id === friend.id &&
          expense.splitBetween.some((u) => u.id === state.currentUser?.id)
        ) {
          // Friend paid, you owe friend
          totalOwing += userSplit.amount ?? 0;
        }
      }
    });

    return totalOwed - totalOwing;
  };

  const handleAddFriend = async () => {
    if (!friendName.trim() || !friendEmail.trim()) {
      Alert.alert("Error", "Please enter both name and email");
      return;
    }

    try {
      await addFriend({
        name: friendName.trim(),
        email: friendEmail.trim().toLowerCase(),
        ...(friendPhone.trim() ? { phone: friendPhone.trim() } : {}),
      });

      setFriendName("");
      setFriendEmail("");
      setFriendPhone("");
      setShowAddFriend(false);
      Alert.alert("Success", "Friend added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add friend. Please try again.");
    }
  };

  const pendingInvitations = useMemo(
    () => state.invitations.filter((inv) => inv.status === "pending"),
    [state.invitations],
  );

  const handleCancelInvitation = (inv: FriendInvitation) => {
    Alert.alert("Cancel Invitation", `Cancel the invite to ${inv.toName}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => cancelInvitation(inv.id),
      },
    ]);
  };

  const handleResendInvitation = async (inv: FriendInvitation) => {
    try {
      await resendInvitation(inv.id);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not resend invitation.");
    }
  };

  const handleAcceptInvitation = async (inv: FriendInvitation) => {
    try {
      await markInvitationAccepted(inv.id);
      // Also add as friend
      await addFriend({
        name: inv.toName,
        email: "",
        phone: inv.toPhone,
      });
      Alert.alert("Connected!", `${inv.toName} has been added as a friend.`);
    } catch (error) {
      Alert.alert("Error", "Failed to accept invitation.");
    }
  };

  const filteredFriends = useMemo(() => {
    return state.friends.filter((friend) => {
      if (balanceFilter === "all") return true;
      const balance = calculateFriendBalance(friend);
      if (balanceFilter === "owes_you") return balance > 0;
      if (balanceFilter === "you_owe") return balance < 0;
      if (balanceFilter === "settled") return balance === 0;
      return true;
    });
  }, [state.friends, state.expenses, state.balances, balanceFilter]);

  const balanceFilters: { key: BalanceFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "owes_you", label: "Owes you" },
    { key: "you_owe", label: "You owe" },
    { key: "settled", label: "Settled" },
  ];

  const renderFriendItem = ({ item: friend }: { item: User }) => {
    const balance = calculateFriendBalance(friend);

    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => navigation.navigate("SettleUp", { userId: friend.id })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {friend.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendEmail}>{friend.email}</Text>
        </View>
        <View style={styles.friendBalance}>
          {balance !== 0 ? (
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
                {balance >= 0 ? "owes you" : "you owe"}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("SettleUp", { userId: friend.id })
                }
              >
                <Text
                  style={{
                    color: "#5bc5a7",
                    fontSize: 12,
                    fontWeight: "600",
                    marginTop: 2,
                  }}
                >
                  Settle up
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.settledText}>Settled up</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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

      {showAddFriend && (
        <View style={styles.addFriendForm}>
          <Text style={styles.formTitle}>Add a Friend</Text>
          <TextInput
            style={styles.input}
            value={friendName}
            onChangeText={setFriendName}
            placeholder="Friend's name"
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            value={friendEmail}
            onChangeText={setFriendEmail}
            placeholder="Friend's email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            value={friendPhone}
            onChangeText={setFriendPhone}
            placeholder="Mobile number (optional)"
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowAddFriend(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={handleAddFriend}
            >
              <Text style={styles.addButtonText}>Add Friend</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={filteredFriends}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.friendsList}
        ListHeaderComponent={
          pendingInvitations.length > 0 ? (
            <View style={styles.invitationsSection}>
              <Text style={styles.sectionTitle}>
                Pending Invitations ({pendingInvitations.length})
              </Text>
              {pendingInvitations.map((inv) => (
                <View key={inv.id} style={styles.invitationItem}>
                  <View style={styles.invAvatar}>
                    <Ionicons name="paper-plane" size={20} color="#fff" />
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{inv.toName}</Text>
                    <Text style={styles.friendEmail}>{inv.toPhone}</Text>
                    <Text style={styles.invStatus}>Invite sent</Text>
                  </View>
                  <View style={styles.invActions}>
                    <TouchableOpacity
                      onPress={() => handleResendInvitation(inv)}
                      style={styles.invActionBtn}
                    >
                      <Ionicons name="refresh" size={18} color="#5bc5a7" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAcceptInvitation(inv)}
                      style={styles.invActionBtn}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#4CAF50"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleCancelInvitation(inv)}
                      style={styles.invActionBtn}
                    >
                      <Ionicons name="close-circle" size={18} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Text style={styles.sectionTitle}>Friends</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="person-add-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {balanceFilter !== "all"
                ? "No friends match this filter"
                : "No friends yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {balanceFilter !== "all"
                ? "Try selecting a different filter"
                : "Add friends or send an invite to get started"}
            </Text>
          </View>
        }
      />

      {!showAddFriend && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, styles.fabSecondary]}
            onPress={() => setShowAddFriend(true)}
          >
            <Ionicons name="person-add" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate("InviteFriend")}
          >
            <Ionicons name="paper-plane" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
