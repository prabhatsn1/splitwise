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
  Image,
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
  User,
  Expense,
  SplitType,
  AdvancedSplit,
  Location,
  RecurringConfig,
  ExpenseItem,
  DefaultSplitTemplate,
} from "../types";
import { styles } from "../styles/screens/AddExpenseScreen.styles";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import ReceiptCamera from "../components/ReceiptCamera";
import {
  CURRENCIES,
  Currency,
  formatCurrency,
  convertCurrency,
  formatWithConversion,
  getExchangeRates,
} from "../services/currencyService";
import { parseReceipt } from "../services/ocrService";
import DefaultSplitService from "../services/defaultSplitService";

type AddExpenseNavigationProp = StackNavigationProp<
  RootStackParamList,
  "AddExpense"
>;
type AddExpenseRouteProp = RouteProp<RootStackParamList, "AddExpense">;

const CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Shopping",
  "Travel",
  "Other",
] as const;

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Food: { icon: "restaurant", color: "#FF6B6B" },
  Transport: { icon: "car", color: "#4ECDC4" },
  Entertainment: { icon: "film", color: "#A78BFA" },
  Bills: { icon: "receipt", color: "#F59E0B" },
  Shopping: { icon: "cart", color: "#EC4899" },
  Travel: { icon: "airplane", color: "#3B82F6" },
  Other: { icon: "ellipsis-horizontal", color: "#6B7280" },
};

const SUGGESTED_TAGS = [
  "dinner",
  "lunch",
  "groceries",
  "rent",
  "utilities",
  "drinks",
  "trip",
  "office",
  "gas",
  "subscription",
];

type PanelType =
  | "category"
  | "payer"
  | "split"
  | "receipt"
  | "location"
  | "tags"
  | "recurring"
  | "items"
  | null;

