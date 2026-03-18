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
import { RootStackParamList } from "../types";
import { styles } from "../styles/screens/SettleUpScreen.styles";

type SettleUpRouteProp = RouteProp<RootStackParamList, "SettleUp">;
type SettleUpNavProp = StackNavigationProp<RootStackParamList>;

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash", icon: "cash-outline" as const },
  { key: "upi", label: "UPI", icon: "phone-portrait-outline" as const },
  {
    key: "bank",
    label: "Bank Transfer",
    icon: "business-outline" as const,
  },
  { key: "card", label: "Card", icon: "card-outline" as const },
  {
    key: "other",
    label: "Other",
    icon: "ellipsis-horizontal-outline" as const,
  },
];

export default function SettleUpScreen() {
  const route = useRoute<SettleUpRouteProp>();
  const navigation = useNavigation<SettleUpNavProp>();
  const { state, settleUp } = useApp();
  const { userId } = route.params;

  const friend = state.friends.find((f) => f.id === userId);
  const userBalance = state.balances.find(
    (b) => b.userId === state.currentUser?.id,
  );

  // Current net balance with this friend (+ve means friend owes us, -ve means we owe friend)
  const friendOwesUser = userBalance?.owedBy[userId] ?? 0;
  const userOwesFriend = userBalance?.owes[userId] ?? 0;
  const netBalance = friendOwesUser - userOwesFriend;

  const defaultAmount = Math.abs(netBalance).toFixed(2);

  const [amount, setAmount] = useState(defaultAmount);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: friend ? `Settle with ${friend.name}` : "Settle Up",
    });
  }, [friend, navigation]);

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount > 0;

  const handleConfirm = async () => {
    if (!isValid) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0.",
      );
      return;
    }

    Alert.alert(
      "Confirm Settlement",
      `Record a payment of ₹${parsedAmount.toFixed(2)} to ${friend?.name ?? "friend"} via ${
        PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label ??
        paymentMethod
      }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await settleUp(
                userId,
                parsedAmount,
                note.trim() || undefined,
                paymentMethod,
              );
              Alert.alert(
                "Settlement Recorded",
                `You paid ₹${parsedAmount.toFixed(2)} to ${friend?.name ?? "friend"}.`,
                [{ text: "Done", onPress: () => navigation.goBack() }],
              );
            } catch {
              Alert.alert(
                "Error",
                "Failed to record settlement. Please try again.",
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (!friend) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Ionicons name="person-outline" size={64} color="#ccc" />
        <Text style={{ color: "#888", marginTop: 12, fontSize: 16 }}>
          Friend not found
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {friend.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.settlingWithLabel}>Settling up with</Text>
          <Text style={styles.friendName}>{friend.name}</Text>
          {netBalance !== 0 && (
            <Text style={styles.currentBalance}>
              {netBalance > 0
                ? `${friend.name} owes you ₹${netBalance.toFixed(2)}`
                : `You owe ${friend.name} ₹${Math.abs(netBalance).toFixed(2)}`}
            </Text>
          )}
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#ccc"
              selectTextOnFocus
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            placeholderTextColor="#ccc"
            multiline
          />
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.methodsGrid}>
            {PAYMENT_METHODS.map((method) => {
              const selected = paymentMethod === method.key;
              return (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.methodChip,
                    selected && styles.methodChipSelected,
                  ]}
                  onPress={() => setPaymentMethod(method.key)}
                >
                  <Ionicons
                    name={method.icon}
                    size={18}
                    color={selected ? "#5bc5a7" : "#888"}
                  />
                  <Text
                    style={[
                      styles.methodChipText,
                      selected && styles.methodChipTextSelected,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!isValid || isSubmitting) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!isValid || isSubmitting}
        >
          <Text style={styles.confirmButtonText}>
            {isSubmitting
              ? "Recording..."
              : `Record Payment of ₹${parsedAmount.toFixed(2)}`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
