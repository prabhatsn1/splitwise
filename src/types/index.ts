export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface FriendInvitation {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toPhone: string;
  toName: string;
  status: InvitationStatus;
  createdAt: Date;
  respondedAt?: Date;
  message?: string;
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

export interface ExpenseItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo?: string[]; // user IDs for item-level splitting
}

export interface DefaultSplitTemplate {
  id: string;
  name: string;
  groupId?: string;
  splitType: SplitType;
  splits: AdvancedSplit[];
  createdAt: Date;
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
  items?: ExpenseItem[]; // Line-item breakdown
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
  currency?: string;
  paymentMethod?: string; // "cash" | "upi" | "bank_transfer" | "card" | "other"
  date: Date;
  note?: string;
  groupId?: string;
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

// Weekly spending data
export interface WeeklySpendingData {
  week: string; // "Week 1", "Week 2", etc.
  amount: number;
  startDate: string;
  endDate: string;
}

// Expense frequency data (by day of week)
export interface ExpenseFrequencyData {
  day: string; // "Mon", "Tue", etc.
  count: number;
  totalAmount: number;
}

// Budget vs Actual comparison data
export interface BudgetComparisonData {
  category: string;
  budget: number;
  actual: number;
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

// Budget settings
export interface CategoryBudget {
  category: string;
  monthlyLimit: number;
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
  Settings: undefined;
  BudgetSettings: undefined;
  InviteFriend: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Expenses: undefined;
  Groups: undefined;
  Friends: undefined;
  Account: undefined;
  Analytics: undefined;
};
