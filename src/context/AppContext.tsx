import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useState,
} from "react";
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
  const [errorDetails, setErrorDetails] = useState({ title: "Error", message: "" });

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
          // No session — show login
          dispatch({ type: "SET_NEEDS_LOGIN", payload: true });
        }

        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setErrorDetails({
          title: "Initialization Error",
          message: "Failed to initialize the app. Please restart the application.",
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
        message: error.message || "An unexpected error occurred. Please try again.",
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
