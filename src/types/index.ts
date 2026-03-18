export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: User[];
  createdAt: Date;
  simplifyDebts: boolean;
}

// Enhanced split types
export type SplitType = "equal" | "exact" | "percentage" | "shares";

export interface AdvancedSplit {
  userId: string;
  amount?: number; // For exact amounts
  percentage?: number; // For percentage splits
  shares?: number; // For share-based splits
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface RecurringConfig {
  frequency: "weekly" | "monthly" | "yearly";
  endDate?: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency?: string; // Currency code (e.g., "INR", "USD"). Defaults to "INR"
  paidBy: User;
  splitBetween: User[];
  splitType: SplitType;
  splits: AdvancedSplit[];
  category:
    | "Food"
    | "Transport"
    | "Entertainment"
    | "Bills"
    | "Shopping"
    | "Travel"
    | "Other";
  date: Date;
  groupId?: string;
  receipt?: string; // Base64 image or file path
  location?: Location;
  recurring?: RecurringConfig;
  tags: string[];
}

// Legacy interface for backward compatibility
export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage?: number;
}

// Enhanced expense interface that extends the base expense
export interface EnhancedExpense extends Expense {
  // Already includes all enhanced features in the base Expense interface
}

export interface Balance {
  userId: string;
  owes: { [userId: string]: number };
  owedBy: { [userId: string]: number };
  totalBalance: number;
}

export interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  date: Date;
  note?: string;
}

// Analytics interfaces
export interface ExpenseAnalytics {
  monthlySpending: { month: string; amount: number }[];
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  friendSpendingRanking: { friend: User; totalSpent: number }[];
  averageExpenseAmount: number;
  mostExpensiveExpense: Expense;
  spendingTrends: "increasing" | "decreasing" | "stable";
}

// Year-over-year comparison data
export interface YearOverYearData {
  month: string; // "Jan", "Feb", etc.
  currentYear: number;
  previousYear: number;
}

// Per-group analytics
export interface GroupAnalytics {
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  memberSpending: {
    member: User;
    totalPaid: number;
    totalShare: number;
    netBalance: number;
  }[];
  monthlySpending: { month: string; amount: number }[];
  totalSpend: number;
  averageExpense: number;
  expenseCount: number;
}

// Simplified debt (optimized payment)
export interface SimplifiedDebt {
  from: User;
  to: User;
  amount: number;
}

export type RootStackParamList = {
  Main: undefined;
  AddExpense: { groupId?: string };
  CreateGroup: undefined;
  ExpenseDetails: { expenseId: string };
  GroupDetails: { groupId: string };
  GroupAnalytics: { groupId: string };
  SettleUp: { userId: string };
  Analytics: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Expenses: undefined;
  Groups: undefined;
  Friends: undefined;
  Account: undefined;
  Analytics: undefined;
};
