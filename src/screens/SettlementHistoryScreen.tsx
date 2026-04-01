import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { RootStackParamList, Settlement, User } from "../types";

type NavProp = StackNavigationProp<RootStackParamList>;

const PAYMENT_ICONS: Record<string, string> = {
  cash: "cash-outline",
  upi: "phone-portrait-outline",
  bank: "business-outline",
  bank_transfer: "business-outline",
  card: "card-outline",
  other: "ellipsis-horizontal-circle-outline",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank Transfer",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

export default function SettlementHistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const { state, loadSettlements } = useApp();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadSettlements().finally(() => setLoading(false));
  }, []);

  const getUserName = (userId: string): string => {
    if (userId === state.currentUser?.id) return "You";
    const friend = state.friends.find((f) => f.id === userId);
    return friend?.name ?? "Unknown";
  };

  const totalPaid = state.settlements
    .filter((s) => s.fromUserId === state.currentUser?.id)
    .reduce((sum, s) => sum + s.amount, 0);

  const totalReceived = state.settlements
    .filter((s) => s.toUserId === state.currentUser?.id)
    .reduce((sum, s) => sum + s.amount, 0);

  const renderItem = ({ item }: { item: Settlement }) => {
    const isOutgoing = item.fromUserId === state.currentUser?.id;
    const otherPartyId = isOutgoing ? item.toUserId : item.fromUserId;
    const otherPartyName = getUserName(otherPartyId);
    const paymentMethod = item.paymentMethod ?? "other";
    const iconName = PAYMENT_ICONS[paymentMethod] ?? PAYMENT_ICONS.other;
    const methodLabel = PAYMENT_LABELS[paymentMethod] ?? "Other";

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, shadowColor: colors.shadow },
        ]}
      >
        {/* Left: icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isOutgoing ? "#FEE2E2" : "#DCFCE7" },
          ]}
        >
          <Ionicons
            name={isOutgoing ? "arrow-up" : "arrow-down"}
            size={22}
            color={isOutgoing ? "#EF4444" : "#22C55E"}
          />
        </View>

        {/* Middle: details */}
        <View style={styles.details}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isOutgoing
              ? `You paid ${otherPartyName}`
              : `${otherPartyName} paid you`}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons
              name={iconName as any}
              size={13}
              color={colors.textTertiary}
            />
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              {methodLabel}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textTertiary }]}>
              ·
            </Text>
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              {new Date(item.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
          {item.note ? (
            <Text
              style={[styles.note, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              "{item.note}"
            </Text>
          ) : null}
        </View>

        {/* Right: amount */}
        <Text
          style={[styles.amount, { color: isOutgoing ? "#EF4444" : "#22C55E" }]}
        >
          {isOutgoing ? "-" : "+"}₹{item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  const sorted = [...state.settlements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary banner */}
      <View style={[styles.summaryRow, { backgroundColor: colors.card }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total Paid
          </Text>
          <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
            ₹{totalPaid.toFixed(2)}
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total Received
          </Text>
          <Text style={[styles.summaryValue, { color: "#22C55E" }]}>
            ₹{totalReceived.toFixed(2)}
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Net
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: totalReceived - totalPaid >= 0 ? "#22C55E" : "#EF4444" },
            ]}
          >
            ₹{Math.abs(totalReceived - totalPaid).toFixed(2)}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          size="large"
          color={colors.primary}
        />
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="swap-horizontal-outline"
            size={64}
            color={colors.textTertiary}
          />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No Settlements Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Settlements appear here after you settle up with friends.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  summaryDivider: { width: 1, marginVertical: 4 },
  listContent: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  details: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 12 },
  metaDot: { fontSize: 12 },
  note: { fontSize: 12, fontStyle: "italic", marginTop: 3 },
  amount: { fontSize: 17, fontWeight: "700" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 16 },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
