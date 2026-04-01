import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@splitwise_custom_categories";

export const BUILTIN_CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Shopping",
  "Travel",
  "Other",
] as const;

export type BuiltinCategory = (typeof BUILTIN_CATEGORIES)[number];

export const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Food: { icon: "restaurant", color: "#FF6B6B" },
  Transport: { icon: "car", color: "#4ECDC4" },
  Entertainment: { icon: "film", color: "#A78BFA" },
  Bills: { icon: "receipt", color: "#F59E0B" },
  Shopping: { icon: "cart", color: "#EC4899" },
  Travel: { icon: "airplane", color: "#3B82F6" },
  Other: { icon: "ellipsis-horizontal", color: "#6B7280" },
};

class CategoryService {
  private static instance: CategoryService;

  static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  async getCustomCategories(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async getAllCategories(): Promise<string[]> {
    const custom = await this.getCustomCategories();
    return [...BUILTIN_CATEGORIES, ...custom];
  }

  async addCategory(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Category name cannot be empty");
    if (BUILTIN_CATEGORIES.includes(trimmed as BuiltinCategory)) {
      throw new Error("This is already a built-in category");
    }
    const existing = await this.getCustomCategories();
    if (existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("Category already exists");
    }
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...existing, trimmed]),
    );
  }

  async removeCategory(name: string): Promise<void> {
    const existing = await this.getCustomCategories();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(existing.filter((c) => c !== name)),
    );
  }

  getMetaForCategory(category: string): { icon: string; color: string } {
    return CATEGORY_META[category] ?? { icon: "pricetag", color: "#8B5CF6" };
  }
}

export default CategoryService;
