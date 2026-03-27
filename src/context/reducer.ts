import { AppState, AppAction, initialState } from "./types";

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_NETWORK_ERROR":
      return { ...state, networkError: action.payload, loading: false };
    case "SET_CURRENT_USER":
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: true,
        needsLogin: false,
        networkError: null,
        retryCount: 0,
      };
    case "SET_GROUPS":
      return { ...state, groups: action.payload };
    case "ADD_GROUP":
      return { ...state, groups: [...state.groups, action.payload] };
    case "SET_EXPENSES":
      return { ...state, expenses: action.payload };
    case "ADD_EXPENSE": {
      const newPending = new Set(state.pendingExpenseIds);
      newPending.add(action.payload.id);
      return {
        ...state,
        expenses: [...state.expenses, action.payload],
        pendingExpenseIds: newPending,
      };
    }
    case "SET_FRIENDS":
      return { ...state, friends: action.payload };
    case "ADD_FRIEND":
      return { ...state, friends: [...state.friends, action.payload] };
    case "UPDATE_BALANCES":
      return { ...state, balances: action.payload };
    case "DELETE_EXPENSE": {
      const pendingAfterDelete = new Set(state.pendingExpenseIds);
      pendingAfterDelete.delete(action.payload);
      return {
        ...state,
        expenses: state.expenses.filter(
          (expense) => expense.id !== action.payload,
        ),
        pendingExpenseIds: pendingAfterDelete,
      };
    }
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((expense) =>
          expense.id === action.payload.id ? action.payload : expense,
        ),
      };
    case "REPLACE_EXPENSE": {
      const pendingAfterReplace = new Set(state.pendingExpenseIds);
      pendingAfterReplace.delete(action.payload.tempId);
      return {
        ...state,
        expenses: state.expenses.map((expense) =>
          expense.id === action.payload.tempId
            ? action.payload.expense
            : expense,
        ),
        pendingExpenseIds: pendingAfterReplace,
      };
    }
    case "MARK_EXPENSE_CONFIRMED": {
      const pendingAfterConfirm = new Set(state.pendingExpenseIds);
      pendingAfterConfirm.delete(action.payload);
      return {
        ...state,
        pendingExpenseIds: pendingAfterConfirm,
      };
    }
    case "ADD_SETTLEMENT":
      return {
        ...state,
        settlements: [...(state.settlements ?? []), action.payload],
      };
    case "UPDATE_GROUP":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.payload.id ? action.payload : group,
        ),
      };
    case "SET_INVITATIONS":
      return { ...state, invitations: action.payload };
    case "ADD_INVITATION":
      return {
        ...state,
        invitations: [...state.invitations, action.payload],
      };
    case "UPDATE_INVITATION":
      return {
        ...state,
        invitations: state.invitations.map((inv) =>
          inv.id === action.payload.id ? action.payload : inv,
        ),
      };
    case "REMOVE_INVITATION":
      return {
        ...state,
        invitations: state.invitations.filter(
          (inv) => inv.id !== action.payload,
        ),
      };
    case "SET_OFFLINE_MODE":
      return { ...state, isOfflineMode: action.payload };
    case "SET_AUTHENTICATED":
      return { ...state, isAuthenticated: action.payload };
    case "SET_NEEDS_LOGIN":
      return { ...state, needsLogin: action.payload };
    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload };
    case "SET_LAST_SYNC_ATTEMPT":
      return { ...state, lastSyncAttempt: action.payload };
    case "INCREMENT_RETRY_COUNT":
      return { ...state, retryCount: state.retryCount + 1 };
    case "RESET_RETRY_COUNT":
      return { ...state, retryCount: 0 };
    case "LOGOUT":
      return {
        ...initialState,
        needsLogin: true,
      };
    default:
      return state;
  }
}
