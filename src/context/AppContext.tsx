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

        const db = DatabaseService.getInstance();

        // Initialize Atlas App Services
        try {
          await db.initialize();
        } catch (e) {
          console.log("Atlas App Services initialization skipped:", e);
        }

        // Check if user was in offline mode
        const isOffline = await localStorage.isOfflineMode();

        if (isOffline) {
          await authActions.continueOffline();
        } else {
          // Check for existing Atlas session
          if (db.hasAuthenticatedUser()) {
            try {
              // Re-open synced Realm with existing session
              await db.openRealm();
              dispatch({ type: "SET_CONNECTED", payload: true });

              // Load user from Realm
              const localData = await localStorage.getLocalData();
              if (localData.currentUser) {
                const user = await userService.getUserByEmail(
                  localData.currentUser.email,
                );
                if (user) {
                  dispatch({ type: "SET_CURRENT_USER", payload: user });
                  dispatch({ type: "SET_OFFLINE_MODE", payload: false });

                  await Promise.all([
                    dataActions.loadUserGroups(),
                    dataActions.loadUserExpenses(),
                    dataActions.loadFriends(),
                    dataActions.calculateUserBalance(),
                  ]);
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
            // No Atlas session — check for local user data
            const localData = await localStorage.getLocalData();
            if (
              localData.currentUser &&
              !localData.currentUser.id.startsWith("offline_")
            ) {
              // Has local user but no Atlas session — show login
              dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
            } else {
              dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
            }
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
