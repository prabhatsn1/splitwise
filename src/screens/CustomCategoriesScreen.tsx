import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import CategoryService, {
  BUILTIN_CATEGORIES,
} from "../services/categoryService";

export default function CustomCategoriesScreen() {
  const { colors } = useTheme();
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const service = CategoryService.getInstance();

  const load = useCallback(async () => {
    const cats = await service.getCustomCategories();
    setCustomCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await service.addCategory(trimmed);
      setNewName("");
      await load();
    } catch (e: any) {
      Alert.alert("Cannot Add", e.message ?? "Failed to add category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (name: string) => {
    Alert.alert(
      "Delete Category",
      `Remove "${name}"? Existing expenses will keep this category label.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await service.removeCategory(name);
            await load();
          },
        },
      ],
    );
  };

  const renderBuiltin = ({ item }: { item: string }) => {
    const meta = service.getMetaForCategory(item);
    return (
      <View style={[styles.row, { backgroundColor: colors.card }]}>
        <View style={[styles.iconBg, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
          {item}
        </Text>
        <View
          style={[styles.builtinBadge, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.builtinText, { color: colors.textTertiary }]}>
            Built-in
          </Text>
        </View>
      </View>
    );
  };

  const renderCustom = ({ item }: { item: string }) => {
    const meta = service.getMetaForCategory(item);
    return (
      <View style={[styles.row, { backgroundColor: colors.card }]}>
        <View style={[styles.iconBg, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
          {item}
        </Text>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Add new category */}
      <View
        style={[
          styles.addSection,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Add Custom Category
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Health, Gym, Pets..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            maxLength={30}
          />
          <TouchableOpacity
            style={[
              styles.addBtn,
              { backgroundColor: colors.primary },
              (saving || !newName.trim()) && { opacity: 0.5 },
            ]}
            onPress={handleAdd}
            disabled={saving || !newName.trim()}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="add" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          size="large"
          color={colors.primary}
        />
      ) : (
        <FlatList
          data={[...BUILTIN_CATEGORIES]}
          keyExtractor={(item) => `builtin-${item}`}
          renderItem={renderBuiltin}
          ListHeaderComponent={
            <Text style={[styles.groupHeader, { color: colors.textTertiary }]}>
              BUILT-IN ({BUILTIN_CATEGORIES.length})
            </Text>
          }
          ListFooterComponent={
            <>
              <Text
                style={[styles.groupHeader, { color: colors.textTertiary }]}
              >
                CUSTOM ({customCategories.length})
              </Text>
              {customCategories.length === 0 ? (
                <View style={styles.emptyCustom}>
                  <Ionicons
                    name="pricetag-outline"
                    size={36}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.textTertiary }]}
                  >
                    No custom categories yet
                  </Text>
                </View>
              ) : (
                customCategories.map((cat) => (
                  <View key={`custom-${cat}`}>
                    {renderCustom({ item: cat })}
                  </View>
                ))
              )}
            </>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addSection: {
    padding: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  inputRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    gap: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  builtinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  builtinText: { fontSize: 11, fontWeight: "600" },
  emptyCustom: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13 },
});
