import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList, Expense } from "../types";
import { styles } from "../styles/screens/ExpenseDetailsScreen.styles";

type ExpenseDetailsRouteProp = RouteProp<RootStackParamList, "ExpenseDetails">;
type ExpenseDetailsNavProp = StackNavigationProp<RootStackParamList>;

const CATEGORIES: Expense["category"][] = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Shopping",
  "Travel",
  "Other",
];

const CATEGORY_ICONS: Record<Expense["category"], string> = {
  Food: "fast-food-outline",
  Transport: "car-outline",
  Entertainment: "film-outline",
  Bills: "document-text-outline",
  Shopping: "bag-outline",
  Travel: "airplane-outline",
  Other: "ellipsis-horizontal-outline",
};

export default function ExpenseDetailsScreen() {
  const route = useRoute<ExpenseDetailsRouteProp>();
  const navigation = useNavigation<ExpenseDetailsNavProp>();
  const { state, updateExpense, deleteExpense } = useApp();
  const { expenseId } = route.params;

  const expense = state.expenses.find((e) => e.id === expenseId);
  const group = expense
    ? state.groups.find((g) => g.id === expense.groupId)
    : null;

  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(
    expense?.description ?? "",
  );
  const [editAmount, setEditAmount] = useState(
    expense?.amount.toFixed(2) ?? "",
  );
  const [editCategory, setEditCategory] = useState<Expense["category"]>(
    expense?.category ?? "Other",
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      navigation.setOptions({ title: expense.description });
    }
  }, [expense, navigation]);

  if (!expense) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Ionicons name="receipt-outline" size={64} color="#ccc" />
        <Text style={{ color: "#888", marginTop: 12, fontSize: 16 }}>
          Expense not found
        </Text>
      </View>
    );
  }

  const handleSave = async () => {
    const parsedAmount = parseFloat(editAmount);
    if (!editDescription.trim()) {
      Alert.alert("Validation", "Description cannot be empty.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Validation", "Please enter a valid amount.");
      return;
    }

    setIsSaving(true);
    try {
      await updateExpense(expenseId, {
        description: editDescription.trim(),
        amount: parsedAmount,
        category: editCategory,
      });
      navigation.setOptions({ title: editDescription.trim() });
      setIsEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete "${expense.description}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense(expenseId);
              navigation.goBack();
            } catch {
              Alert.alert(
                "Error",
                "Failed to delete expense. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleCancelEdit = () => {
    setEditDescription(expense.description);
    setEditAmount(expense.amount.toFixed(2));
    setEditCategory(expense.category);
    setIsEditing(false);
  };

  const userSplit = expense.splits.find(
    (s) => s.userId === state.currentUser?.id,
  );
  const youPaid = expense.paidBy.id === state.currentUser?.id;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.categoryIcon}>
            <Ionicons
              name={CATEGORY_ICONS[expense.category] as any}
              size={28}
              color="#fff"
            />
          </View>
          <Text style={styles.heroAmount}>₹{expense.amount.toFixed(2)}</Text>
          <Text style={styles.heroDescription}>{expense.description}</Text>
          <Text style={styles.heroDate}>
            {new Date(expense.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Edit / View mode */}
        {isEditing ? (
          /* ── Edit Mode ── */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Edit Expense</Text>

            <Text style={styles.editLabel}>Description</Text>
            <TextInput
              style={styles.editField}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.editLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.editField}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.editLabel}>Category</Text>
            <View style={styles.categoryPicker}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    editCategory === cat && styles.categoryChipSelected,
                  ]}
                  onPress={() => setEditCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      editCategory === cat && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelEditButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Saving…" : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── View Mode ── */
          <>
            {/* Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{expense.category}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Paid by</Text>
                <Text style={styles.detailValue}>
                  {youPaid ? "You" : expense.paidBy.name}
                </Text>
              </View>
              {group && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Group</Text>
                  <Text style={styles.detailValue}>{group.name}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Split type</Text>
                <Text style={styles.detailValue}>{expense.splitType}</Text>
              </View>
              {expense.location && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>
                    {expense.location.address}
                  </Text>
                </View>
              )}
              {expense.recurring && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Recurring</Text>
                  <Text style={styles.detailValue}>
                    Every {expense.recurring.frequency}
                  </Text>
                </View>
              )}
              {expense.tags.length > 0 && (
                <View
                  style={[
                    styles.detailRow,
                    { flexDirection: "column", alignItems: "flex-start" },
                  ]}
                >
                  <Text style={[styles.detailLabel, { marginBottom: 6 }]}>
                    Tags
                  </Text>
                  <View style={styles.tagRow}>
                    {expense.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Your share */}
            {userSplit && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Share</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Your split amount</Text>
                  <Text style={styles.detailValue}>
                    ₹{userSplit.amount?.toFixed(2) ?? "0.00"}
                  </Text>
                </View>
                {youPaid && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>You are owed</Text>
                    <Text style={[styles.detailValue, { color: "#4CAF50" }]}>
                      ₹{(expense.amount - (userSplit.amount ?? 0)).toFixed(2)}
                    </Text>
                  </View>
                )}
                {!youPaid && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>You owe</Text>
                    <Text style={[styles.detailValue, { color: "#F44336" }]}>
                      ₹{userSplit.amount?.toFixed(2) ?? "0.00"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Splits breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Split Breakdown</Text>
              {expense.splitBetween.map((user) => {
                const split = expense.splits.find((s) => s.userId === user.id);
                return (
                  <View key={user.id} style={styles.splitRow}>
                    <View style={styles.splitAvatar}>
                      <Text style={styles.splitAvatarText}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.splitName}>
                      {user.id === state.currentUser?.id ? "You" : user.name}
                    </Text>
                    <Text style={styles.splitAmount}>
                      ₹{split?.amount?.toFixed(2) ?? "0.00"}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
