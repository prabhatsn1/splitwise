import React, { useState } from "react";
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
} from "../services/currencyService";
import { parseReceipt } from "../services/ocrService";

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

  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);

  const currentGroup = state.groups.find((g) => g.id === selectedGroup);
  const availableMembers = selectedGroup
    ? currentGroup?.members || []
    : [state.currentUser!, ...state.friends];

  React.useEffect(() => {
    if (selectedGroup && currentGroup) {
      setSelectedMembers(currentGroup.members.map((m) => m.id));
    }
  }, [selectedGroup, currentGroup]);

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
    // Initialize custom splits based on selected members
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
    const splitMembers = availableMembers.filter((m) =>
      selectedMembers.includes(m.id),
    );

    if (!payer) {
      Alert.alert("Error", "Please select who paid");
      return;
    }

    const expenseAmount = parseFloat(amount);

    // Prepare splits based on split type
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
    };

    try {
      if (isRecurring) {
        // Use the enhanced service method for recurring expenses
        await createExpense(newExpenseData);
      } else {
        await createExpense(newExpenseData);
      }

      Alert.alert("Success", "Expense added successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to add expense. Please try again.");
    }
  };

  const handleCaptureReceipt = async (imageUri: string) => {
    setReceipt(imageUri);
    // Automatically run OCR on captured receipt
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

      if (prefilled.length > 0) {
        Alert.alert(
          "Receipt Scanned",
          `Pre-filled from receipt:\n${prefilled.join("\n")}`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "OCR Result",
          "Could not extract amount or description from the receipt. Please fill in manually.",
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter expense description"
            placeholderTextColor="#999"
          />
        </View>

        {/* Amount + Currency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.backgroundLight,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={() => setShowCurrencyModal(true)}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textPrimary,
                  fontWeight: "600",
                }}
              >
                {CURRENCIES.find((c) => c.code === currency)?.symbol ??
                  currency}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.textSecondary}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.categoryButtonText}>{category}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagContainer}>
            {tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
                <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Add tag"
              placeholderTextColor="#999"
              onSubmitEditing={handleAddTag}
            />
            <TouchableOpacity
              style={styles.addTagButton}
              onPress={handleAddTag}
            >
              <Ionicons name="add" size={20} color="#5bc5a7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Receipt */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Receipt (Optional)</Text>
          {receipt ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receipt }} style={styles.receiptImage} />
              {isOcrProcessing && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: colors.textSecondary,
                    }}
                  >
                    Scanning receipt with OCR...
                  </Text>
                </View>
              )}
              <View style={styles.receiptActions}>
                <TouchableOpacity
                  style={styles.receiptActionButton}
                  onPress={() => handleOcrScan(receipt)}
                  disabled={isOcrProcessing}
                >
                  <Ionicons name="scan" size={16} color={colors.primary} />
                  <Text style={styles.receiptActionText}>Re-scan OCR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.receiptActionButton}
                  onPress={() => setShowReceiptCamera(true)}
                >
                  <Ionicons name="camera" size={16} color="#5bc5a7" />
                  <Text style={styles.receiptActionText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.receiptActionButton}
                  onPress={handleRemoveReceipt}
                >
                  <Ionicons name="trash" size={16} color="#ff6b6b" />
                  <Text
                    style={[styles.receiptActionText, { color: "#ff6b6b" }]}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={() => setShowReceiptCamera(true)}
            >
              <Ionicons name="camera" size={20} color="#5bc5a7" />
              <Text style={styles.receiptButtonText}>Capture Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location (Optional)</Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleGetLocation}
          >
            <Ionicons name="location" size={20} color="#5bc5a7" />
            <Text style={styles.locationButtonText}>
              {location ? location.address : "Add Location"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recurring Expense */}
        <View style={styles.inputGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Recurring Expense</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: "#e1e1e1", true: "#5bc5a7" }}
              thumbColor={isRecurring ? "#fff" : "#f4f3f4"}
            />
          </View>
          {isRecurring && (
            <TouchableOpacity
              style={styles.recurringButton}
              onPress={() => setShowRecurringModal(true)}
            >
              <Text style={styles.recurringButtonText}>
                {recurringConfig.frequency}
                {recurringConfig.endDate &&
                  ` until ${recurringConfig.endDate.toDateString()}`}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Group Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group (Optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.groupSelector}
          >
            <TouchableOpacity
              style={[
                styles.groupOption,
                !selectedGroup && styles.selectedGroupOption,
              ]}
              onPress={() => setSelectedGroup("")}
            >
              <Text
                style={[
                  styles.groupOptionText,
                  !selectedGroup && styles.selectedGroupOptionText,
                ]}
              >
                Personal
              </Text>
            </TouchableOpacity>
            {state.groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupOption,
                  selectedGroup === group.id && styles.selectedGroupOption,
                ]}
                onPress={() => setSelectedGroup(group.id)}
              >
                <Text
                  style={[
                    styles.groupOptionText,
                    selectedGroup === group.id &&
                      styles.selectedGroupOptionText,
                  ]}
                >
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Who Paid */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Who paid?</Text>
          <View style={styles.memberList}>
            {availableMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberOption,
                  selectedPayer === member.id && styles.selectedMemberOption,
                ]}
                onPress={() => setSelectedPayer(member.id)}
              >
                <View style={styles.memberInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberName}>{member.name}</Text>
                </View>
                {selectedPayer === member.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#5bc5a7" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Split Between */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Split between</Text>
          <View style={styles.memberList}>
            {availableMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberOption,
                  selectedMembers.includes(member.id) &&
                    styles.selectedMemberOption,
                ]}
                onPress={() => handleMemberToggle(member.id)}
              >
                <View style={styles.memberInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberName}>{member.name}</Text>
                </View>
                {selectedMembers.includes(member.id) && (
                  <Ionicons name="checkmark-circle" size={20} color="#5bc5a7" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Split Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Split Type</Text>
          <View style={styles.splitTypeContainer}>
            {(["equal", "exact", "percentage", "shares"] as SplitType[]).map(
              (type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.splitTypeOption,
                    splitType === type && styles.selectedSplitTypeOption,
                  ]}
                  onPress={() => handleSplitTypeChange(type)}
                >
                  <Text
                    style={[
                      styles.splitTypeText,
                      splitType === type && styles.selectedSplitTypeText,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>

        {/* Custom Split Configuration */}
        {splitType !== "equal" && selectedMembers.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Configure Splits</Text>
            {customSplits.map((split) => {
              const member = availableMembers.find(
                (m) => m.id === split.userId,
              );
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
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Split Preview */}
        {selectedMembers.length > 0 && amount && validateSplits() && (
          <View style={styles.splitPreview}>
            <Text style={styles.label}>Split preview</Text>
            {splitType === "equal"
              ? selectedMembers.map((userId) => {
                  const member = availableMembers.find((m) => m.id === userId);
                  const splitAmount =
                    parseFloat(amount) / selectedMembers.length;
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
                        ? (parseFloat(amount) * (split.shares || 0)) /
                          totalShares
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

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveExpense}>
        <Text style={styles.saveButtonText}>Save Expense</Text>
      </TouchableOpacity>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.modalOption}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{cat}</Text>
                {category === cat && (
                  <Ionicons name="checkmark" size={20} color="#5bc5a7" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Recurring Modal */}
      <Modal
        visible={showRecurringModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecurringModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recurring Configuration</Text>

            <Text style={styles.modalSubtitle}>Frequency</Text>
            {(["weekly", "monthly", "yearly"] as const).map((freq) => (
              <TouchableOpacity
                key={freq}
                style={styles.modalOption}
                onPress={() =>
                  setRecurringConfig((prev) => ({ ...prev, frequency: freq }))
                }
              >
                <Text style={styles.modalOptionText}>
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
                {recurringConfig.frequency === freq && (
                  <Ionicons name="checkmark" size={20} color="#5bc5a7" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowRecurringModal(false)}
            >
              <Text style={styles.modalSaveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
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
                    <Ionicons name="checkmark" size={20} color="#5bc5a7" />
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
