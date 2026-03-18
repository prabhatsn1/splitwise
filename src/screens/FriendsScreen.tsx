import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { User, RootStackParamList } from "../types";
import { styles } from "../styles/screens/FriendsScreen.styles";

type FriendsNavProp = StackNavigationProp<RootStackParamList>;

export default function FriendsScreen() {
  const { state, addFriend } = useApp();
  const navigation = useNavigation<FriendsNavProp>();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");

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
          totalOwed += friendSplit.amount;
        } else if (
          expense.paidBy.id === friend.id &&
          expense.splitBetween.some((u) => u.id === state.currentUser?.id)
        ) {
          // Friend paid, you owe friend
          totalOwing += userSplit.amount;
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
      });

      setFriendName("");
      setFriendEmail("");
      setShowAddFriend(false);
      Alert.alert("Success", "Friend added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add friend. Please try again.");
    }
  };

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
        data={state.friends}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.friendsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="person-add-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>
              Add friends to split expenses together
            </Text>
          </View>
        }
      />

      {!showAddFriend && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddFriend(true)}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}
