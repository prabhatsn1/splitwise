import {
  User,
  Expense,
  ExpenseAnalytics,
  YearOverYearData,
  GroupAnalytics,
  SimplifiedDebt,
  WeeklySpendingData,
  ExpenseFrequencyData,
  BudgetComparisonData,
} from "../types";

export class AnalyticsService {
  static calculateAnalytics(
    expenses: Expense[],
    friends: User[],
    currentUserId: string,
  ): ExpenseAnalytics {
    // Filter expenses where user is involved
    const userExpenses = expenses.filter(
      (expense) =>
        expense.paidBy.id === currentUserId ||
        expense.splitBetween.some((user) => user.id === currentUserId),
    );

    // Calculate monthly spending
    const monthlySpending = this.calculateMonthlySpending(
      userExpenses,
      currentUserId,
    );

    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(
      userExpenses,
      currentUserId,
    );

    // Calculate friend spending ranking
    const friendSpendingRanking = this.calculateFriendSpendingRanking(
      userExpenses,
      friends,
      currentUserId,
    );

    // Calculate average expense amount
    const averageExpenseAmount = this.calculateAverageExpenseAmount(
      userExpenses,
      currentUserId,
    );

    // Find most expensive expense
    const mostExpensiveExpense = this.findMostExpensiveExpense(
      userExpenses,
      currentUserId,
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
    currentUserId: string,
  ): { month: string; amount: number }[] {
    const monthlyMap = new Map<string, number>();

    expenses.forEach((expense) => {
      const month = new Date(expense.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      const userSplit = expense.splits.find(
        (split) => split.userId === currentUserId,
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
    currentUserId: string,
  ): { category: string; amount: number; percentage: number }[] {
    const categoryMap = new Map<string, number>();
    let totalAmount = 0;

    expenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === currentUserId,
      );
      const userAmount = userSplit?.amount || 0;

      categoryMap.set(
        expense.category,
        (categoryMap.get(expense.category) || 0) + userAmount,
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
    currentUserId: string,
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
              (friendSpendingMap.get(split.userId) || 0) + amount,
            );
          }
        });
      } else {
        // Friend paid, calculate user's share
        const userSplit = expense.splits.find(
          (split) => split.userId === currentUserId,
        );
        if (userSplit) {
          const payerId = expense.paidBy.id;
          const amount = userSplit.amount || 0;
          friendSpendingMap.set(
            payerId,
            (friendSpendingMap.get(payerId) || 0) + amount,
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
        (item): item is { friend: User; totalSpent: number } => item !== null,
      )
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }

  private static calculateAverageExpenseAmount(
    expenses: Expense[],
    currentUserId: string,
  ): number {
    if (expenses.length === 0) return 0;

    const totalAmount = expenses.reduce((sum, expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === currentUserId,
      );
      return sum + (userSplit?.amount || 0);
    }, 0);

    return totalAmount / expenses.length;
  }

  private static findMostExpensiveExpense(
    expenses: Expense[],
    currentUserId: string,
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
        (split) => split.userId === currentUserId,
      );
      const maxUserSplit = maxExpense.splits.find(
        (split) => split.userId === currentUserId,
      );

      const currentAmount = currentUserSplit?.amount || 0;
      const maxAmount = maxUserSplit?.amount || 0;

      return currentAmount > maxAmount ? currentExpense : maxExpense;
    });
  }

  private static calculateSpendingTrends(
    monthlySpending: { month: string; amount: number }[],
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

  // ─── Year-over-year comparison ───────────────────────────────────────

  static calculateYearOverYear(
    expenses: Expense[],
    currentUserId: string,
  ): YearOverYearData[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Filter expenses where user is involved
    const userExpenses = expenses.filter(
      (expense) =>
        expense.paidBy.id === currentUserId ||
        expense.splitBetween.some((user) => user.id === currentUserId),
    );

    // Build maps keyed by "YYYY-MM"
    const currentYearMap = new Map<number, number>();
    const previousYearMap = new Map<number, number>();

    userExpenses.forEach((expense) => {
      const d = new Date(expense.date);
      const year = d.getFullYear();
      const month = d.getMonth();

      if (year !== currentYear && year !== previousYear) return;

      const userSplit = expense.splits.find(
        (split) => split.userId === currentUserId,
      );
      const userAmount = userSplit?.amount || 0;

      if (year === currentYear) {
        currentYearMap.set(
          month,
          (currentYearMap.get(month) || 0) + userAmount,
        );
      } else {
        previousYearMap.set(
          month,
          (previousYearMap.get(month) || 0) + userAmount,
        );
      }
    });

    return monthNames.map((name, index) => ({
      month: name,
      currentYear: currentYearMap.get(index) || 0,
      previousYear: previousYearMap.get(index) || 0,
    }));
  }

  // ─── Per-group analytics ─────────────────────────────────────────────

  static calculateGroupAnalytics(
    expenses: Expense[],
    groupId: string,
    members: User[],
  ): GroupAnalytics {
    const groupExpenses = expenses.filter((e) => e.groupId === groupId);

    const totalSpend = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
    const averageExpense =
      groupExpenses.length > 0 ? totalSpend / groupExpenses.length : 0;

    // Category breakdown
    const categoryMap = new Map<string, number>();
    groupExpenses.forEach((expense) => {
      categoryMap.set(
        expense.category,
        (categoryMap.get(expense.category) || 0) + expense.amount,
      );
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Member spending
    const memberSpending = members.map((member) => {
      let totalPaid = 0;
      let totalShare = 0;

      groupExpenses.forEach((expense) => {
        if (expense.paidBy.id === member.id) {
          totalPaid += expense.amount;
        }
        const split = expense.splits.find((s) => s.userId === member.id);
        if (split) {
          totalShare += split.amount || 0;
        }
      });

      return {
        member,
        totalPaid,
        totalShare,
        netBalance: totalPaid - totalShare,
      };
    });

    // Monthly spending for group
    const monthlyMap = new Map<string, number>();
    groupExpenses.forEach((expense) => {
      const month = new Date(expense.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + expense.amount);
    });

    const result: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
      result.push({ month: monthKey, amount: monthlyMap.get(monthKey) || 0 });
    }

    return {
      categoryBreakdown,
      memberSpending: memberSpending.sort((a, b) => b.totalPaid - a.totalPaid),
      monthlySpending: result,
      totalSpend,
      averageExpense,
      expenseCount: groupExpenses.length,
    };
  }

  // ─── Debt simplification ────────────────────────────────────────────

  /**
   * Simplifies debts within a group using a greedy algorithm.
   * Computes net balances, then matches the largest creditor with
   * the largest debtor iteratively to minimise the total number of payments.
   */
  static simplifyDebts(
    expenses: Expense[],
    groupId: string,
    members: User[],
  ): SimplifiedDebt[] {
    const groupExpenses = expenses.filter((e) => e.groupId === groupId);

    // Build net-balance map: positive = owed money, negative = owes money
    const balances = new Map<string, number>();
    members.forEach((m) => balances.set(m.id, 0));

    groupExpenses.forEach((expense) => {
      // The payer fronted the full amount
      balances.set(
        expense.paidBy.id,
        (balances.get(expense.paidBy.id) || 0) + expense.amount,
      );
      // Each split participant owes their share
      expense.splits.forEach((split) => {
        balances.set(
          split.userId,
          (balances.get(split.userId) || 0) - (split.amount || 0),
        );
      });
    });

    // Build creditors (positive balance) and debtors (negative balance) lists
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];

    balances.forEach((amount, userId) => {
      const rounded = Math.round(amount * 100) / 100;
      if (rounded > 0.01) {
        creditors.push({ userId, amount: rounded });
      } else if (rounded < -0.01) {
        debtors.push({ userId, amount: Math.abs(rounded) });
      }
    });

    // Sort descending by amount
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const memberMap = new Map<string, User>();
    members.forEach((m) => memberMap.set(m.id, m));

    const result: SimplifiedDebt[] = [];
    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const transfer = Math.min(creditors[ci].amount, debtors[di].amount);
      if (transfer > 0.01) {
        const fromUser = memberMap.get(debtors[di].userId);
        const toUser = memberMap.get(creditors[ci].userId);
        if (fromUser && toUser) {
          result.push({
            from: fromUser,
            to: toUser,
            amount: Math.round(transfer * 100) / 100,
          });
        }
      }

      creditors[ci].amount -= transfer;
      debtors[di].amount -= transfer;

      if (creditors[ci].amount < 0.01) ci++;
      if (debtors[di].amount < 0.01) di++;
    }

    return result;
  }

  // ─── Weekly spending ────────────────────────────────────────────────

  static calculateWeeklySpending(
    expenses: Expense[],
    currentUserId: string,
  ): WeeklySpendingData[] {
    const now = new Date();
    const weeks: WeeklySpendingData[] = [];

    // Last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      // Set to start/end of day
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);

      const weekExpenses = expenses.filter((e) => {
        const d = new Date(e.date);
        return (
          d >= weekStart &&
          d <= weekEnd &&
          (e.paidBy.id === currentUserId ||
            e.splitBetween.some((u) => u.id === currentUserId))
        );
      });

      const amount = weekExpenses.reduce((sum, e) => {
        const split = e.splits.find((s) => s.userId === currentUserId);
        return sum + (split?.amount || 0);
      }, 0);

      weeks.push({
        week: `W${8 - i}`,
        amount,
        startDate: weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        endDate: weekEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    return weeks;
  }

  // ─── Expense frequency by day of week ───────────────────────────────

  static calculateExpenseFrequency(
    expenses: Expense[],
    currentUserId: string,
  ): ExpenseFrequencyData[] {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayMap = new Map<number, { count: number; totalAmount: number }>();

    for (let i = 0; i < 7; i++) {
      dayMap.set(i, { count: 0, totalAmount: 0 });
    }

    const userExpenses = expenses.filter(
      (e) =>
        e.paidBy.id === currentUserId ||
        e.splitBetween.some((u) => u.id === currentUserId),
    );

    userExpenses.forEach((expense) => {
      const dayOfWeek = new Date(expense.date).getDay();
      const existing = dayMap.get(dayOfWeek)!;
      const split = expense.splits.find((s) => s.userId === currentUserId);
      existing.count += 1;
      existing.totalAmount += split?.amount || 0;
    });

    return dayNames.map((day, index) => ({
      day,
      count: dayMap.get(index)!.count,
      totalAmount: dayMap.get(index)!.totalAmount,
    }));
  }

  // ─── Budget vs Actual comparison ────────────────────────────────────

  static calculateBudgetComparison(
    expenses: Expense[],
    currentUserId: string,
    budgets: Record<string, number>,
  ): BudgetComparisonData[] {
    // Get current month's expenses
    const now = new Date();
    const currentMonthExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        (e.paidBy.id === currentUserId ||
          e.splitBetween.some((u) => u.id === currentUserId))
      );
    });

    const categoryActuals = new Map<string, number>();
    currentMonthExpenses.forEach((e) => {
      const split = e.splits.find((s) => s.userId === currentUserId);
      const amount = split?.amount || 0;
      categoryActuals.set(
        e.category,
        (categoryActuals.get(e.category) || 0) + amount,
      );
    });

    return Object.entries(budgets).map(([category, budget]) => ({
      category,
      budget,
      actual: categoryActuals.get(category) || 0,
    }));
  }
}
