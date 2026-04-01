import AsyncStorage from "@react-native-async-storage/async-storage";
import { Expense } from "../types";

const STORAGE_KEY = "@splitwise_recurring_last_run";

class RecurringSchedulerService {
  private static instance: RecurringSchedulerService;

  static getInstance(): RecurringSchedulerService {
    if (!RecurringSchedulerService.instance) {
      RecurringSchedulerService.instance = new RecurringSchedulerService();
    }
    return RecurringSchedulerService.instance;
  }

  private async getLastRunDates(): Promise<Record<string, string>> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private async setLastRunDate(expenseId: string, date: Date): Promise<void> {
    const current = await this.getLastRunDates();
    current[expenseId] = date.toISOString();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }

  getNextDueDate(
    baseDate: Date,
    frequency: "weekly" | "monthly" | "yearly",
  ): Date {
    const next = new Date(baseDate);
    if (frequency === "weekly") {
      next.setDate(next.getDate() + 7);
    } else if (frequency === "monthly") {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setFullYear(next.getFullYear() + 1);
    }
    return next;
  }

  async getDueExpenses(
    expenses: Expense[],
  ): Promise<Array<{ template: Expense; dueDate: Date }>> {
    const recurringExpenses = expenses.filter((e) => e.recurring);
    if (recurringExpenses.length === 0) return [];

    const lastRunDates = await this.getLastRunDates();
    const now = new Date();
    const due: Array<{ template: Expense; dueDate: Date }> = [];

    for (const expense of recurringExpenses) {
      if (!expense.recurring) continue;

      // Skip if past the configured end date
      if (
        expense.recurring.endDate &&
        now > new Date(expense.recurring.endDate)
      ) {
        continue;
      }

      const lastRun = lastRunDates[expense.id]
        ? new Date(lastRunDates[expense.id])
        : new Date(expense.date);

      const nextDue = this.getNextDueDate(lastRun, expense.recurring.frequency);

      if (nextDue <= now) {
        due.push({ template: expense, dueDate: nextDue });
      }
    }

    return due;
  }

  async markAsRun(expenseId: string): Promise<void> {
    await this.setLastRunDate(expenseId, new Date());
  }

  async cleanupDeletedExpenses(activeExpenseIds: Set<string>): Promise<void> {
    const lastRunDates = await this.getLastRunDates();
    const cleaned: Record<string, string> = {};
    for (const [id, date] of Object.entries(lastRunDates)) {
      if (activeExpenseIds.has(id)) {
        cleaned[id] = date;
      }
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  }
}

export default RecurringSchedulerService;
