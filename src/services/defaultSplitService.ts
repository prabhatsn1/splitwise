import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultSplitTemplate, SplitType, AdvancedSplit } from "../types";

const STORAGE_KEY = "@splitwise_default_splits";

class DefaultSplitService {
  private static instance: DefaultSplitService;

  private constructor() {}

  static getInstance(): DefaultSplitService {
    if (!DefaultSplitService.instance) {
      DefaultSplitService.instance = new DefaultSplitService();
    }
    return DefaultSplitService.instance;
  }

  async getTemplates(groupId?: string): Promise<DefaultSplitTemplate[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const templates: DefaultSplitTemplate[] = data ? JSON.parse(data) : [];
      if (groupId) {
        return templates.filter((t) => t.groupId === groupId || !t.groupId);
      }
      return templates;
    } catch (error) {
      console.error("Failed to load default split templates:", error);
      return [];
    }
  }

  async saveTemplate(
    name: string,
    splitType: SplitType,
    splits: AdvancedSplit[],
    groupId?: string,
  ): Promise<DefaultSplitTemplate> {
    const template: DefaultSplitTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      groupId,
      splitType,
      splits,
      createdAt: new Date(),
    };

    const existing = await this.getAll();
    existing.push(template);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const existing = await this.getAll();
    const filtered = existing.filter((t) => t.id !== templateId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  private async getAll(): Promise<DefaultSplitTemplate[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}

export default DefaultSplitService;
