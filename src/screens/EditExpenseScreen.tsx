import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import {
  RootStackParamList,
  SplitType,
  AdvancedSplit,
  Location,
  RecurringConfig,
} from "../types";
import { styles } from "../styles/screens/AddExpenseScreen.styles";
import * as ExpoLocation from "expo-location";
import {
  CURRENCIES,
  formatCurrency,
  getExchangeRates,
} from "../services/currencyService";
import CategoryService, { CATEGORY_META } from "../services/categoryService";

type EditExpenseNavProp = StackNavigationProp<
  RootStackParamList,
  "EditExpense"
>;
type EditExpenseRouteProp = RouteProp<RootStackParamList, "EditExpense">;

type PanelType =
  | "category"
  | "payer"
  | "split"
  | "location"
  | "tags"
  | "recurring"
  | null;

export default function EditExpenseScreen() {
  const navigation = useNavigation<EditExpenseNavProp>();
  const route = useRoute<EditExpenseRouteProp>();
  const { state, updateExpense } = useApp();
  const { colors } = useTheme();

  const { expenseId } = route.params;
  const expense = state.expenses.find((e) => e.id === expenseId);

  // ── State initialised from the existing expense ──────────────────────────
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense?.amount.toFixed(2) ?? "");
  const [currency, setCurrency] = useState(expense?.currency ?? "INR");
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(expense?.groupId ?? "");
  const [selectedPayer, setSelectedPayer] = useState(
    expense?.paidBy.id ?? state.currentUser?.id ?? "",
  );
  const [splitType, setSplitType] = useState<SplitType>(
    expense?.splitType ?? "equal",
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    expense?.splitBetween.map((m) => m.id) ?? [],
  );
  const [customSplits, setCustomSplits] = useState<AdvancedSplit[]>(
    expense?.splits ?? [],
  );
  const [category, setCategory] = useState<string>(
    expense?.category ?? "Other",
  );
  const [tags, setTags] = useState<string[]>(expense?.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [location, setLocation] = useState<Location | undefined>(
    expense?.location,
  );
  const [isRecurring, setIsRecurring] = useState(!!expense?.recurring);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>(
    expense?.recurring ?? { frequency: "monthly" },
  );
  const [isSaving, setIsSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Currency conversion
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    getExchangeRates()
      .then(setExchangeRates)
      .catch(() => {});
  }, []);

  useEffect(() => {
    CategoryService.getInstance()
      .getAllCategories()
      .then(setAllCategories)
      .catch(() => {});
  }, []);

  if (!expense) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text
          style={{ fontSize: 16, color: colors.textSecondary, marginTop: 12 }}
        >
          Expense not found
        </Text>
      </View>
    );
  }

  const currentGroup = state.groups.find((g) => g.id === selectedGroup);
  const availableMembers = selectedGroup
    ? (currentGroup?.members ?? [])
    : [
        state.currentUser!,
        ...state.friends.filter((f) => f.id !== state.currentUser?.id),
      ];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const togglePanel = (panel: PanelType) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSplitTypeChange = (newType: SplitType) => {
    setSplitType(newType);
    if (newType !== "equal") {
      setCustomSplits(
        selectedMembers.map((userId) => ({
          userId,
          amount: newType === "exact" ? 0 : undefined,
          percentage: newType === "percentage" ? 0 : undefined,
          shares: newType === "shares" ? 1 : undefined,
        })),
      );
    }
  };

  const updateCustomSplit = (
    userId: string,
    field: keyof AdvancedSplit,
    value: number,
  ) => {
    setCustomSplits((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, [field]: value } : s)),
    );
  };

  const validateSplits = (): boolean => {
    if (splitType === "equal") return true;
    const tot = parseFloat(amount);
    if (splitType === "exact") {
      const sum = customSplits.reduce((s, sp) => s + (sp.amount || 0), 0);
      return Math.abs(sum - tot) < 0.01;
    }
    if (splitType === "percentage") {
      const sum = customSplits.reduce((s, sp) => s + (sp.percentage || 0), 0);
      return Math.abs(sum - 100) < 0.01;
    }
    return customSplits.every((sp) => (sp.shares || 0) > 0);
  };

  const handleGetLocation = async () => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Location permission was denied.");
      return;
    }
    try {
      const pos = await ExpoLocation.getCurrentPositionAsync({});
      const geo = await ExpoLocation.reverseGeocodeAsync(pos.coords);
      const address = geo[0]
        ? `${geo[0].street ?? ""} ${geo[0].city ?? ""} ${geo[0].region ?? ""}`.trim()
        : "Current Location";
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        address,
      });
    } catch {
      Alert.alert("Error", "Failed to get location.");
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    if (selectedMembers.length === 0) {
      Alert.alert("Error", "Please select at least one person to split with");
      return;
    }
    if (!validateSplits()) {
      Alert.alert("Error", "Invalid split configuration");
      return;
    }

    const payer = availableMembers.find((m) => m.id === selectedPayer);
    if (!payer) {
      Alert.alert("Error", "Please select who paid");
      return;
    }

    const seen = new Set<string>();
    const splitMembers = availableMembers.filter((m) => {
      if (!selectedMembers.includes(m.id) || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    let splits: AdvancedSplit[];
    if (splitType === "equal") {
      const perPerson = parsedAmount / selectedMembers.length;
      splits = selectedMembers.map((userId) => ({ userId, amount: perPerson }));
    } else {
      splits = customSplits;
    }

    setIsSaving(true);
    try {
      await updateExpense(expenseId, {
        description: description.trim(),
        amount: parsedAmount,
        currency,
        paidBy: payer,
        splitBetween: splitMembers,
        splitType,
        splits,
        category,
        tags,
        location,
        recurring: isRecurring ? recurringConfig : undefined,
      });
      Alert.alert("Saved", "Expense updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to update expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const payerName =
    availableMembers.find((m) => m.id === selectedPayer)?.name ?? "You";

  // ── Chip toolbar ─────────────────────────────────────────────────────────
  const toolbarItems: {
    key: PanelType;
    icon: string;
    label: string;
    value?: string;
    active: boolean;
  }[] = [
    {
      key: "category",
      icon: CategoryService.getInstance().getMetaForCategory(category).icon,
      label: "Category",
      value: category !== "Other" ? category : undefined,
      active: category !== "Other",
    },
    {
      key: "payer",
      icon: "person",
      label: "Paid by",
      value: payerName,
      active: true,
    },
    {
      key: "split",
      icon: "git-branch",
      label: "Split",
      value: splitType !== "equal" ? splitType : "Equal",
      active: selectedMembers.length > 0,
    },
    {
      key: "location",
      icon: "location",
      label: "Location",
      value: location?.address ? location.address.split(" ")[0] : undefined,
      active: !!location,
    },
    {
      key: "tags",
      icon: "pricetags",
      label: "Tags",
      value: tags.length > 0 ? `${tags.length}` : undefined,
      active: tags.length > 0,
    },
    {
      key: "recurring",
      icon: "repeat",
      label: "Recurring",
      value: isRecurring ? recurringConfig.frequency : undefined,
      active: isRecurring,
    },
  ];

  // ── Panel renderers ───────────────────────────────────────────────────────

  const renderCategoryPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Category</Text>
        <TouchableOpacity
          style={styles.panelClose}
          onPress={() => setActivePanel(null)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.categoryGrid}>
        {allCategories.map((cat) => {
          const meta = CategoryService.getInstance().getMetaForCategory(cat);
          const isSelected = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryItem,
                isSelected && styles.categoryItemSelected,
              ]}
              onPress={() => {
                setCategory(cat);
                setActivePanel(null);
              }}
            >
              <View
                style={[
                  styles.categoryIconBg,
                  {
                    backgroundColor: isSelected
                      ? meta.color
                      : `${meta.color}18`,
                  },
                ]}
              >
                <Ionicons
                  name={meta.icon as any}
                  size={20}
                  color={isSelected ? "#fff" : meta.color}
                />
                {isSelected && (
                  <View style={styles.categoryCheck}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  isSelected && styles.categoryLabelSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderPayerPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Who paid?</Text>
        <TouchableOpacity
          style={styles.panelClose}
          onPress={() => setActivePanel(null)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.payerList}>
        {availableMembers.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={[
              styles.payerOption,
              selectedPayer === member.id && styles.payerOptionSelected,
            ]}
            onPress={() => {
              setSelectedPayer(member.id);
              setActivePanel(null);
            }}
          >
            <View style={styles.payerAvatar}>
              <Text style={styles.payerAvatarText}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.payerName}>{member.name}</Text>
            {selectedPayer === member.id && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.primary}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSplitPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Split details</Text>
        <TouchableOpacity
          style={styles.panelClose}
          onPress={() => setActivePanel(null)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.splitTypeRow}>
        {(["equal", "exact", "percentage", "shares"] as SplitType[]).map(
          (type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.splitTypePill,
                splitType === type && styles.splitTypePillSelected,
              ]}
              onPress={() => handleSplitTypeChange(type)}
            >
              <Text
                style={[
                  styles.splitTypePillText,
                  splitType === type && styles.splitTypePillTextSelected,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>
      <View style={styles.memberChipRow}>
        {availableMembers.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={[
              styles.memberChip,
              selectedMembers.includes(member.id) && styles.memberChipSelected,
            ]}
            onPress={() => handleMemberToggle(member.id)}
          >
            <View style={styles.memberChipAvatar}>
              <Text style={styles.memberChipAvatarText}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.memberChipName}>{member.name}</Text>
            {selectedMembers.includes(member.id) && (
              <Ionicons name="checkmark" size={14} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      {splitType !== "equal" &&
        selectedMembers.length > 0 &&
        customSplits.map((split) => {
          const member = availableMembers.find((m) => m.id === split.userId);
          return (
            <View key={split.userId} style={styles.customSplitRow}>
              <Text style={styles.customSplitMember}>{member?.name}</Text>
              <TextInput
                style={styles.customSplitInput}
                value={
                  splitType === "exact"
                    ? (split.amount?.toString() ?? "0")
                    : splitType === "percentage"
                      ? (split.percentage?.toString() ?? "0")
                      : (split.shares?.toString() ?? "1")
                }
                onChangeText={(val) => {
                  const num = parseFloat(val) || 0;
                  const field =
                    splitType === "exact"
                      ? "amount"
                      : splitType === "percentage"
                        ? "percentage"
                        : "shares";
                  updateCustomSplit(split.userId, field, num);
                }}
                keyboardType="numeric"
                placeholder={
                  splitType === "exact"
                    ? "Amount"
                    : splitType === "percentage"
                      ? "%"
                      : "Shares"
                }
                placeholderTextColor="#999"
              />
            </View>
          );
        })}
      {selectedMembers.length > 0 && amount && validateSplits() && (
        <View style={styles.splitPreview}>
          <Text style={styles.splitPreviewTitle}>Preview</Text>
          {splitType === "equal"
            ? selectedMembers.map((userId) => {
                const member = availableMembers.find((m) => m.id === userId);
                return (
                  <View key={userId} style={styles.splitItem}>
                    <Text style={styles.splitMemberName}>{member?.name}</Text>
                    <Text style={styles.splitAmount}>
                      {formatCurrency(
                        parseFloat(amount) / selectedMembers.length,
                        currency,
                      )}
                    </Text>
                  </View>
                );
              })
            : customSplits.map((split) => {
                const member = availableMembers.find(
                  (m) => m.id === split.userId,
                );
                let displayAmount = 0;
                if (splitType === "exact") displayAmount = split.amount ?? 0;
                else if (splitType === "percentage")
                  displayAmount =
                    (parseFloat(amount) * (split.percentage ?? 0)) / 100;
                else if (splitType === "shares") {
                  const total = customSplits.reduce(
                    (s, sp) => s + (sp.shares ?? 0),
                    0,
                  );
                  displayAmount =
                    total > 0
                      ? (parseFloat(amount) * (split.shares ?? 0)) / total
                      : 0;
                }
                return (
                  <View key={split.userId} style={styles.splitItem}>
                    <Text style={styles.splitMemberName}>{member?.name}</Text>
                    <Text style={styles.splitAmount}>
                      {formatCurrency(displayAmount, currency)}
                    </Text>
                  </View>
                );
              })}
        </View>
      )}
    </View>
  );

  const renderLocationPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Location</Text>
        <TouchableOpacity
          style={styles.panelClose}
          onPress={() => setActivePanel(null)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {location ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            backgroundColor: colors.primaryLight,
            borderRadius: 8,
          }}
        >
          <Ionicons name="location" size={18} color={colors.primary} />
          <Text style={{ flex: 1, marginLeft: 8, color: colors.textPrimary }}>
            {location.address}
          </Text>
          <TouchableOpacity onPress={() => setLocation(undefined)}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
          }}
          onPress={handleGetLocation}
        >
          <Ionicons name="locate" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "500" }}>
            Use Current Location
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTagsPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Tags</Text>
        <TouchableOpacity
          style={styles.panelClose}
          onPress={() => setActivePanel(null)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput
          style={[styles.customSplitInput, { flex: 1 }]}
          value={newTag}
          onChangeText={setNewTag}
          placeholder="Add a tag..."
          placeholderTextColor="#999"
          onSubmitEditing={() => {
            if (newTag.trim() && !tags.includes(newTag.trim())) {
              setTags([...tags, newTag.trim()]);
              setNewTag("");
            }
          }}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            padding: 10,
            borderRadius: 8,
          }}
          onPress={() => {
            if (newTag.trim() && !tags.includes(newTag.trim())) {
              setTags([...tags, newTag.trim()]);
              setNewTag("");
            }
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.primaryLight,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 6,
              gap: 4,
            }}
            onPress={() => setTags(tags.filter((t) => t !== tag))}
          >
            <Text style={{ color: colors.primary, fontSize: 13 }}>#{tag}</Text>
            <Ionicons name="close" size={14} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecurringPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Recurring</Text>
        <TouchableOpacity
          style={styles.panelClose}
          onPress={() => setActivePanel(null)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
        <Text style={{ fontSize: 15, color: colors.textPrimary }}>
          {isRecurring ? "Recurring expense" : "One-time expense"}
        </Text>
      </View>
      {isRecurring && (
        <>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginBottom: 8,
            }}
          >
            Frequency
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["weekly", "monthly", "yearly"] as const).map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.splitTypePill,
                  recurringConfig.frequency === freq &&
                    styles.splitTypePillSelected,
                ]}
                onPress={() =>
                  setRecurringConfig((prev) => ({ ...prev, frequency: freq }))
                }
              >
                <Text
                  style={[
                    styles.splitTypePillText,
                    recurringConfig.frequency === freq &&
                      styles.splitTypePillTextSelected,
                  ]}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Hero: description + amount */}
      <View style={[styles.heroSection, { backgroundColor: colors.card }]}>
        <TextInput
          style={[
            styles.descriptionInput,
            { color: colors.textPrimary, borderBottomColor: colors.border },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="What was this expense?"
          placeholderTextColor={colors.textTertiary}
          multiline
        />
        <View style={styles.amountRow}>
          {/* Currency picker */}
          <TouchableOpacity
            style={[
              styles.currencyButton,
              { backgroundColor: colors.primaryLight },
            ]}
            onPress={() => setShowCurrencyModal(true)}
          >
            <Text style={[styles.currencyText, { color: colors.primary }]}>
              {currency}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.amountInput, { color: colors.textPrimary }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Toolbar chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolbar}
        contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 8 }}
      >
        {toolbarItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.toolbarChip,
              item.active && styles.toolbarChipActive,
              activePanel === item.key && styles.toolbarChipActive,
            ]}
            onPress={() => togglePanel(item.key)}
          >
            <Ionicons
              name={item.icon as any}
              size={16}
              color={item.active ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.toolbarChipLabel,
                item.active && styles.toolbarChipLabelActive,
              ]}
            >
              {item.value ?? item.label}
            </Text>
            {activePanel === item.key && (
              <Ionicons name="chevron-up" size={12} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active panel */}
      {activePanel === "category" && renderCategoryPanel()}
      {activePanel === "payer" && renderPayerPanel()}
      {activePanel === "split" && renderSplitPanel()}
      {activePanel === "location" && renderLocationPanel()}
      {activePanel === "tags" && renderTagsPanel()}
      {activePanel === "recurring" && renderRecurringPanel()}

      {/* Save button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            isSaving && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Currency Modal */}
      <Modal visible={showCurrencyModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "60%",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.textPrimary,
                marginBottom: 16,
              }}
            >
              Select Currency
            </Text>
            <ScrollView>
              {CURRENCIES.map((cur) => (
                <TouchableOpacity
                  key={cur.code}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                    gap: 12,
                  }}
                  onPress={() => {
                    setCurrency(cur.code);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{cur.symbol}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        color: colors.textPrimary,
                        fontWeight: "500",
                      }}
                    >
                      {cur.code}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {cur.name}
                    </Text>
                  </View>
                  {currency === cur.code && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 10,
                backgroundColor: colors.background,
                alignItems: "center",
              }}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