export default function AddExpenseScreen() {
  const navigation = useNavigation<AddExpenseNavigationProp>();
  const route = useRoute<AddExpenseRouteProp>();
  const { state, createExpense } = useApp();
  const { colors } = useTheme();

  // Basic expense fields
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(
    route.params?.groupId || "",
  );
  const [selectedPayer, setSelectedPayer] = useState(
    state.currentUser?.id || "",
  );
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Enhanced features
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("Other");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [receipt, setReceipt] = useState<string>("");
  const [location, setLocation] = useState<Location | undefined>();
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({
    frequency: "monthly",
  });

  // Multi-currency
  const [currency, setCurrency] = useState<string>("INR");
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // OCR
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Split configuration
  const [customSplits, setCustomSplits] = useState<AdvancedSplit[]>([]);

  // UI state — which panel is expanded
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);

  // Itemization
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");

  // Default splits
  const [savedTemplates, setSavedTemplates] = useState<DefaultSplitTemplate[]>(
    [],
  );
  const [templateName, setTemplateName] = useState("");

  // Currency conversion
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(
    {},
  );
  const defaultCurrency = "INR"; // User's default currency

  const currentGroup = state.groups.find((g) => g.id === selectedGroup);
  const availableMembers = selectedGroup
    ? currentGroup?.members || []
    : [
        state.currentUser!,
        ...state.friends.filter((f) => f.id !== state.currentUser?.id),
      ];

  React.useEffect(() => {
    if (selectedGroup && currentGroup) {
      setSelectedMembers(currentGroup.members.map((m) => m.id));
    }
  }, [selectedGroup, currentGroup]);

  // Load exchange rates
  useEffect(() => {
    getExchangeRates()
      .then(setExchangeRates)
      .catch(() => {});
  }, []);

  // Load saved split templates
  useEffect(() => {
    DefaultSplitService.getInstance()
      .getTemplates(selectedGroup || undefined)
      .then(setSavedTemplates)
      .catch(() => {});
  }, [selectedGroup]);

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

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission required",
        "Permission to access camera roll is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setReceipt(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleGetLocation = async () => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "Permission to access location was denied",
      );
      return;
    }

    try {
      const currentLocation = await ExpoLocation.getCurrentPositionAsync({});
      const reverseGeocode = await ExpoLocation.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const address = reverseGeocode[0]
        ? `${reverseGeocode[0].street || ""} ${reverseGeocode[0].city || ""} ${
            reverseGeocode[0].region || ""
          }`.trim()
        : "Current Location";

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to get current location");
    }
  };

  const handleSplitTypeChange = (newSplitType: SplitType) => {
    setSplitType(newSplitType);
    if (newSplitType !== "equal") {
      setCustomSplits(
        selectedMembers.map((userId) => ({
          userId,
          amount: newSplitType === "exact" ? 0 : undefined,
          percentage: newSplitType === "percentage" ? 0 : undefined,
          shares: newSplitType === "shares" ? 1 : undefined,
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
      prev.map((split) =>
        split.userId === userId ? { ...split, [field]: value } : split,
      ),
    );
  };

  const validateSplits = (): boolean => {
    if (splitType === "equal") return true;
    const totalAmount = parseFloat(amount);
    if (splitType === "exact") {
      const total = customSplits.reduce(
        (sum, split) => sum + (split.amount || 0),
        0,
      );
      return Math.abs(total - totalAmount) < 0.01;
    }
    if (splitType === "percentage") {
      const total = customSplits.reduce(
        (sum, split) => sum + (split.percentage || 0),
        0,
      );
      return Math.abs(total - 100) < 0.01;
    }
    if (splitType === "shares") {
      return customSplits.every((split) => (split.shares || 0) > 0);
    }
    return true;
  };

  // ── Item management ──
  const handleAddItem = () => {
    const price = parseFloat(newItemPrice);
    const qty = parseInt(newItemQty, 10) || 1;
    if (!newItemName.trim() || isNaN(price) || price <= 0) {
      Alert.alert("Error", "Enter a valid item name and price");
      return;
    }
    const item: ExpenseItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newItemName.trim(),
      price,
      quantity: qty,
    };
    setItems((prev) => [...prev, item]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty("1");
    // Auto-update total amount from items
    const newTotal = [...items, item].reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    setAmount(newTotal.toFixed(2));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== itemId);
      const newTotal = updated.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0,
      );
      if (updated.length > 0) {
        setAmount(newTotal.toFixed(2));
      }
      return updated;
    });
  };

  const handleUpdateItemQuantity = (itemId: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.id === itemId ? { ...i, quantity: qty } : i,
      );
      const newTotal = updated.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0,
      );
      setAmount(newTotal.toFixed(2));
      return updated;
    });
  };

  // ── Default split templates ──
  const handleSaveSplitTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert("Error", "Enter a name for this split template");
      return;
    }
    try {
      await DefaultSplitService.getInstance().saveTemplate(
        templateName.trim(),
        splitType,
        splitType === "equal"
          ? selectedMembers.map((id) => ({ userId: id }))
          : customSplits,
        selectedGroup || undefined,
      );
      const templates = await DefaultSplitService.getInstance().getTemplates(
        selectedGroup || undefined,
      );
      setSavedTemplates(templates);
      setTemplateName("");
      Alert.alert("Saved", "Split template saved successfully");
    } catch {
      Alert.alert("Error", "Failed to save template");
    }
  };

  const handleLoadSplitTemplate = (template: DefaultSplitTemplate) => {
    setSplitType(template.splitType);
    const memberIds = template.splits.map((s) => s.userId);
    const validIds = memberIds.filter((id) =>
      availableMembers.some((m) => m.id === id),
    );
    setSelectedMembers(validIds);
    if (template.splitType !== "equal") {
      setCustomSplits(
        template.splits.filter((s) => validIds.includes(s.userId)),
      );
    }
    Alert.alert("Loaded", `Applied "${template.name}" split template`);
  };

  const handleDeleteSplitTemplate = async (templateId: string) => {
    try {
      await DefaultSplitService.getInstance().deleteTemplate(templateId);
      setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch {
      Alert.alert("Error", "Failed to delete template");
    }
  };

  const handleSaveExpense = async () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
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
    const seen = new Set<string>();
    const splitMembers = availableMembers.filter((m) => {
      if (!selectedMembers.includes(m.id) || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    if (!payer) {
      Alert.alert("Error", "Please select who paid");
      return;
    }

    const expenseAmount = parseFloat(amount);
    let splits: AdvancedSplit[];
    if (splitType === "equal") {
      const splitAmount = expenseAmount / selectedMembers.length;
      splits = selectedMembers.map((userId) => ({
        userId,
        amount: splitAmount,
      }));
    } else {
      splits = customSplits;
    }

    const newExpenseData: Omit<Expense, "id"> = {
      description: description.trim(),
      amount: expenseAmount,
      currency,
      paidBy: payer,
      splitBetween: splitMembers,
      splitType,
      splits,
      category,
      date: new Date(),
      groupId: selectedGroup || undefined,
      receipt: receipt || undefined,
      location,
      recurring: isRecurring ? recurringConfig : undefined,
      tags,
      items: items.length > 0 ? items : undefined,
    };

    try {
      await createExpense(newExpenseData);
      Alert.alert("Success", "Expense added successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to add expense. Please try again.");
    }
  };

  const handleCaptureReceipt = async (imageUri: string) => {
    setReceipt(imageUri);
    await handleOcrScan(imageUri);
  };

  const handleOcrScan = async (imageUri: string) => {
    setIsOcrProcessing(true);
    try {
      const result = await parseReceipt(imageUri);
      let prefilled: string[] = [];
      if (result.amount !== null && result.amount > 0) {
        setAmount(result.amount.toFixed(2));
        prefilled.push(`Amount: ${result.amount.toFixed(2)}`);
      }
      if (result.description) {
        setDescription(result.description);
        prefilled.push(`Description: ${result.description}`);
      }
      if (result.items && result.items.length > 0) {
        setItems(result.items);
        prefilled.push(`Items: ${result.items.length} found`);
        // Recalculate total from items
        const itemTotal = result.items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0,
        );
        if (itemTotal > 0) {
          setAmount(itemTotal.toFixed(2));
        }
      }
      if (result.detectedCurrency) {
        setCurrency(result.detectedCurrency);
        prefilled.push(`Currency: ${result.detectedCurrency}`);
      }
      if (prefilled.length > 0) {
        Alert.alert(
          "Receipt Scanned",
          `Pre-filled from receipt:\n${prefilled.join("\n")}`,
        );
      } else {
        Alert.alert(
          "OCR Result",
          "Could not extract details from the receipt. Please fill in manually.",
        );
      }
    } catch (error) {
      Alert.alert("OCR Error", "Failed to process receipt image.");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceipt("");
  };

  // ── Helper: get the payer's display name ──
  const payerName =
    availableMembers.find((m) => m.id === selectedPayer)?.name || "You";

  // ── Toolbar chip data ──
  const toolbarItems: {
    key: PanelType;
    icon: string;
    label: string;
    value?: string;
    active: boolean;
  }[] = [
    {
      key: "category",
      icon: CATEGORY_META[category]?.icon || "grid",
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
      key: "receipt",
      icon: "camera",
      label: "Receipt",
      value: receipt ? "Attached" : undefined,
      active: !!receipt,
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
    {
      key: "items",
      icon: "list",
      label: "Items",
      value: items.length > 0 ? `${items.length}` : undefined,
      active: items.length > 0,
    },
  ];

  // ── Render individual panels ──

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
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
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

      {/* Split type pills */}
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

      {/* Member chips */}
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

      {/* Custom split inputs */}
      {splitType !== "equal" && selectedMembers.length > 0 && (
        <>
          {customSplits.map((split) => {
            const member = availableMembers.find((m) => m.id === split.userId);
            return (
              <View key={split.userId} style={styles.customSplitRow}>
                <Text style={styles.customSplitMember}>{member?.name}</Text>
                <TextInput
                  style={styles.customSplitInput}
                  value={
                    splitType === "exact"
                      ? split.amount?.toString() || "0"
                      : splitType === "percentage"
                        ? split.percentage?.toString() || "0"
                        : split.shares?.toString() || "1"
                  }
                  onChangeText={(value) => {
                    const numValue = parseFloat(value) || 0;
                    const field =
                      splitType === "exact"
                        ? "amount"
                        : splitType === "percentage"
                          ? "percentage"
                          : "shares";
                    updateCustomSplit(split.userId, field, numValue);
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
        </>
      )}

      {/* Split preview */}
      {selectedMembers.length > 0 && amount && validateSplits() && (
        <View style={styles.splitPreview}>
          <Text style={styles.splitPreviewTitle}>Preview</Text>
          {splitType === "equal"
            ? selectedMembers.map((userId) => {
                const member = availableMembers.find((m) => m.id === userId);
                const splitAmount = parseFloat(amount) / selectedMembers.length;
                return (
                  <View key={userId} style={styles.splitItem}>
                    <Text style={styles.splitMemberName}>{member?.name}</Text>
                    <Text style={styles.splitAmount}>
                      {formatCurrency(splitAmount, currency)}
                    </Text>
                  </View>
                );
              })
            : customSplits.map((split) => {
                const member = availableMembers.find(
                  (m) => m.id === split.userId,
                );
                let displayAmount = 0;
                if (splitType === "exact") {
                  displayAmount = split.amount || 0;
                } else if (splitType === "percentage") {
                  displayAmount =
                    (parseFloat(amount) * (split.percentage || 0)) / 100;
                } else if (splitType === "shares") {
                  const totalShares = customSplits.reduce(
                    (sum, s) => sum + (s.shares || 0),
                    0,
                  );
                  displayAmount =
                    totalShares > 0
                      ? (parseFloat(amount) * (split.shares || 0)) / totalShares
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

      {/* ── Save / Load Default Splits ── */}
      {selectedMembers.length > 0 && (
        <View style={styles.splitPreview}>
          <Text style={styles.splitPreviewTitle}>Default Split Templates</Text>

          {/* Saved templates */}
          {savedTemplates.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              {savedTemplates.map((tpl) => (
                <View
                  key={tpl.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f0f0f0",
                  }}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => handleLoadSplitTemplate(tpl)}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.primary,
                        fontWeight: "500",
                      }}
                    >
                      {tpl.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#999" }}>
                      {tpl.splitType} · {tpl.splits.length} members
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSplitTemplate(tpl.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Save current as template */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <TextInput
              style={styles.customSplitInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name..."
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              onPress={handleSaveSplitTemplate}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderReceiptPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Receipt</Text>
        <TouchableOpacity
          style={styles.panelClose}
          onPress={() => setActivePanel(null)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {receipt ? (
        <View style={styles.receiptPreview}>
          <Image source={{ uri: receipt }} style={styles.receiptImage} />
          {isOcrProcessing && (
            <View style={styles.ocrRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.ocrText}>Scanning receipt...</Text>
            </View>
          )}
          <View style={styles.receiptActions}>
            <TouchableOpacity
              style={styles.receiptActionButton}
              onPress={() => handleOcrScan(receipt)}
              disabled={isOcrProcessing}
            >
              <Ionicons name="scan" size={16} color={colors.primary} />
              <Text style={styles.receiptActionText}>Re-scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.receiptActionButton}
              onPress={() => setShowReceiptCamera(true)}
            >
              <Ionicons name="camera" size={16} color={colors.primary} />
              <Text style={styles.receiptActionText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.receiptActionButton}
              onPress={handleRemoveReceipt}
            >
              <Ionicons name="trash" size={16} color="#ff6b6b" />
              <Text style={[styles.receiptActionText, { color: "#ff6b6b" }]}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.receiptOptions}>
          <TouchableOpacity
            style={styles.receiptOptionButton}
            onPress={() => setShowReceiptCamera(true)}
          >
            <Ionicons name="camera" size={22} color={colors.primary} />
            <Text style={styles.receiptOptionText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.receiptOptionButton}
            onPress={handlePickImage}
          >
            <Ionicons name="images" size={22} color={colors.primary} />
            <Text style={styles.receiptOptionText}>Gallery</Text>
          </TouchableOpacity>
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
      <TouchableOpacity
        style={styles.locationContent}
        onPress={handleGetLocation}
      >
        <Ionicons name="navigate" size={22} color={colors.primary} />
        <Text style={styles.locationText}>
          {location ? location.address : "Tap to get current location"}
        </Text>
        {location && (
          <TouchableOpacity onPress={() => setLocation(undefined)}>
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderTagsPanel = () => {
    const unusedSuggestions = SUGGESTED_TAGS.filter((s) => !tags.includes(s));
    return (
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

        {/* Active tags */}
        {tags.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionTitle}>Active</Text>
            <View style={styles.tagContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Ionicons name="pricetag" size={12} color="#fff" />
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Suggestions */}
        {unusedSuggestions.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionTitle}>Suggestions</Text>
            <View style={styles.tagContainer}>
              {unusedSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.tagSuggestion}
                  onPress={() => {
                    if (!tags.includes(suggestion)) {
                      setTags([...tags, suggestion]);
                    }
                  }}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={styles.tagSuggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Custom input */}
        <View style={styles.tagInputRow}>
          <View style={styles.tagInputWrapper}>
            <Ionicons name="pricetag-outline" size={16} color="#999" />
            <TextInput
              style={styles.tagInput}
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Add custom tag..."
              placeholderTextColor="#999"
              onSubmitEditing={handleAddTag}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.tagAddButton,
              !newTag.trim() && styles.tagAddButtonDisabled,
            ]}
            onPress={handleAddTag}
            disabled={!newTag.trim()}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
      <View style={styles.recurringRow}>
        <Text style={styles.recurringLabel}>Enable recurring</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: "#e1e1e1", true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
      {isRecurring && (
        <View style={styles.frequencyRow}>
          {(["weekly", "monthly", "yearly"] as const).map((freq) => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.frequencyPill,
                recurringConfig.frequency === freq &&
                  styles.frequencyPillSelected,
              ]}
              onPress={() =>
                setRecurringConfig((prev) => ({ ...prev, frequency: freq }))
              }
            >
              <Text
                style={[
                  styles.frequencyPillText,
                  recurringConfig.frequency === freq &&
                    styles.frequencyPillTextSelected,
                ]}
              >
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderItemsPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Line Items</Text>
        <TouchableOpacity
          style={styles.panelClose}
          onPress={() => setActivePanel(null)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Existing items */}
      {items.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          {items.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#f0f0f0",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#333",
                    fontWeight: "500",
                  }}
                >
                  {item.name}
                </Text>
                <Text style={{ fontSize: 12, color: "#888" }}>
                  {formatCurrency(item.price, currency)} × {item.quantity} ={" "}
                  {formatCurrency(item.price * item.quantity, currency)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    handleUpdateItemQuantity(item.id, item.quantity - 1)
                  }
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
                <Text style={{ fontSize: 14, fontWeight: "600" }}>
                  {item.quantity}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    handleUpdateItemQuantity(item.id, item.quantity + 1)
                  }
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingTop: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
              Total from items
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.primary,
              }}
            >
              {formatCurrency(
                items.reduce((s, i) => s + i.price * i.quantity, 0),
                currency,
              )}
            </Text>
          </View>
        </View>
      )}

      {/* Add new item */}
      <View style={{ gap: 8 }}>
        <TextInput
          style={styles.customSplitInput}
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder="Item name"
          placeholderTextColor="#999"
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[styles.customSplitInput, { flex: 1 }]}
            value={newItemPrice}
            onChangeText={setNewItemPrice}
            placeholder="Price"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.customSplitInput, { width: 60 }]}
            value={newItemQty}
            onChangeText={setNewItemQty}
            placeholder="Qty"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingHorizontal: 14,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={handleAddItem}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const panelRenderers: Record<string, () => React.JSX.Element> = {
    category: renderCategoryPanel,
    payer: renderPayerPanel,
    split: renderSplitPanel,
    receipt: renderReceiptPanel,
    location: renderLocationPanel,
    tags: renderTagsPanel,
    recurring: renderRecurringPanel,
    items: renderItemsPanel,
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── Hero: description + amount ── */}
      <View style={styles.heroSection}>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="What was it for?"
          placeholderTextColor="#bbb"
        />
        <View style={styles.amountRow}>
          <TouchableOpacity
            style={styles.currencyButton}
            onPress={() => setShowCurrencyModal(true)}
          >
            <Text style={styles.currencyText}>
              {CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor="#ccc"
          />
        </View>
        {/* Currency conversion preview */}
        {currency !== defaultCurrency && amount && parseFloat(amount) > 0 && (
          <Text
            style={{
              fontSize: 13,
              color: "#888",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            ≈{" "}
            {formatWithConversion(
              parseFloat(amount),
              currency,
              defaultCurrency,
              exchangeRates,
            )}
          </Text>
        )}
      </View>

      {/* ── Group selector ── */}
      {state.groups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupStrip}
        >
          <TouchableOpacity
            style={[
              styles.groupPill,
              !selectedGroup && styles.groupPillSelected,
            ]}
            onPress={() => setSelectedGroup("")}
          >
            <Ionicons
              name="person"
              size={14}
              color={!selectedGroup ? "#fff" : colors.textSecondary}
            />
            <Text
              style={[
                styles.groupPillText,
                !selectedGroup && styles.groupPillTextSelected,
              ]}
            >
              Personal
            </Text>
          </TouchableOpacity>
          {state.groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupPill,
                selectedGroup === group.id && styles.groupPillSelected,
              ]}
              onPress={() => setSelectedGroup(group.id)}
            >
              <Ionicons
                name="people"
                size={14}
                color={
                  selectedGroup === group.id ? "#fff" : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.groupPillText,
                  selectedGroup === group.id && styles.groupPillTextSelected,
                ]}
              >
                {group.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Icon toolbar ── */}
      <View style={styles.toolbarContainer}>
        <View style={styles.toolbar}>
          {toolbarItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.toolbarChip,
                (activePanel === item.key || item.active) &&
                  styles.toolbarChipActive,
              ]}
              onPress={() => togglePanel(item.key)}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={
                  activePanel === item.key || item.active
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.toolbarChipLabel,
                  (activePanel === item.key || item.active) &&
                    styles.toolbarChipLabelActive,
                ]}
              >
                {item.label}
              </Text>
              {item.value && (
                <Text style={styles.toolbarChipValue} numberOfLines={1}>
                  · {item.value}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Active panel ── */}
      {activePanel && (
        <View style={styles.panelContainer}>
          {panelRenderers[activePanel]?.()}
        </View>
      )}

      {/* ── Save ── */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveExpense}>
          <Text style={styles.saveButtonText}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* ── Currency Modal ── */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Currency</Text>
            <ScrollView>
              {CURRENCIES.map((cur) => (
                <TouchableOpacity
                  key={cur.code}
                  style={styles.modalOption}
                  onPress={() => {
                    setCurrency(cur.code);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {cur.symbol} {cur.code} — {cur.name}
                  </Text>
                  {currency === cur.code && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ReceiptCamera
        visible={showReceiptCamera}
        onClose={() => setShowReceiptCamera(false)}
        onCapture={handleCaptureReceipt}
      />
    </ScrollView>
  );
}
