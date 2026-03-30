import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useApp } from "../context/AppContext";
import { NetworkService, NetworkStatus } from "../services/networkService";
import { NetworkError } from "../services/userService";

interface AuthState {
  isAuthenticating: boolean;
  networkStatus: NetworkStatus;
  lastError: NetworkError | null;
  canRetry: boolean;
  retryCount: number;
}

interface AuthActions {
  login: (email: string) => Promise<void>;
  signup: (userData: { name: string; email: string }) => Promise<void>;
  retry: () => Promise<void>;
  goOffline: () => void;
  checkNetwork: () => Promise<void>;
  clearError: () => void;
}

export function useNetworkAwareAuth(): AuthState & AuthActions {
  const { loginUser, createUser, continueOffline } = useApp();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticating: false,
    networkStatus: NetworkService.getInstance().getCurrentStatus(),
    lastError: null,
    canRetry: false,
    retryCount: 0,
  });

  const [lastAuthAction, setLastAuthAction] = useState<{
    type: "login" | "signup";
    data: any;
  } | null>(null);

  // Listen to network changes
  useEffect(() => {
    const networkService = NetworkService.getInstance();

    const unsubscribe = networkService.addListener((status: NetworkStatus) => {
      setAuthState((prev) => {
        const newState = {
          ...prev,
          networkStatus: status,
        };

        // If network came back online and we have a retryable error, offer to retry
        if (
          status.isConnected &&
          prev.lastError?.isRetryable &&
          prev.canRetry
        ) {
          Alert.alert(
            "Connection Restored",
            "Your internet connection is back. Would you like to retry?",
            [
              { text: "Retry", onPress: () => retry() },
              { text: "Stay Offline", style: "cancel" },
            ],
          );
        }

        return newState;
      });
    });

    return unsubscribe;
  }, []);

  const handleAuthError = useCallback(
    (error: any, actionType: "login" | "signup") => {
      let networkError: NetworkError;

      if (error instanceof NetworkError) {
        networkError = error;
      } else {
        // Convert regular errors to NetworkError
        networkError = new NetworkError(
          "general",
          error.message || "An unexpected error occurred",
          true,
          actionType,
        );
      }

      setAuthState((prev) => ({
        ...prev,
        isAuthenticating: false,
        lastError: networkError,
        canRetry: networkError.isRetryable,
        retryCount: prev.retryCount + 1,
      }));

      // Show appropriate error dialog based on error type and network status
      if (
        networkError.type === "network" &&
        !authState.networkStatus.isConnected
      ) {
        Alert.alert(
          "No Internet Connection",
          "Unable to connect to the server. You can continue offline or wait for your connection to return.",
          [
            { text: "Go Offline", onPress: goOffline },
            { text: "Try Again", onPress: retry },
            { text: "Cancel", style: "cancel" },
          ],
        );
      } else if (networkError.isRetryable && authState.retryCount < 3) {
        Alert.alert("Connection Error", networkError.message, [
          { text: "Try Again", onPress: retry },
          { text: "Go Offline", onPress: goOffline },
          { text: "Cancel", style: "cancel" },
        ]);
      } else {
        Alert.alert("Error", networkError.message);
      }
    },
    [authState.networkStatus.isConnected, authState.retryCount],
  );

  const login = useCallback(
    async (email: string) => {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticating: true,
        lastError: null,
        canRetry: false,
      }));

      setLastAuthAction({ type: "login", data: { email } });

      try {
        await loginUser(email);
        // Reset retry count on success
        setAuthState((prev) => ({ ...prev, retryCount: 0 }));
      } catch (error) {
        handleAuthError(error, "login");
      }
    },
    [loginUser, handleAuthError],
  );

  const signup = useCallback(
    async (userData: { name: string; email: string }) => {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticating: true,
        lastError: null,
        canRetry: false,
      }));

      setLastAuthAction({ type: "signup", data: userData });

      try {
        await createUser(userData);
        // Reset retry count on success
        setAuthState((prev) => ({ ...prev, retryCount: 0 }));
      } catch (error) {
        handleAuthError(error, "signup");
      }
    },
    [createUser, handleAuthError],
  );

  const retry = useCallback(async () => {
    if (!lastAuthAction) return;

    clearError();

    if (lastAuthAction.type === "login") {
      await login(lastAuthAction.data.email);
    } else if (lastAuthAction.type === "signup") {
      await signup(lastAuthAction.data);
    }
  }, [lastAuthAction, login, signup]);

  const goOffline = useCallback(() => {
    clearError();
    continueOffline();
  }, [continueOffline]);

  const checkNetwork = useCallback(async () => {
    const networkService = NetworkService.getInstance();
    const isConnected = await networkService.checkConnectivity();
    const internetReachable = await networkService.testInternetConnection();

    setAuthState((prev) => ({
      ...prev,
      networkStatus: {
        isConnected,
        type: prev.networkStatus.type,
        isInternetReachable: internetReachable,
      },
    }));
  }, []);

  const clearError = useCallback(() => {
    setAuthState((prev) => ({
      ...prev,
      lastError: null,
      canRetry: false,
    }));
  }, []);

  return {
    ...authState,
    login,
    signup,
    retry,
    goOffline,
    checkNetwork,
    clearError,
  };
}
