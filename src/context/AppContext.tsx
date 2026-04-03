import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  ReactNode,
  useState,
} from "react";
import { AppState as RNAppState } from "react-native";
import { UserService } from "../services/userService";
import { GroupService } from "../services/groupService";
import { ExpenseService } from "../services/expenseService";
import DatabaseService from "../services/database";
import LocalStorageService from "../services/localStorageService";
import ErrorModal from "../components/ErrorModal";
import GlobalErrorHandler from "../utils/errorHandler";

// Import modular components
import { AppContextType, initialState } from "./types";
import { appReducer } from "./reducer";
import { useAuthActions } from "./authActions";
import { useDataActions } from "./dataActions";

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorDetails, setErrorDetails] = useState({
    title: "Error",
    message: "",
  });

  // Initialize services — wrapped in useRef so instances are created once,
  // not on every render.
  const userService = useRef(new UserService()).current;
  const groupService = useRef(new GroupService()).current;
  const expenseService = useRef(new ExpenseService()).current;
  const localStorage = LocalStorageService.getInstance();

  // Get data actions
  const dataActions = useDataActions(
    state,
    dispatch,
    userService,
    groupService,
    expenseService,
    localStorage,
  );

  // Get auth actions
  const authActions = useAuthActions(
    state,
    dispatch,
    userService,
    groupService,
    expenseService,
    localStorage,
    dataActions.loadUserGroups,
    dataActions.loadUserExpenses,
    dataActions.loadFriends,
    dataActions.calculateUserBalance,
  );

  // Keep a stable ref to the latest dataActions callbacks so Realtime
  // handlers always call the most-recent version without re-subscribing.
  const dataActionsRef = useRef(dataActions);
  useEffect(() => {
    dataActionsRef.current = dataActions;
  });

  // Set up Supabase Realtime subscriptions so every user sees live updates
  // whenever another user adds/edits/deletes expenses, groups, or settlements.
  useEffect(() => {
    if (!state.currentUser || state.isOfflineMode) return;

    let db: ReturnType<typeof DatabaseService.getInstance>;
    try {
      db = DatabaseService.getInstance();
      if (!db.hasAuthenticatedUser()) return;
    } catch {
      return;
    }

    const client = db.getClient();

    let expenseTimer: ReturnType<typeof setTimeout>;
    let groupTimer: ReturnType<typeof setTimeout>;
    let settlementTimer: ReturnType<typeof setTimeout>;

    const refreshExpenses = () => {
      clearTimeout(expenseTimer);
      expenseTimer = setTimeout(() => {
        dataActionsRef.current.loadUserExpenses();
        dataActionsRef.current.calculateUserBalance();
      }, 300);
    };

    const refreshGroups = () => {
      clearTimeout(groupTimer);
      groupTimer = setTimeout(() => {
        dataActionsRef.current.loadUserGroups();
      }, 300);
    };

    const refreshSettlements = () => {
      clearTimeout(settlementTimer);
      settlementTimer = setTimeout(() => {
        dataActionsRef.current.loadSettlements();
        dataActionsRef.current.calculateUserBalance();
      }, 300);
    };

    const channel = client
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        refreshExpenses,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        refreshGroups,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settlements" },
        refreshSettlements,
      )
      .subscribe();

    return () => {
      clearTimeout(expenseTimer);
      clearTimeout(groupTimer);
      clearTimeout(settlementTimer);
      client.removeChannel(channel);
    };
  }, [state.currentUser?.id, state.isOfflineMode]);

  // Run recurring expense scheduler on startup and each time app comes to foreground
  useEffect(() => {
    if (!state.currentUser || state.isOfflineMode) return;

    const runScheduler = () => {
      dataActionsRef.current.checkAndCreateRecurringExpenses();
    };

    // Run once when the user is loaded
    runScheduler();

    const subscription = RNAppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        runScheduler();
      }
    });

    return () => subscription.remove();
  }, [state.currentUser?.id, state.isOfflineMode]);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        const db = DatabaseService.getInstance();

        // Initialize Supabase client (restores persisted session)
        try {
          await db.initialize();
        } catch (e) {
          console.log("Supabase initialization skipped:", e);
        }

        // Check if user was in offline mode
        const isOffline = await localStorage.isOfflineMode();

        if (isOffline) {
          await authActions.continueOffline();
        } else if (db.hasAuthenticatedUser()) {
          // Existing Supabase session — restore user
          try {
            dispatch({ type: "SET_CONNECTED", payload: true });

            const localData = await localStorage.getLocalData();
            if (localData.currentUser) {
              const user = await userService.getUserByEmail(
                localData.currentUser.email,
              );
              if (user) {
                dispatch({ type: "SET_CURRENT_USER", payload: user });
                dispatch({ type: "SET_OFFLINE_MODE", payload: false });

                // Load all data with retry logic
                const loadWithRetry = async (fn: () => Promise<any>, retries = 3) => {
                  for (let i = 0; i < retries; i++) {
                    try {
                      await fn();
                      return;
                    } catch (error) {
                      if (i === retries - 1) throw error;
                      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                    }
                  }
                };

                await Promise.allSettled([
                  loadWithRetry(() => dataActions.loadUserGroups()),
                  loadWithRetry(() => dataActions.loadUserExpenses()),
                  loadWithRetry(() => dataActions.loadFriends()),
                  loadWithRetry(() => dataActions.loadBudgets()),
                  loadWithRetry(() => dataActions.loadSettlements()),
                ]);
                
                await dataActions.calculateUserBalance();
              } else {
                dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
              }
            } else {
              dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
            }
          } catch (error) {
            console.log("Failed to restore session, showing login:", error);
            dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
          }
        } else {
          // No session — show login
          dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
        }

        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setErrorDetails({
          title: "Initialization Error",
          message:
            "Failed to initialize the app. Please restart the application.",
        });
        setErrorModalVisible(true);
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    initializeApp();
  }, []);

  // Watch for errors in state and show modal
  useEffect(() => {
    if (state.error) {
      setErrorDetails({
        title: "Error",
        message: state.error,
      });
      setErrorModalVisible(true);
    }
  }, [state.error]);

  // Setup global error handler
  useEffect(() => {
    const errorHandler = GlobalErrorHandler.getInstance();
    errorHandler.setErrorCallback((error: Error, context?: string) => {
      setErrorDetails({
        title: context || "Unexpected Error",
        message:
          error.message || "An unexpected error occurred. Please try again.",
      });
      setErrorModalVisible(true);
    });
  }, []);

  const handleDismissError = () => {
    setErrorModalVisible(false);
    dispatch({ type: "SET_ERROR", payload: null });
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    ...authActions,
    ...dataActions,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <ErrorModal
        visible={errorModalVisible}
        title={errorDetails.title}
        message={errorDetails.message}
        onDismiss={handleDismissError}
      />
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
