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
    case "ADD_EXPENSE":
      return { ...state, expenses: [...state.expenses, action.payload] };
    case "SET_FRIENDS":
      return { ...state, friends: action.payload };
    case "ADD_FRIEND":
      return { ...state, friends: [...state.friends, action.payload] };
    case "UPDATE_BALANCES":
      return { ...state, balances: action.payload };
    case "DELETE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.filter(
          (expense) => expense.id !== action.payload
        ),
      };
    case "UPDATE_GROUP":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.payload.id ? action.payload : group
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
