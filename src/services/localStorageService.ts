import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, Group, Expense, Balance, Settlement } from "../types";

interface LocalData {
  currentUser: User | null;
  groups: Group[];
  expenses: Expense[];
  friends: User[];
  balances: Balance[];
  settlements: Settlement[];
  lastSyncDate: string | null;
}

class LocalStorageService {
  private static instance: LocalStorageService;
  private readonly STORAGE_KEYS = {
    USER_DATA: "@splitwise_user_data",
    OFFLINE_MODE: "@splitwise_offline_mode",
  };

  private constructor() {}

  static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  async saveLocalData(data: Partial<LocalData>): Promise<void> {
    try {
      const existingData = await this.getLocalData();
      const updatedData = { ...existingData, ...data };
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.USER_DATA,
        JSON.stringify(updatedData),
      );
    } catch (error) {
      console.error("Error saving local data:", error);
      throw error;
    }
  }

  async getLocalData(): Promise<LocalData> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_DATA);
      if (data) {
        return JSON.parse(data);
      }
      return this.getDefaultLocalData();
    } catch (error) {
      console.error("Error getting local data:", error);
      return this.getDefaultLocalData();
    }
  }

  async clearLocalData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
    } catch (error) {
      console.error("Error clearing local data:", error);
    }
  }

  async setOfflineMode(isOffline: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.OFFLINE_MODE,
        JSON.stringify(isOffline),
      );
    } catch (error) {
      console.error("Error setting offline mode:", error);
    }
  }

  async isOfflineMode(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_MODE);
      return data ? JSON.parse(data) : false;
    } catch (error) {
      console.error("Error checking offline mode:", error);
      return false;
    }
  }

  async saveUser(user: User): Promise<void> {
    await this.saveLocalData({ currentUser: user });
  }

  async saveGroups(groups: Group[]): Promise<void> {
    await this.saveLocalData({ groups });
  }

  async addGroup(group: Group): Promise<void> {
    const data = await this.getLocalData();
    const updatedGroups = [...data.groups, group];
    await this.saveLocalData({ groups: updatedGroups });
  }

  async saveExpenses(expenses: Expense[]): Promise<void> {
    await this.saveLocalData({ expenses });
  }

  async addExpense(expense: Expense): Promise<void> {
    const data = await this.getLocalData();
    const updatedExpenses = [...data.expenses, expense];
    await this.saveLocalData({ expenses: updatedExpenses });
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const data = await this.getLocalData();
    const updatedExpenses = data.expenses.filter((exp) => exp.id !== expenseId);
    await this.saveLocalData({ expenses: updatedExpenses });
  }

  async saveFriends(friends: User[]): Promise<void> {
    await this.saveLocalData({ friends });
  }

  async addFriend(friend: User): Promise<void> {
    const data = await this.getLocalData();
    const updatedFriends = [...data.friends, friend];
    await this.saveLocalData({ friends: updatedFriends });
  }

  async saveBalances(balances: Balance[]): Promise<void> {
    await this.saveLocalData({ balances });
  }

  async saveSettlements(settlements: Settlement[]): Promise<void> {
    await this.saveLocalData({ settlements });
  }

  async addSettlement(settlement: Settlement): Promise<void> {
    const data = await this.getLocalData();
    const updatedSettlements = [...data.settlements, settlement];
    await this.saveLocalData({ settlements: updatedSettlements });
  }

  async updateLastSyncDate(): Promise<void> {
    await this.saveLocalData({ lastSyncDate: new Date().toISOString() });
  }

  private getDefaultLocalData(): LocalData {
    return {
      currentUser: null,
      groups: [],
      expenses: [],
      friends: [],
      balances: [],
      settlements: [],
      lastSyncDate: null,
    };
  }

  // Create offline user
  createOfflineUser(): User {
    const timestamp = Date.now();
    return {
      id: `offline_${timestamp}`,
      name: "Offline User",
      email: `offline_${timestamp}@local.app`,
    };
  }

  // Generate unique ID for offline data
  generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update references to friends when syncing from offline to online
  async updateFriendReferences(
    oldFriendId: string,
    newFriendId: string,
  ): Promise<void> {
    try {
      const data = await this.getLocalData();

      // Update friend references in groups
      const updatedGroups = data.groups.map((group) => ({
        ...group,
        members: group.members.map((member) =>
          member.id === oldFriendId ? { ...member, id: newFriendId } : member,
        ),
      }));

      // Update friend references in expenses
      const updatedExpenses = data.expenses.map((expense) => ({
        ...expense,
        paidBy:
          expense.paidBy.id === oldFriendId
            ? { ...expense.paidBy, id: newFriendId }
            : expense.paidBy,
        splitBetween: expense.splitBetween.map((user) =>
          user.id === oldFriendId ? { ...user, id: newFriendId } : user,
        ),
        splits:
          expense.splits?.map((split) =>
            split.userId === oldFriendId
              ? { ...split, userId: newFriendId }
              : split,
          ) || [],
      }));

      // Update friend in friends list
      const updatedFriends = data.friends.map((friend) =>
        friend.id === oldFriendId ? { ...friend, id: newFriendId } : friend,
      );

      await this.saveLocalData({
        groups: updatedGroups,
        expenses: updatedExpenses,
        friends: updatedFriends,
      });
    } catch (error) {
      console.error("Error updating friend references:", error);
      throw error;
    }
  }

  // Update references to groups when syncing from offline to online
  async updateGroupReferences(
    oldGroupId: string,
    newGroupId: string,
  ): Promise<void> {
    try {
      const data = await this.getLocalData();

      // Update group references in expenses
      const updatedExpenses = data.expenses.map((expense) => ({
        ...expense,
        groupId: expense.groupId === oldGroupId ? newGroupId : expense.groupId,
      }));

      // Update group in groups list
      const updatedGroups = data.groups.map((group) =>
        group.id === oldGroupId ? { ...group, id: newGroupId } : group,
      );

      await this.saveLocalData({
        groups: updatedGroups,
        expenses: updatedExpenses,
      });
    } catch (error) {
      console.error("Error updating group references:", error);
      throw error;
    }
  }

  // Clear successfully synced offline data
  async clearSyncedOfflineData(): Promise<void> {
    try {
      const data = await this.getLocalData();

      // Remove synced offline items (those that no longer have offline_ prefix)
      const remainingGroups = data.groups.filter((group) =>
        group.id.startsWith("offline_"),
      );
      const remainingExpenses = data.expenses.filter((expense) =>
        expense.id.startsWith("offline_"),
      );
      const remainingFriends = data.friends.filter((friend) =>
        friend.id.startsWith("offline_"),
      );

      await this.saveLocalData({
        groups: remainingGroups,
        expenses: remainingExpenses,
        friends: remainingFriends,
      });

      console.log("Cleared synced offline data");
    } catch (error) {
      console.error("Error clearing synced offline data:", error);
      throw error;
    }
  }
}

export default LocalStorageService;
