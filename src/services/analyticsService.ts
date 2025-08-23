import { User, Expense, ExpenseAnalytics } from "../types";

export class AnalyticsService {
  static calculateAnalytics(
    expenses: Expense[],
    friends: User[],
    currentUserId: string
  ): ExpenseAnalytics {
    // Filter expenses where user is involved
    const userExpenses = expenses.filter(
      (expense) =>
        expense.paidBy.id === currentUserId ||
        expense.splitBetween.some((user) => user.id === currentUserId)
    );

    // Calculate monthly spending
    const monthlySpending = this.calculateMonthlySpending(
      userExpenses,
      currentUserId
    );

    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(
      userExpenses,
      currentUserId
    );

    // Calculate friend spending ranking
    const friendSpendingRanking = this.calculateFriendSpendingRanking(
      userExpenses,
      friends,
      currentUserId
    );

    // Calculate average expense amount
    const averageExpenseAmount = this.calculateAverageExpenseAmount(
      userExpenses,
      currentUserId
    );

    // Find most expensive expense
    const mostExpensiveExpense = this.findMostExpensiveExpense(
      userExpenses,
      currentUserId
    );

    // Calculate spending trends
    const spendingTrends = this.calculateSpendingTrends(monthlySpending);

    return {
      monthlySpending,
      categoryBreakdown,
      friendSpendingRanking,
      averageExpenseAmount,
      mostExpensiveExpense,
      spendingTrends,
    };
  }

  private static calculateMonthlySpending(
    expenses: Expense[],
    currentUserId: string
  ): { month: string; amount: number }[] {
    const monthlyMap = new Map<string, number>();

    expenses.forEach((expense) => {
      const month = new Date(expense.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      const userSplit = expense.splits.find(
        (split) => split.userId === currentUserId
      );
      const userAmount = userSplit?.amount || 0;

      monthlyMap.set(month, (monthlyMap.get(month) || 0) + userAmount);
    });

    // Get last 12 months
    const result: { month: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      result.push({
        month: monthKey,
        amount: monthlyMap.get(monthKey) || 0,
      });
    }

    return result;
  }

  private static calculateCategoryBreakdown(
    expenses: Expense[],
    currentUserId: string
  ): { category: string; amount: number; percentage: number }[] {
    const categoryMap = new Map<string, number>();
    let totalAmount = 0;

    expenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === currentUserId
      );
      const userAmount = userSplit?.amount || 0;

      categoryMap.set(
        expense.category,
        (categoryMap.get(expense.category) || 0) + userAmount
      );
      totalAmount += userAmount;
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private static calculateFriendSpendingRanking(
    expenses: Expense[],
    friends: User[],
    currentUserId: string
  ): { friend: User; totalSpent: number }[] {
    const friendSpendingMap = new Map<string, number>();

    expenses.forEach((expense) => {
      if (expense.paidBy.id === currentUserId) {
        // User paid, calculate how much friends owe
        expense.splits.forEach((split) => {
          if (split.userId !== currentUserId) {
            const amount = split.amount || 0;
            friendSpendingMap.set(
              split.userId,
              (friendSpendingMap.get(split.userId) || 0) + amount
            );
          }
        });
      } else {
        // Friend paid, calculate user's share
        const userSplit = expense.splits.find(
          (split) => split.userId === currentUserId
        );
        if (userSplit) {
          const payerId = expense.paidBy.id;
          const amount = userSplit.amount || 0;
          friendSpendingMap.set(
            payerId,
            (friendSpendingMap.get(payerId) || 0) + amount
          );
        }
      }
    });

    return Array.from(friendSpendingMap.entries())
      .map(([friendId, totalSpent]) => {
        const friend = friends.find((f) => f.id === friendId);
        return friend ? { friend, totalSpent } : null;
      })
      .filter(
        (item): item is { friend: User; totalSpent: number } => item !== null
      )
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }

  private static calculateAverageExpenseAmount(
    expenses: Expense[],
    currentUserId: string
  ): number {
    if (expenses.length === 0) return 0;

    const totalAmount = expenses.reduce((sum, expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === currentUserId
      );
      return sum + (userSplit?.amount || 0);
    }, 0);

    return totalAmount / expenses.length;
  }

  private static findMostExpensiveExpense(
    expenses: Expense[],
    currentUserId: string
  ): Expense {
    if (expenses.length === 0) {
      // Return a default expense if no expenses found
      return {
        id: "default",
        description: "No expenses yet",
        amount: 0,
        paidBy: { id: currentUserId, name: "You", email: "" },
        splitBetween: [],
        splitType: "equal",
        splits: [],
        category: "Other",
        date: new Date(),
        tags: [],
      };
    }

    return expenses.reduce((maxExpense, currentExpense) => {
      const currentUserSplit = currentExpense.splits.find(
        (split) => split.userId === currentUserId
      );
      const maxUserSplit = maxExpense.splits.find(
        (split) => split.userId === currentUserId
      );

      const currentAmount = currentUserSplit?.amount || 0;
      const maxAmount = maxUserSplit?.amount || 0;

      return currentAmount > maxAmount ? currentExpense : maxExpense;
    });
  }

  private static calculateSpendingTrends(
    monthlySpending: { month: string; amount: number }[]
  ): "increasing" | "decreasing" | "stable" {
    if (monthlySpending.length < 3) return "stable";

    const recentMonths = monthlySpending.slice(-3);
    const [first, second, third] = recentMonths.map((month) => month.amount);

    const trend1 = second - first;
    const trend2 = third - second;

    if (trend1 > 0 && trend2 > 0) return "increasing";
    if (trend1 < 0 && trend2 < 0) return "decreasing";
    return "stable";
  }
}
