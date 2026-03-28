import Realm, { BSON } from "realm";
import {
  Expense,
  Balance,
  AdvancedSplit,
  SplitType,
  Location,
  RecurringConfig,
  User,
} from "../types";
import {
  ExpenseSchema,
  ParticipantSchema,
  SplitSchema,
} from "../models/schemas";
import DatabaseService from "./database";
import LocalStorageService from "./localStorageService";

export class ExpenseService {
  private localStorage = LocalStorageService.getInstance();

  // ── Realm helpers ─────────────────────────────────────────────────────

  private getRealm(): Realm {
    return DatabaseService.getInstance().getRealm();
  }

  private getOwnerId(): string {
    try {
      return DatabaseService.getInstance().getAppUser().id;
    } catch {
      return "local";
    }
  }

  private isRealmAvailable(): boolean {
    try {
      this.getRealm();
      return true;
    } catch {
      return false;
    }
  }

  private generateExpenseId(): string {
    return new BSON.ObjectId().toHexString();
  }

  /** Convert a Realm ExpenseSchema to a plain Expense */
  private toExpense(re: ExpenseSchema): Expense {
    return {
      id: re.expenseId,
      description: re.description,
      amount: re.amount,
      currency: re.currency ?? "INR",
      paidBy: {
        id: re.paidBy.id,
        name: re.paidBy.name,
        email: re.paidBy.email,
        phone: re.paidBy.phone ?? undefined,
        avatar: re.paidBy.avatar ?? undefined,
      },
      splitBetween: Array.from(re.splitBetween).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone ?? undefined,
        avatar: p.avatar ?? undefined,
      })),
      splitType: re.splitType as SplitType,
      splits: Array.from(re.splits).map((s) => ({
        userId: s.userId,
        amount: s.amount ?? undefined,
        percentage: s.percentage ?? undefined,
        shares: s.shares ?? undefined,
      })),
      category: re.category as Expense["category"],
      date: re.date,
      groupId: re.groupId ?? undefined,
      receipt: re.receipt ?? undefined,
      location: re.location
        ? {
            latitude: re.location.latitude,
            longitude: re.location.longitude,
            address: re.location.address,
          }
        : undefined,
      recurring: re.recurring
        ? {
            frequency: re.recurring.frequency as RecurringConfig["frequency"],
            endDate: re.recurring.endDate ?? undefined,
          }
        : undefined,
      tags: Array.from(re.tags),
    };
  }

  private sortByDateDesc(expenses: Expense[]): Expense[] {
    return [...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  async createExpense(expenseData: Omit<Expense, "id">): Promise<Expense> {
    const calculatedSplits = this.calculateSplits(
      expenseData.amount,
      expenseData.splitType,
      expenseData.splits,
      expenseData.splitBetween,
    );

    const expenseId = this.generateExpenseId();
    const date = expenseData.date ? new Date(expenseData.date) : new Date();

    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const ownerId = this.getOwnerId();

      realm.write(() => {
        realm.create("Expense", {
          _id: new BSON.ObjectId(),
          expenseId,
          description: expenseData.description,
          amount: expenseData.amount,
          currency: expenseData.currency || "INR",
          paidBy: {
            id: expenseData.paidBy.id,
            name: expenseData.paidBy.name,
            email: expenseData.paidBy.email,
            phone: expenseData.paidBy.phone,
            avatar: expenseData.paidBy.avatar,
          },
          splitBetween: expenseData.splitBetween.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            avatar: u.avatar,
          })),
          splitType: expenseData.splitType,
          splits: calculatedSplits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage,
            shares: s.shares,
          })),
          category: expenseData.category,
          date,
          groupId: expenseData.groupId,
          receipt: expenseData.receipt,
          location: expenseData.location
            ? {
                latitude: expenseData.location.latitude,
                longitude: expenseData.location.longitude,
                address: expenseData.location.address,
              }
            : undefined,
          recurring: expenseData.recurring
            ? {
                frequency: expenseData.recurring.frequency,
                endDate: expenseData.recurring.endDate,
              }
            : undefined,
          tags: expenseData.tags || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          ownerId,
        });
      });
    }

    const expense: Expense = {
      ...expenseData,
      id: expenseId,
      splits: calculatedSplits,
      date,
      tags: expenseData.tags || [],
    };

    // Also persist locally for offline access
    const data = await this.localStorage.getLocalData();
    await this.localStorage.saveExpenses([...data.expenses, expense]);

    return expense;
  }

  async createRecurringExpenses(
    expenseData: Omit<Expense, "id">,
  ): Promise<Expense[]> {
    if (!expenseData.recurring) {
      throw new Error(
        "Recurring configuration is required for recurring expenses",
      );
    }

    const expenses: Expense[] = [];
    const { frequency, endDate } = expenseData.recurring;
    let currentDate = new Date(expenseData.date);
    const finalDate =
      endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    while (currentDate <= finalDate) {
      const recurringExpenseData = {
        ...expenseData,
        date: new Date(currentDate),
      };
      const expense = await this.createExpense(recurringExpenseData);
      expenses.push(expense);

      switch (frequency) {
        case "weekly":
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }

    return expenses;
  }

  async getExpenseById(id: string): Promise<Expense | null> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const found = realm
        .objects<ExpenseSchema>("Expense")
        .filtered("expenseId == $0", id)[0];
      return found ? this.toExpense(found) : null;
    }

    const data = await this.localStorage.getLocalData();
    return data.expenses.find((e) => e.id === id) || null;
  }

  async getExpensesByUserId(userId: string): Promise<Expense[]> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const results = realm
        .objects<ExpenseSchema>("Expense")
        .filtered("paidBy.id == $0 OR ANY splitBetween.id == $0", userId);
      return this.sortByDateDesc(
        Array.from(results).map((r) => this.toExpense(r)),
      );
    }

    const data = await this.localStorage.getLocalData();
    const expenses = data.expenses.filter(
      (e) =>
        e.paidBy.id === userId || e.splitBetween.some((p) => p.id === userId),
    );
    return this.sortByDateDesc(expenses);
  }

  async getExpensesByGroupId(groupId: string): Promise<Expense[]> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const results = realm
        .objects<ExpenseSchema>("Expense")
        .filtered("groupId == $0", groupId);
      return this.sortByDateDesc(
        Array.from(results).map((r) => this.toExpense(r)),
      );
    }

    const data = await this.localStorage.getLocalData();
    return this.sortByDateDesc(
      data.expenses.filter((e) => e.groupId === groupId),
    );
  }

  async getExpensesByCategory(
    category: string,
    userId?: string,
  ): Promise<Expense[]> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      let query = `category == $0`;
      const args: any[] = [category];
      if (userId) {
        query += ` AND (paidBy.id == $1 OR ANY splitBetween.id == $1)`;
        args.push(userId);
      }
      const results = realm
        .objects<ExpenseSchema>("Expense")
        .filtered(query, ...args);
      return this.sortByDateDesc(
        Array.from(results).map((r) => this.toExpense(r)),
      );
    }

    const data = await this.localStorage.getLocalData();
    const expenses = data.expenses.filter((e) => {
      if (e.category !== category) return false;
      if (!userId) return true;
      return (
        e.paidBy.id === userId || e.splitBetween.some((p) => p.id === userId)
      );
    });
    return this.sortByDateDesc(expenses);
  }

  async getExpensesByTags(tags: string[], userId?: string): Promise<Expense[]> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      // Realm doesn't support IN on list<string> easily, so filter in-memory
      const all = realm.objects<ExpenseSchema>("Expense");
      const tagSet = new Set(tags);
      const filtered = Array.from(all).filter((e) => {
        const hasTag = Array.from(e.tags).some((t) => tagSet.has(t));
        if (!hasTag) return false;
        if (!userId) return true;
        return (
          e.paidBy.id === userId ||
          Array.from(e.splitBetween).some((p) => p.id === userId)
        );
      });
      return this.sortByDateDesc(filtered.map((r) => this.toExpense(r)));
    }

    const tagSet = new Set(tags);
    const data = await this.localStorage.getLocalData();
    const expenses = data.expenses.filter((e) => {
      const hasTag = (e.tags || []).some((tag) => tagSet.has(tag));
      if (!hasTag) return false;
      if (!userId) return true;
      return (
        e.paidBy.id === userId || e.splitBetween.some((p) => p.id === userId)
      );
    });
    return this.sortByDateDesc(expenses);
  }

  async getExpensesByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 1,
    userId?: string,
  ): Promise<Expense[]> {
    // Haversine filtering must be done in memory for both Realm and localStorage
    let expenses: Expense[];

    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const results = realm
        .objects<ExpenseSchema>("Expense")
        .filtered("location != nil");
      expenses = Array.from(results).map((r) => this.toExpense(r));
    } else {
      const data = await this.localStorage.getLocalData();
      expenses = data.expenses.filter((e) => !!e.location);
    }

    if (userId) {
      expenses = expenses.filter(
        (e) =>
          e.paidBy.id === userId || e.splitBetween.some((p) => p.id === userId),
      );
    }

    return expenses.filter((e) => {
      if (!e.location) return false;
      return (
        this.calculateDistance(
          latitude,
          longitude,
          e.location.latitude,
          e.location.longitude,
        ) <= radiusKm
      );
    });
  }

  async updateExpense(
    id: string,
    expenseData: Partial<Expense>,
  ): Promise<Expense | null> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const realmExp = realm
        .objects<ExpenseSchema>("Expense")
        .filtered("expenseId == $0", id)[0];
      if (!realmExp) return null;

      realm.write(() => {
        if (expenseData.description !== undefined)
          realmExp.description = expenseData.description;
        if (expenseData.amount !== undefined)
          realmExp.amount = expenseData.amount;
        if (expenseData.currency !== undefined)
          realmExp.currency = expenseData.currency;
        if (expenseData.category !== undefined)
          realmExp.category = expenseData.category;
        if (expenseData.date !== undefined)
          realmExp.date = new Date(expenseData.date);
        if (expenseData.receipt !== undefined)
          realmExp.receipt = expenseData.receipt;
        if (expenseData.tags !== undefined) {
          realmExp.tags.splice(0, realmExp.tags.length);
          expenseData.tags.forEach((t) => realmExp.tags.push(t));
        }
        realmExp.updatedAt = new Date();

        // Recalculate splits if relevant fields changed
        if (
          expenseData.amount !== undefined ||
          expenseData.splitType !== undefined ||
          expenseData.splits !== undefined ||
          expenseData.splitBetween !== undefined
        ) {
          const merged = this.toExpense(realmExp);
          const newSplits = this.calculateSplits(
            merged.amount,
            merged.splitType,
            merged.splits,
            merged.splitBetween,
          );
          realmExp.splits.splice(0, realmExp.splits.length);
          newSplits.forEach((s) => {
            realmExp.splits.push({
              userId: s.userId,
              amount: s.amount,
              percentage: s.percentage,
              shares: s.shares,
            } as any);
          });
        }
      });

      const updated = this.toExpense(realmExp);
      // Mirror to local storage
      const data = await this.localStorage.getLocalData();
      const updatedExpenses = data.expenses.map((e) =>
        e.id === id ? updated : e,
      );
      await this.localStorage.saveExpenses(updatedExpenses);
      return updated;
    }

    // Fallback: localStorage
    const data = await this.localStorage.getLocalData();
    let updatedExpense: Expense | null = null;

    const updatedExpenses = data.expenses.map((expense) => {
      if (expense.id !== id) return expense;
      const merged = { ...expense, ...expenseData, id } as Expense;
      if (
        expenseData.amount !== undefined ||
        expenseData.splitType !== undefined ||
        expenseData.splits !== undefined ||
        expenseData.splitBetween !== undefined
      ) {
        merged.splits = this.calculateSplits(
          merged.amount,
          merged.splitType,
          merged.splits,
          merged.splitBetween,
        );
      }
      updatedExpense = merged;
      return merged;
    });

    await this.localStorage.saveExpenses(updatedExpenses);
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    if (this.isRealmAvailable()) {
      const realm = this.getRealm();
      const realmExp = realm
        .objects<ExpenseSchema>("Expense")
        .filtered("expenseId == $0", id)[0];
      if (realmExp) {
        realm.write(() => realm.delete(realmExp));
      }
    }

    const data = await this.localStorage.getLocalData();
    const updatedExpenses = data.expenses.filter((e) => e.id !== id);
    const deleted = updatedExpenses.length !== data.expenses.length;
    if (deleted) {
      await this.localStorage.saveExpenses(updatedExpenses);
    }
    return deleted;
  }

  async calculateBalances(userId: string): Promise<Balance> {
    const expenses = await this.getExpensesByUserId(userId);

    const owes: { [userId: string]: number } = {};
    const owedBy: { [userId: string]: number } = {};
    let totalBalance = 0;

    expenses.forEach((expense) => {
      const userSplit = expense.splits.find((s) => s.userId === userId);
      if (!userSplit) return;

      if (expense.paidBy.id === userId) {
        expense.splits.forEach((split) => {
          if (split.userId !== userId) {
            const splitAmount = split.amount || 0;
            owedBy[split.userId] = (owedBy[split.userId] || 0) + splitAmount;
            totalBalance += splitAmount;
          }
        });
      } else {
        const userAmount = userSplit.amount || 0;
        owes[expense.paidBy.id] = (owes[expense.paidBy.id] || 0) + userAmount;
        totalBalance -= userAmount;
      }
    });

    return { userId, owes, owedBy, totalBalance };
  }

  // ── Split calculation ─────────────────────────────────────────────────

  private calculateSplits(
    totalAmount: number,
    splitType: SplitType,
    splits: AdvancedSplit[],
    splitBetween: any[],
  ): AdvancedSplit[] {
    switch (splitType) {
      case "equal": {
        const equalAmount = totalAmount / splitBetween.length;
        return splitBetween.map((user) => ({
          userId: user.id,
          amount: Math.round(equalAmount * 100) / 100,
        }));
      }
      case "exact": {
        const exactTotal = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
        if (Math.abs(exactTotal - totalAmount) > 0.01) {
          throw new Error(
            `Exact amounts (${exactTotal}) don't match total amount (${totalAmount})`,
          );
        }
        return splits.map((s) => ({ userId: s.userId, amount: s.amount || 0 }));
      }
      case "percentage": {
        const totalPercentage = splits.reduce(
          (sum, s) => sum + (s.percentage || 0),
          0,
        );
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new Error(
            `Percentages (${totalPercentage}%) don't sum to 100%`,
          );
        }
        return splits.map((s) => ({
          userId: s.userId,
          amount:
            Math.round(((totalAmount * (s.percentage || 0)) / 100) * 100) / 100,
          percentage: s.percentage,
        }));
      }
      case "shares": {
        const totalShares = splits.reduce((sum, s) => sum + (s.shares || 0), 0);
        if (totalShares === 0) throw new Error("Total shares cannot be zero");
        return splits.map((s) => ({
          userId: s.userId,
          amount:
            Math.round(((totalAmount * (s.shares || 0)) / totalShares) * 100) /
            100,
          shares: s.shares,
        }));
      }
      default:
        throw new Error(`Unsupported split type: ${splitType}`);
    }
  }

  // ── Geo helpers ───────────────────────────────────────────────────────

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
