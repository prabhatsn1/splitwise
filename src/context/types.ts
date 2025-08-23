import { User, Group, Expense, Balance } from "../types";

// Network error interface for better error handling
export interface NetworkError {
  type: "network" | "auth" | "validation" | "sync" | "general";
  message: string;
  isRetryable: boolean;
  action?: "login" | "signup" | "sync" | "load_data";
}

// Application state interface
export interface AppState {
  currentUser: User | null;
  groups: Group[];
  expenses: Expense[];
  friends: User[];
  balances: Balance[];
  loading: boolean;
  error: string | null;
  networkError: NetworkError | null;
  isOfflineMode: boolean;
  isAuthenticated: boolean;
  needsLogin: boolean;
  isConnected: boolean;
  lastSyncAttempt: Date | null;
  retryCount: number;
}

// Action types for reducer
export type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_NETWORK_ERROR"; payload: NetworkError | null }
  | { type: "SET_CURRENT_USER"; payload: User }
  | { type: "SET_GROUPS"; payload: Group[] }
  | { type: "ADD_GROUP"; payload: Group }
  | { type: "SET_EXPENSES"; payload: Expense[] }
  | { type: "ADD_EXPENSE"; payload: Expense }
  | { type: "SET_FRIENDS"; payload: User[] }
  | { type: "ADD_FRIEND"; payload: User }
  | { type: "UPDATE_BALANCES"; payload: Balance[] }
  | { type: "DELETE_EXPENSE"; payload: string }
  | { type: "UPDATE_GROUP"; payload: Group }
  | { type: "SET_OFFLINE_MODE"; payload: boolean }
  | { type: "SET_AUTHENTICATED"; payload: boolean }
  | { type: "SET_NEEDS_LOGIN"; payload: boolean }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_LAST_SYNC_ATTEMPT"; payload: Date }
  | { type: "INCREMENT_RETRY_COUNT" }
  | { type: "RESET_RETRY_COUNT" }
  | { type: "LOGOUT" };

// Context interface
export interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Auth actions
  loginUser: (email: string) => Promise<void>;
  createUser: (userData: Omit<User, "id">) => Promise<void>;
  continueOffline: () => Promise<void>;
  logout: () => Promise<void>;
  syncData: () => Promise<void>;
  // Group actions
  loadUserGroups: () => Promise<void>;
  createGroup: (groupData: Omit<Group, "id">) => Promise<void>;
  // Expense actions
  loadUserExpenses: () => Promise<void>;
  createExpense: (expenseData: Omit<Expense, "id">) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  getExpensesByCategory: (category: string) => Promise<Expense[]>;
  getExpensesByTags: (tags: string[]) => Promise<Expense[]>;
  getExpensesByLocation: (
    latitude: number,
    longitude: number,
    radiusKm?: number
  ) => Promise<Expense[]>;
  // Friend actions
  loadFriends: () => Promise<void>;
  addFriend: (friendData: Omit<User, "id">) => Promise<void>;
  // Balance actions
  calculateUserBalance: () => Promise<void>;
}

// Initial state
export const initialState: AppState = {
  currentUser: null,
  groups: [],
  expenses: [],
  friends: [],
  balances: [],
  loading: false,
  error: null,
  networkError: null,
  isOfflineMode: false,
  isAuthenticated: false,
  needsLogin: true,
  isConnected: true,
  lastSyncAttempt: null,
  retryCount: 0,
};
