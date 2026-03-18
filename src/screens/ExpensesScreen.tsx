import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { RootStackParamList, Expense } from "../types";
import { exportToCSV, exportToPDF } from "../services/exportService";
import { formatCurrency } from "../services/currencyService";

const PAGE_SIZE = 20;

type ExpensesNavigationProp = StackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Shopping",
  "Travel",
  "Other",
] as const;

export default function ExpensesScreen() {
  const navigation = useNavigation<ExpensesNavigationProp>();
  const { state, dispatch } = useApp();
  const { colors } = useTheme();

  // Basic filter
  const [filter, setFilter] = useState<"all" | "you-paid" | "you-owe">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // Export
  const [exporting, setExporting] = useState(false);

  const hasActiveFilters =
    searchQuery.length > 0 ||
    selectedCategories.length > 0 ||
    selectedGroupId !== null ||
    dateFrom.length > 0 ||
    dateTo.length > 0 ||
    amountMin.length > 0 ||
    amountMax.length > 0;

  // Memoize filtered + sorted list
  const allFilteredExpenses = useMemo(() => {
    return state.expenses
      .filter((expense) => {
        // Basic filter
        switch (filter) {
          case "you-paid":
            if (expense.paidBy.id !== state.currentUser?.id) return false;
            break;
          case "you-owe":
            if (
              expense.paidBy.id === state.currentUser?.id ||
              !expense.splits.some(
                (split) => split.userId === state.currentUser?.id,
              )
            )
              return false;
            break;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = expense.description.toLowerCase().includes(q);
          const matchCategory = expense.category.toLowerCase().includes(q);
          const matchPayer = expense.paidBy.name.toLowerCase().includes(q);
          const matchTags = expense.tags.some((t) =>
            t.toLowerCase().includes(q),
          );
          if (!matchDesc && !matchCategory && !matchPayer && !matchTags)
            return false;
        }

        // Category filter
        if (
          selectedCategories.length > 0 &&
          !selectedCategories.includes(expense.category)
        )
          return false;

        // Group filter
        if (selectedGroupId !== null) {
          if (selectedGroupId === "" && expense.groupId) return false;
          if (selectedGroupId !== "" && expense.groupId !== selectedGroupId)
            return false;
        }

        // Date range
        if (dateFrom) {
          const from = parseDateString(dateFrom);
          if (from && new Date(expense.date) < from) return false;
        }
        if (dateTo) {
          const to = parseDateString(dateTo);
          if (to) {
            to.setHours(23, 59, 59, 999);
            if (new Date(expense.date) > to) return false;
          }
        }

        // Amount range
        if (amountMin) {
          const min = parseFloat(amountMin);
          if (!isNaN(min) && expense.amount < min) return false;
        }
        if (amountMax) {
          const max = parseFloat(amountMax);
          if (!isNaN(max) && expense.amount > max) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    state.expenses,
    state.currentUser?.id,
    filter,
    searchQuery,
    selectedCategories,
    selectedGroupId,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
  ]);

  const displayedExpenses = useMemo(
    () => allFilteredExpenses.slice(0, visibleCount),
    [allFilteredExpenses, visibleCount],
  );

  const hasMore = visibleCount < allFilteredExpenses.length;

  const handleFilterChange = useCallback(
    (newFilter: "all" | "you-paid" | "you-owe") => {
      setFilter(newFilter);
      setVisibleCount(PAGE_SIZE);
    },
    [],
  );

  const handleEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) =>
        Math.min(prev + PAGE_SIZE, allFilteredExpenses.length),
      );
      setLoadingMore(false);
    }, 200);
  }, [hasMore, loadingMore, allFilteredExpenses.length]);

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
      ],
    );
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedGroupId(null);
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setVisibleCount(PAGE_SIZE);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
    setVisibleCount(PAGE_SIZE);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await exportToCSV(allFilteredExpenses);
    } catch (error) {
      Alert.alert("Export Error", "Failed to export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportToPDF(allFilteredExpenses, state.currentUser?.name ?? "User");
    } catch (error) {
      Alert.alert("Export Error", "Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    Alert.alert(
      "Export Expenses",
      `Export ${allFilteredExpenses.length} expenses as:`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "CSV", onPress: handleExportCSV },
        { text: "PDF", onPress: handleExportPDF },
      ],
    );
  };

  const renderExpenseItem = ({ item: expense }: { item: Expense }) => {
    const userSplit = expense.splits.find(
      (split) => split.userId === state.currentUser?.id,
    );
    const group = state.groups.find((g) => g.id === expense.groupId);
    const isPending = state.pendingExpenseIds.has(expense.id);
    const currency = (expense as any).currency || "INR";

    return (
      <TouchableOpacity
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          },
          isPending && { opacity: 0.6 },
        ]}
        onPress={() =>
          navigation.navigate("ExpenseDetails", { expenseId: expense.id })
        }
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primaryLight,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="receipt" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                {expense.description}
              </Text>
              {isPending && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
            <Text
              style={{
                fontSize: 14,
                color: colors.primary,
                marginBottom: 2,
              }}
            >
              {group?.name || "Personal"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {new Date(expense.date).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            style={{ padding: 4 }}
            onPress={() => handleDeleteExpense(expense.id)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: colors.textPrimary,
                marginBottom: 2,
              }}
            >
              {formatCurrency(expense.amount, currency)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Paid by{" "}
              {expense.paidBy.id === state.currentUser?.id
                ? "you"
                : expense.paidBy.name}
            </Text>
          </View>

          {userSplit && (
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  marginBottom: 2,
                  color:
                    expense.paidBy.id === state.currentUser?.id
                      ? colors.success
                      : colors.error,
                }}
              >
                {expense.paidBy.id === state.currentUser?.id
                  ? `+${formatCurrency(expense.amount - (userSplit.amount ?? 0), currency)}`
                  : `-${formatCurrency(userSplit.amount ?? 0, currency)}`}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {expense.paidBy.id === state.currentUser?.id
                  ? "you lent"
                  : "you owe"}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          margin: 16,
          marginBottom: 8,
          borderRadius: 8,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={{
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 8,
            fontSize: 15,
            color: colors.textPrimary,
          }}
          placeholder="Search expenses..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setVisibleCount(PAGE_SIZE);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ marginLeft: 8, padding: 4 }}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options"
            size={22}
            color={hasActiveFilters ? colors.primary : colors.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginLeft: 8, padding: 4 }}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name="download-outline"
              size={22}
              color={colors.textTertiary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 16,
            marginBottom: 4,
            alignItems: "center",
          }}
        >
          {selectedCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => toggleCategory(cat)}
              style={{
                backgroundColor: colors.primaryLight,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginRight: 6,
                marginBottom: 4,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary,
                  marginRight: 4,
                }}
              >
                {cat}
              </Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          ))}
          {(dateFrom || dateTo) && (
            <View
              style={{
                backgroundColor: colors.primaryLight,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginRight: 6,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.primary }}>
                {dateFrom || "..."} → {dateTo || "..."}
              </Text>
            </View>
          )}
          {(amountMin || amountMax) && (
            <View
              style={{
                backgroundColor: colors.primaryLight,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginRight: 6,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.primary }}>
                ₹{amountMin || "0"} – ₹{amountMax || "∞"}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={handleClearFilters}>
            <Text
              style={{
                fontSize: 12,
                color: colors.error,
                fontWeight: "500",
                marginBottom: 4,
              }}
            >
              Clear all
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Filter Tabs */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.card,
          marginHorizontal: 16,
          marginBottom: 8,
          borderRadius: 8,
          padding: 4,
        }}
      >
        {(["all", "you-paid", "you-owe"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 6,
              alignItems: "center",
              backgroundColor: filter === f ? colors.primary : "transparent",
            }}
            onPress={() => handleFilterChange(f)}
          >
            <Text
              style={{
                fontSize: 14,
                color: filter === f ? colors.textInverse : colors.textSecondary,
                fontWeight: filter === f ? "500" : "400",
              }}
            >
              {f === "all" ? "All" : f === "you-paid" ? "You paid" : "You owe"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: colors.textTertiary }}>
          {allFilteredExpenses.length} expense
          {allFilteredExpenses.length !== 1 ? "s" : ""}
          {hasActiveFilters ? " (filtered)" : ""}
        </Text>
      </View>

      {/* Expenses List */}
      <FlatList
        data={displayedExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: colors.textTertiary,
                }}
              >
                Loading more…
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: 48 }}>
            <Ionicons
              name="receipt-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "500",
                color: colors.textSecondary,
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              No expenses found
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textTertiary,
                textAlign: "center",
              }}
            >
              {hasActiveFilters
                ? "Try adjusting your filters"
                : filter === "all"
                  ? "Add your first expense to get started"
                  : "No expenses match your filter"}
            </Text>
          </View>
        }
      />

      {/* Add Expense FAB */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 8,
        }}
        onPress={() => navigation.navigate("AddExpense", {})}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Advanced Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: colors.textPrimary,
                }}
              >
                Filters
              </Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Category Filter */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: 8,
                }}
              >
                Category
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => toggleCategory(cat)}
                    style={{
                      backgroundColor: selectedCategories.includes(cat)
                        ? colors.primary
                        : colors.backgroundLight,
                      borderWidth: 1,
                      borderColor: selectedCategories.includes(cat)
                        ? colors.primary
                        : colors.border,
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: selectedCategories.includes(cat)
                          ? colors.textInverse
                          : colors.textPrimary,
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Group Filter */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: 8,
                }}
              >
                Group
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              >
                <TouchableOpacity
                  onPress={() => setSelectedGroupId(null)}
                  style={{
                    backgroundColor:
                      selectedGroupId === null
                        ? colors.primary
                        : colors.backgroundLight,
                    borderWidth: 1,
                    borderColor:
                      selectedGroupId === null ? colors.primary : colors.border,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color:
                        selectedGroupId === null
                          ? colors.textInverse
                          : colors.textPrimary,
                    }}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedGroupId("")}
                  style={{
                    backgroundColor:
                      selectedGroupId === ""
                        ? colors.primary
                        : colors.backgroundLight,
                    borderWidth: 1,
                    borderColor:
                      selectedGroupId === "" ? colors.primary : colors.border,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color:
                        selectedGroupId === ""
                          ? colors.textInverse
                          : colors.textPrimary,
                    }}
                  >
                    Personal
                  </Text>
                </TouchableOpacity>
                {state.groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setSelectedGroupId(g.id)}
                    style={{
                      backgroundColor:
                        selectedGroupId === g.id
                          ? colors.primary
                          : colors.backgroundLight,
                      borderWidth: 1,
                      borderColor:
                        selectedGroupId === g.id
                          ? colors.primary
                          : colors.border,
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color:
                          selectedGroupId === g.id
                            ? colors.textInverse
                            : colors.textPrimary,
                      }}
                    >
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Date Range */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: 8,
                }}
              >
                Date Range (DD/MM/YYYY)
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: colors.backgroundLight,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: colors.textPrimary,
                  }}
                  placeholder="From"
                  placeholderTextColor={colors.placeholder}
                  value={dateFrom}
                  onChangeText={(t) => {
                    setDateFrom(t);
                    setVisibleCount(PAGE_SIZE);
                  }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: colors.backgroundLight,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: colors.textPrimary,
                  }}
                  placeholder="To"
                  placeholderTextColor={colors.placeholder}
                  value={dateTo}
                  onChangeText={(t) => {
                    setDateTo(t);
                    setVisibleCount(PAGE_SIZE);
                  }}
                />
              </View>

              {/* Amount Range */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: 8,
                }}
              >
                Amount Range
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: colors.backgroundLight,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: colors.textPrimary,
                  }}
                  placeholder="Min"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  value={amountMin}
                  onChangeText={(t) => {
                    setAmountMin(t);
                    setVisibleCount(PAGE_SIZE);
                  }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: colors.backgroundLight,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: colors.textPrimary,
                  }}
                  placeholder="Max"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  value={amountMax}
                  onChangeText={(t) => {
                    setAmountMax(t);
                    setVisibleCount(PAGE_SIZE);
                  }}
                />
              </View>

              {/* Actions */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: 32,
                }}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                  }}
                  onPress={handleClearFilters}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "500",
                      color: colors.textSecondary,
                    }}
                  >
                    Clear All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                  }}
                  onPress={() => setShowFilters(false)}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "500",
                      color: colors.textInverse,
                    }}
                  >
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Parse DD/MM/YYYY to Date (tolerant) */
function parseDateString(str: string): Date | null {
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d);
    }
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}
