import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { UserService } from "../services/userService";
import { GroupService } from "../services/groupService";
import { ExpenseService } from "../services/expenseService";
import DatabaseService from "../services/database";
import LocalStorageService from "../services/localStorageService";
import SyncQueueService from "../services/syncQueueService";

// Import modular components
import { AppContextType, initialState } from "./types";
import { appReducer } from "./reducer";
import { useAuthActions } from "./authActions";
import { useDataActions } from "./dataActions";

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize services
  const userService = new UserService();
  const groupService = new GroupService();
  const expenseService = new ExpenseService();
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

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        // Check if user was in offline mode
        const isOffline = await localStorage.isOfflineMode();

        if (isOffline) {
          // Continue in offline mode
          await authActions.continueOffline();
        } else {
          // Check for existing local user data
          const localData = await localStorage.getLocalData();

          if (
            localData.currentUser &&
            !localData.currentUser.id.startsWith("offline_")
          ) {
            // Try to auto-login with existing user
            try {
              await DatabaseService.getInstance().connect();
              const user = await userService.getUserByEmail(
                localData.currentUser.email,
              );

              if (user) {
                dispatch({ type: "SET_CURRENT_USER", payload: user });
                dispatch({ type: "SET_OFFLINE_MODE", payload: false });

                // Load user data
                await Promise.all([
                  dataActions.loadUserGroups(),
                  dataActions.loadUserExpenses(),
                  dataActions.loadFriends(),
                  dataActions.calculateUserBalance(),
                ]);

                // Flush any queued offline mutations
                const syncQueue = SyncQueueService.getInstance();
                if (syncQueue.pendingCount > 0) {
                  console.log(
                    `[AppContext] Flushing ${syncQueue.pendingCount} queued sync items`,
                  );
                  syncQueue
                    .flush(user.id, dispatch)
                    .catch((err) =>
                      console.error(
                        "[AppContext] Sync queue flush error:",
                        err,
                      ),
                    );
                }
              } else {
                dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
              }
            } catch (error) {
              // If database connection fails, offer offline mode
              console.log("Database connection failed, showing login screen");
              dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
            }
          } else {
            dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
          }
        }

        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error) {
        console.error("Failed to initialize app:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to initialize app" });
      }
    };

    initializeApp();
  }, []);

  const contextValue: AppContextType = {
    state,
    dispatch,
    ...authActions,
    ...dataActions,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
