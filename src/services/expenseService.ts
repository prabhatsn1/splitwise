import DatabaseService from "./database";
import {
  Expense,
  Balance,
  AdvancedSplit,
  SplitType,
  Location,
  RecurringConfig,
} from "../types";
import { ObjectId } from "mongodb";

export class ExpenseService {
  private db = DatabaseService.getInstance();

  async createExpense(expenseData: Omit<Expense, "id">): Promise<Expense> {
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    // Calculate splits based on split type
    const calculatedSplits = this.calculateSplits(
      expenseData.amount,
      expenseData.splitType,
      expenseData.splits,
      expenseData.splitBetween
    );

    const result = await collection.insertOne({
      ...expenseData,
      splits: calculatedSplits,
      _id: new ObjectId(),
      date: new Date(),
      tags: expenseData.tags || [],
    } as any);

    const expense = await collection.findOne({ _id: result.insertedId });
    return this.transformExpense(expense);
  }

  async createRecurringExpenses(
    expenseData: Omit<Expense, "id">
  ): Promise<Expense[]> {
    if (!expenseData.recurring) {
      throw new Error(
        "Recurring configuration is required for recurring expenses"
      );
    }

    const expenses: Expense[] = [];
    const { frequency, endDate } = expenseData.recurring;
    let currentDate = new Date(expenseData.date);
    const finalDate =
      endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default 1 year

    while (currentDate <= finalDate) {
      const recurringExpenseData = {
        ...expenseData,
        date: new Date(currentDate),
      };

      const expense = await this.createExpense(recurringExpenseData);
      expenses.push(expense);

      // Calculate next occurrence
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
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    const expense = await collection.findOne({ _id: new ObjectId(id) });
    return expense ? this.transformExpense(expense) : null;
  }

  async getExpensesByUserId(userId: string): Promise<Expense[]> {
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    const expenses = await collection
      .find({
        $or: [{ "paidBy.id": userId }, { "splitBetween.id": userId }],
      })
      .sort({ date: -1 })
      .toArray();

    return expenses.map((expense) => this.transformExpense(expense));
  }

  async getExpensesByGroupId(groupId: string): Promise<Expense[]> {
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    const expenses = await collection
      .find({ groupId })
      .sort({ date: -1 })
      .toArray();
    return expenses.map((expense) => this.transformExpense(expense));
  }

  async getExpensesByCategory(
    category: string,
    userId?: string
  ): Promise<Expense[]> {
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    const query: any = { category };
    if (userId) {
      query.$or = [{ "paidBy.id": userId }, { "splitBetween.id": userId }];
    }

    const expenses = await collection.find(query).sort({ date: -1 }).toArray();

    return expenses.map((expense) => this.transformExpense(expense));
  }

  async getExpensesByTags(tags: string[], userId?: string): Promise<Expense[]> {
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    const query: any = { tags: { $in: tags } };
    if (userId) {
      query.$or = [{ "paidBy.id": userId }, { "splitBetween.id": userId }];
    }

    const expenses = await collection.find(query).sort({ date: -1 }).toArray();

    return expenses.map((expense) => this.transformExpense(expense));
  }

  async getExpensesByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 1,
    userId?: string
  ): Promise<Expense[]> {
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    // Simple proximity check (in a real app, you might use MongoDB's geospatial queries)
    const expenses = await collection
      .find({
        location: { $exists: true },
        ...(userId && {
          $or: [{ "paidBy.id": userId }, { "splitBetween.id": userId }],
        }),
      })
      .toArray();

    return expenses
      .filter((expense) => {
        if (!expense.location) return false;
        const distance = this.calculateDistance(
          latitude,
          longitude,
          expense.location.latitude,
          expense.location.longitude
        );
        return distance <= radiusKm;
      })
      .map((expense) => this.transformExpense(expense));
  }

  async updateExpense(
    id: string,
    expenseData: Partial<Expense>
  ): Promise<Expense | null> {
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: expenseData }
    );

    const expense = await collection.findOne({ _id: new ObjectId(id) });
    return expense ? this.transformExpense(expense) : null;
  }

  async deleteExpense(id: string): Promise<boolean> {
    await this.db.connect();
    const collection = this.db.getExpensesCollection();

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async calculateBalances(userId: string): Promise<Balance> {
    await this.db.connect();
    const expenses = await this.getExpensesByUserId(userId);

    const owes: { [userId: string]: number } = {};
    const owedBy: { [userId: string]: number } = {};
    let totalBalance = 0;

    expenses.forEach((expense) => {
      const userSplit = expense.splits.find((split) => split.userId === userId);
      if (!userSplit) return;

      const userAmount = userSplit.amount || 0;

      if (expense.paidBy.id === userId) {
        // User paid for this expense
        expense.splits.forEach((split) => {
          if (split.userId !== userId) {
            const splitAmount = split.amount || 0;
            owedBy[split.userId] = (owedBy[split.userId] || 0) + splitAmount;
            totalBalance += splitAmount;
          }
        });
      } else {
        // Someone else paid for this expense
        owes[expense.paidBy.id] = (owes[expense.paidBy.id] || 0) + userAmount;
        totalBalance -= userAmount;
      }
    });

    return {
      userId,
      owes,
      owedBy,
      totalBalance,
    };
  }

  private calculateSplits(
    totalAmount: number,
    splitType: SplitType,
    splits: AdvancedSplit[],
    splitBetween: any[]
  ): AdvancedSplit[] {
    switch (splitType) {
      case "equal":
        const equalAmount = totalAmount / splitBetween.length;
        return splitBetween.map((user) => ({
          userId: user.id,
          amount: Math.round(equalAmount * 100) / 100, // Round to 2 decimal places
        }));

      case "exact":
        // Validate that exact amounts sum to total
        const exactTotal = splits.reduce(
          (sum, split) => sum + (split.amount || 0),
          0
        );
        if (Math.abs(exactTotal - totalAmount) > 0.01) {
          throw new Error(
            `Exact amounts (${exactTotal}) don't match total amount (${totalAmount})`
          );
        }
        return splits.map((split) => ({
          userId: split.userId,
          amount: split.amount || 0,
        }));

      case "percentage":
        // Validate that percentages sum to 100
        const totalPercentage = splits.reduce(
          (sum, split) => sum + (split.percentage || 0),
          0
        );
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new Error(
            `Percentages (${totalPercentage}%) don't sum to 100%`
          );
        }
        return splits.map((split) => ({
          userId: split.userId,
          amount:
            Math.round(((totalAmount * (split.percentage || 0)) / 100) * 100) /
            100,
          percentage: split.percentage,
        }));

      case "shares":
        const totalShares = splits.reduce(
          (sum, split) => sum + (split.shares || 0),
          0
        );
        if (totalShares === 0) {
          throw new Error("Total shares cannot be zero");
        }
        return splits.map((split) => ({
          userId: split.userId,
          amount:
            Math.round(
              ((totalAmount * (split.shares || 0)) / totalShares) * 100
            ) / 100,
          shares: split.shares,
        }));

      default:
        throw new Error(`Unsupported split type: ${splitType}`);
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
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

  private transformExpense(expense: any): Expense {
    return {
      id: expense._id.toString(),
      description: expense.description,
      amount: expense.amount,
      paidBy: expense.paidBy,
      splitBetween: expense.splitBetween,
      splitType: expense.splitType,
      splits: expense.splits,
      category: expense.category,
      date: expense.date,
      groupId: expense.groupId,
      receipt: expense.receipt,
      location: expense.location,
      recurring: expense.recurring,
      tags: expense.tags || [],
    };
  }
}
