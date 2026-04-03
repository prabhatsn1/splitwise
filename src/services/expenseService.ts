import {
  Expense,
  Balance,
  AdvancedSplit,
  SplitType,
  RecurringConfig,
  User,
} from "../types";
import { ExpenseRow } from "../models/schemas";
import DatabaseService from "./database";
import LocalStorageService from "./localStorageService";

export class ExpenseService {
  private localStorage = LocalStorageService.getInstance();

  // ── Supabase helpers ──────────────────────────────────────────────────

  private getClient() {
    return DatabaseService.getInstance().getClient();
  }

  private getOwnerId(): string {
    try {
      return DatabaseService.getInstance().getUserId();
    } catch {
      return "local";
    }
  }

  private isSupabaseAvailable(): boolean {
    try {
      this.getClient();
      return DatabaseService.getInstance().hasAuthenticatedUser();
    } catch {
      return false;
    }
  }

  private generateExpenseId(): string {
    return `e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private toExpense(row: ExpenseRow): Expense {
    return {
      id: row.expense_id,
      description: row.description,
      amount: row.amount,
      currency: row.currency ?? "INR",
      paidBy: row.paid_by,
      splitBetween: row.split_between || [],
      splitType: row.split_type as SplitType,
      splits: row.splits || [],
      category: row.category as Expense["category"],
      date: new Date(row.date),
      groupId: row.group_id ?? undefined,
      receipt: row.receipt ?? undefined,
      location: row.location ?? undefined,
      recurring: row.recurring
        ? {
            frequency: row.recurring.frequency as RecurringConfig["frequency"],
            endDate: row.recurring.endDate
              ? new Date(row.recurring.endDate)
              : undefined,
          }
        : undefined,
      tags: row.tags || [],
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

    if (this.isSupabaseAvailable()) {
      const now = new Date().toISOString();
      await this.getClient()
        .from("expenses")
        .insert({
          expense_id: expenseId,
          description: expenseData.description,
          amount: expenseData.amount,
          currency: expenseData.currency || "INR",
          paid_by: expenseData.paidBy,
          split_between: expenseData.splitBetween,
          split_type: expenseData.splitType,
          splits: calculatedSplits,
          category: expenseData.category,
          date: date.toISOString(),
          group_id: expenseData.groupId || null,
          receipt: expenseData.receipt || null,
          location: expenseData.location || null,
          recurring: expenseData.recurring
            ? {
                frequency: expenseData.recurring.frequency,
                endDate: expenseData.recurring.endDate?.toISOString(),
              }
            : null,
          tags: expenseData.tags || [],
          created_at: now,
          updated_at: now,
          owner_id: this.getOwnerId(),
        });
    }

    const expense: Expense = {
      ...expenseData,
      id: expenseId,
      splits: calculatedSplits,
      date,
      tags: expenseData.tags || [],
    };

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
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("expenses")
        .select("*")
        .eq("expense_id", id)
        .single();
      return data ? this.toExpense(data as ExpenseRow) : null;
    }

    const localData = await this.localStorage.getLocalData();
    return localData.expenses.find((e) => e.id === id) || null;
  }

  async getExpensesByUserId(userId: string): Promise<Expense[]> {
    if (this.isSupabaseAvailable()) {
      // Supabase can't filter inside jsonb arrays easily in one query,
      // so we fetch by owner and filter in memory like before.
      const { data } = await this.getClient()
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

      if (!data) return [];

      return data
        .map((row: any) => this.toExpense(row as ExpenseRow))
        .filter(
          (e) =>
            e.paidBy.id === userId ||
            e.splitBetween.some((p) => p.id === userId),
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
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("expenses")
        .select("*")
        .eq("group_id", groupId)
        .order("date", { ascending: false });
      return (data || []).map((row: any) => this.toExpense(row as ExpenseRow));
    }

    const localData = await this.localStorage.getLocalData();
    return this.sortByDateDesc(
      localData.expenses.filter((e) => e.groupId === groupId),
    );
  }

  async getExpensesByCategory(
    category: string,
    userId?: string,
  ): Promise<Expense[]> {
    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("expenses")
        .select("*")
        .eq("category", category)
        .order("date", { ascending: false });

      let expenses = (data || []).map((row: any) =>
        this.toExpense(row as ExpenseRow),
      );
      if (userId) {
        expenses = expenses.filter(
          (e) =>
            e.paidBy.id === userId ||
            e.splitBetween.some((p) => p.id === userId),
        );
      }
      return expenses;
    }

    const localData = await this.localStorage.getLocalData();
    const expenses = localData.expenses.filter((e) => {
      if (e.category !== category) return false;
      if (!userId) return true;
      return (
        e.paidBy.id === userId || e.splitBetween.some((p) => p.id === userId)
      );
    });
    return this.sortByDateDesc(expenses);
  }

  async getExpensesByTags(tags: string[], userId?: string): Promise<Expense[]> {
    // Tags are stored as jsonb array — filter in memory for both paths
    let expenses: Expense[];

    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });
      expenses = (data || []).map((row: any) =>
        this.toExpense(row as ExpenseRow),
      );
    } else {
      const localData = await this.localStorage.getLocalData();
      expenses = localData.expenses;
    }

    const tagSet = new Set(tags);
    return this.sortByDateDesc(
      expenses.filter((e) => {
        const hasTag = (e.tags || []).some((tag) => tagSet.has(tag));
        if (!hasTag) return false;
        if (!userId) return true;
        return (
          e.paidBy.id === userId || e.splitBetween.some((p) => p.id === userId)
        );
      }),
    );
  }

  async getExpensesByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 1,
    userId?: string,
  ): Promise<Expense[]> {
    let expenses: Expense[];

    if (this.isSupabaseAvailable()) {
      const { data } = await this.getClient()
        .from("expenses")
        .select("*")
        .not("location", "is", null);
      expenses = (data || []).map((row: any) =>
        this.toExpense(row as ExpenseRow),
      );
    } else {
      const localData = await this.localStorage.getLocalData();
      expenses = localData.expenses.filter((e) => !!e.location);
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
    if (this.isSupabaseAvailable()) {
      const existing = await this.getExpenseById(id);
      if (!existing) return null;

      const merged = { ...existing, ...expenseData, id } as Expense;

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

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (expenseData.description !== undefined)
        updates.description = expenseData.description;
      if (expenseData.amount !== undefined) updates.amount = expenseData.amount;
      if (expenseData.currency !== undefined)
        updates.currency = expenseData.currency;
      if (expenseData.category !== undefined)
        updates.category = expenseData.category;
      if (expenseData.date !== undefined)
        updates.date = new Date(expenseData.date).toISOString();
      if (expenseData.receipt !== undefined)
        updates.receipt = expenseData.receipt;
      if (expenseData.tags !== undefined) updates.tags = expenseData.tags;
      if (merged.splits !== existing.splits) updates.splits = merged.splits;
      if (expenseData.splitBetween !== undefined)
        updates.split_between = expenseData.splitBetween;
      if (expenseData.splitType !== undefined)
        updates.split_type = expenseData.splitType;

      await this.getClient()
        .from("expenses")
        .update(updates)
        .eq("expense_id", id);

      const localData = await this.localStorage.getLocalData();
      const updatedExpenses = localData.expenses.map((e) =>
        e.id === id ? merged : e,
      );
      await this.localStorage.saveExpenses(updatedExpenses);
      return merged;
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
    if (this.isSupabaseAvailable()) {
      await this.getClient().from("expenses").delete().eq("expense_id", id);
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

    // Subtract settlements from balances
    const { SettlementService } = await import('./settlementService');
    const settlementService = SettlementService.getInstance();
    const settlements = await settlementService.getSettlementsByUserId(userId);

    settlements.forEach((settlement) => {
      if (settlement.fromUserId === userId) {
        // User paid someone
        owes[settlement.toUserId] = (owes[settlement.toUserId] || 0) - settlement.amount;
        totalBalance += settlement.amount;
      } else if (settlement.toUserId === userId) {
        // User received payment
        owedBy[settlement.fromUserId] = (owedBy[settlement.fromUserId] || 0) - settlement.amount;
        totalBalance -= settlement.amount;
      }
    });

    // Clean up zero or negative balances
    Object.keys(owes).forEach((key) => {
      if (owes[key] <= 0) delete owes[key];
    });
    Object.keys(owedBy).forEach((key) => {
      if (owedBy[key] <= 0) delete owedBy[key];
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
