import { useCallback } from "react";
import { AppState, AppAction } from "./types";
import { User, Expense, Balance } from "../types";
import { UserService } from "../services/userService";
import { GroupService } from "../services/groupService";
import { ExpenseService } from "../services/expenseService";
import DatabaseService from "../services/database";
import LocalStorageService from "../services/localStorageService";

export function useAuthActions(
  state: AppState,
  dispatch: React.Dispatch<AppAction>,
  userService: UserService,
  groupService: GroupService,
  expenseService: ExpenseService,
  localStorage: LocalStorageService,
  loadUserGroups: () => Promise<void>,
  loadUserExpenses: () => Promise<void>,
  loadFriends: () => Promise<void>,
  calculateUserBalance: () => Promise<void>,
) {
  // Helper function to calculate balances from local data
  const calculateOfflineBalance = useCallback(
    async (
      userId: string,
      expenses: Expense[],
      friends: User[],
    ): Promise<void> => {
      try {
        const balance: Balance = {
          userId,
          owes: {},
          owedBy: {},
          totalBalance: 0,
        };

        expenses.forEach((expense) => {
          const userParticipated = expense.splitBetween?.some(
            (p) => p.id === userId,
          );
          const userPaid = expense.paidBy.id === userId;

          if (!userParticipated && !userPaid) return;

          const userSplit = expense.splits?.find((s) => s.userId === userId);

          if (userPaid) {
            expense.splitBetween?.forEach((participant) => {
              if (participant.id !== userId) {
                const participantSplit = expense.splits?.find(
                  (s) => s.userId === participant.id,
                );
                const pAmount = participantSplit?.amount ?? 0;
                if (pAmount > 0) {
                  balance.owedBy[participant.id] =
                    (balance.owedBy[participant.id] || 0) + pAmount;
                }
              }
            });
          } else if (
            userParticipated &&
            userSplit &&
            (userSplit.amount ?? 0) > 0
          ) {
            balance.owes[expense.paidBy.id] =
              (balance.owes[expense.paidBy.id] || 0) + (userSplit.amount ?? 0);
          }
        });

        // Simplify balances
        const simplifiedBalance = { ...balance };
        Object.keys(balance.owes).forEach((otherId) => {
          const userOwes = balance.owes[otherId] || 0;
          const otherOwes = balance.owedBy[otherId] || 0;
          if (userOwes > 0 && otherOwes > 0) {
            const netAmount = userOwes - otherOwes;
            delete simplifiedBalance.owes[otherId];
            delete simplifiedBalance.owedBy[otherId];
            if (netAmount > 0) {
              simplifiedBalance.owes[otherId] = netAmount;
            } else if (netAmount < 0) {
              simplifiedBalance.owedBy[otherId] = Math.abs(netAmount);
            }
          }
        });

        const totalOwed = Object.values(simplifiedBalance.owedBy).reduce(
          (sum, amount) => sum + amount,
          0,
        );
        const totalOwes = Object.values(simplifiedBalance.owes).reduce(
          (sum, amount) => sum + amount,
          0,
        );
        simplifiedBalance.totalBalance = totalOwed - totalOwes;

        await localStorage.saveBalances([simplifiedBalance]);
        dispatch({ type: "UPDATE_BALANCES", payload: [simplifiedBalance] });
      } catch (error) {
        console.error("Failed to calculate offline balance:", error);
        const emptyBalance: Balance = {
          userId,
          owes: {},
          owedBy: {},
          totalBalance: 0,
        };
        dispatch({ type: "UPDATE_BALANCES", payload: [emptyBalance] });
      }
    },
    [localStorage],
  );

  /**
   * Login with email + password via Supabase Auth.
   */
  const loginUser = useCallback(
    async (email: string, password?: string): Promise<void> => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({ type: "SET_ERROR", payload: null });

        const db = DatabaseService.getInstance();
        await db.initialize();

        if (password) {
          const user = await userService.loginWithPassword(email, password);
          dispatch({ type: "SET_CURRENT_USER", payload: user });
          dispatch({ type: "SET_OFFLINE_MODE", payload: false });
          dispatch({ type: "SET_CONNECTED", payload: true });
          await localStorage.setOfflineMode(false);
          await localStorage.saveUser(user);
        } else {
          // Lookup by email in Supabase
          const user = await userService.getUserByEmail(email);
          if (!user) throw new Error("User not found");
          dispatch({ type: "SET_CURRENT_USER", payload: user });
          dispatch({ type: "SET_OFFLINE_MODE", payload: false });
          await localStorage.setOfflineMode(false);
          await localStorage.saveUser(user);
        }

        await Promise.all([
          loadUserGroups(),
          loadUserExpenses(),
          loadFriends(),
          calculateUserBalance(),
        ]);

        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error: any) {
        console.error("Failed to login user:", error);
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_ERROR",
          payload:
            error.message ||
            "Login failed. Please check your credentials and try again.",
        });
        throw error;
      }
    },
    [userService],
  );

  /**
   * Sign up with email + password via Supabase Auth.
   */
  const createUser = useCallback(
    async (
      userData: Omit<User, "id"> & { password?: string },
    ): Promise<void> => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({ type: "SET_ERROR", payload: null });

        const db = DatabaseService.getInstance();
        await db.initialize();

        let user: User;

        if (userData.password) {
          user = await userService.registerUser(
            userData.email,
            userData.password,
            userData.name,
            userData.phone,
          );
        } else {
          user = await userService.createUser(userData);
        }

        dispatch({ type: "SET_CURRENT_USER", payload: user });
        dispatch({ type: "SET_OFFLINE_MODE", payload: false });
        dispatch({ type: "SET_CONNECTED", payload: true });
        await localStorage.setOfflineMode(false);
        await localStorage.saveUser(user);

        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error: any) {
        console.error("Failed to create user:", error);
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Signup failed. Please try again.",
        });
        throw error;
      }
    },
    [userService],
  );

  /**
   * Continue in offline mode using local storage only.
   */
  const continueOffline = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      // Initialize Supabase client (optional — may fail offline)
      const db = DatabaseService.getInstance();
      await db.initialize().catch(() => {});

      const localData = await localStorage.getLocalData();
      let offlineUser = localData.currentUser;

      if (!offlineUser || !offlineUser.id) {
        offlineUser = localStorage.createOfflineUser();
        await localStorage.saveUser(offlineUser);
      }

      dispatch({ type: "SET_CURRENT_USER", payload: offlineUser });
      dispatch({ type: "SET_OFFLINE_MODE", payload: true });
      dispatch({ type: "SET_CONNECTED", payload: false });
      await localStorage.setOfflineMode(true);

      const groups = Array.isArray(localData.groups) ? localData.groups : [];
      const expenses = Array.isArray(localData.expenses)
        ? localData.expenses
        : [];
      const friends = Array.isArray(localData.friends) ? localData.friends : [];
      const balances = Array.isArray(localData.balances)
        ? localData.balances
        : [];

      const userGroups = groups.filter((group) =>
        group.members?.some((member) => member.id === offlineUser!.id),
      );
      const userExpenses = expenses.filter(
        (expense) =>
          expense.paidBy.id === offlineUser!.id ||
          expense.splitBetween?.some((p) => p.id === offlineUser!.id),
      );
      const userBalances = balances.filter(
        (balance) => balance.userId === offlineUser!.id,
      );

      dispatch({ type: "SET_GROUPS", payload: userGroups });
      dispatch({ type: "SET_EXPENSES", payload: userExpenses });
      dispatch({ type: "SET_FRIENDS", payload: friends });
      dispatch({ type: "UPDATE_BALANCES", payload: userBalances });

      if (userBalances.length === 0 && userExpenses.length > 0) {
        await calculateOfflineBalance(offlineUser.id, userExpenses, friends);
      }

      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      console.error("Failed to continue offline:", error);
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to setup offline mode. Please try again.",
      });

      try {
        const fallbackUser = localStorage.createOfflineUser();
        await localStorage.saveUser(fallbackUser);
        dispatch({ type: "SET_CURRENT_USER", payload: fallbackUser });
        dispatch({ type: "SET_OFFLINE_MODE", payload: true });
        await localStorage.setOfflineMode(true);
        dispatch({ type: "SET_LOADING", payload: false });
      } catch (fallbackError) {
        console.error(
          "Critical error initializing offline mode:",
          fallbackError,
        );
        dispatch({
          type: "SET_ERROR",
          payload: "Critical error initializing offline mode",
        });
      }
    }
  }, [localStorage, calculateOfflineBalance]);

  /**
   * Logout — clear local data and sign out of Supabase.
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await DatabaseService.getInstance().logout();
      await localStorage.clearLocalData();
      await localStorage.setOfflineMode(false);
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }, [localStorage]);

  /**
   * Sync offline data to Supabase.
   */
  const syncData = useCallback(async (): Promise<void> => {
    if (!state.isOfflineMode || !state.currentUser) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const db = DatabaseService.getInstance();
      await db.initialize();

      // User must be authenticated to sync
      if (!db.hasAuthenticatedUser()) {
        throw new Error("Please log in with your account to sync data.");
      }

      // Reload all data from Supabase
      await Promise.all([
        loadUserGroups(),
        loadUserExpenses(),
        loadFriends(),
        calculateUserBalance(),
      ]);

      dispatch({ type: "SET_OFFLINE_MODE", payload: false });
      dispatch({ type: "SET_CONNECTED", payload: true });
      await localStorage.setOfflineMode(false);
      await localStorage.updateLastSyncDate();

      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error: any) {
      console.error("Failed to sync data:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error.message || "Failed to sync data. Please check your connection.",
      });
    }
  }, [state.isOfflineMode, state.currentUser]);

  /**
   * Login from offline mode — migrate local data to online account.
   */
  const loginFromOffline = useCallback(
    async (email: string, password: string): Promise<void> => {
      if (!state.isOfflineMode || !state.currentUser) {
        throw new Error("Not in offline mode");
      }

      try {
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({ type: "SET_ERROR", payload: null });

        const db = DatabaseService.getInstance();
        await db.initialize();

        // Login to online account
        const user = await userService.loginWithPassword(email, password);

        // Get offline data before switching
        const offlineData = await localStorage.getLocalData();
        const offlineExpenses = offlineData.expenses || [];
        const offlineGroups = offlineData.groups || [];
        const offlineFriends = offlineData.friends || [];

        // Switch to online mode
        dispatch({ type: "SET_CURRENT_USER", payload: user });
        dispatch({ type: "SET_OFFLINE_MODE", payload: false });
        dispatch({ type: "SET_CONNECTED", payload: true });
        await localStorage.setOfflineMode(false);
        await localStorage.saveUser(user);

        // Load existing online data
        await Promise.all([
          loadUserGroups(),
          loadUserExpenses(),
          loadFriends(),
        ]);

        // Migrate offline data to online
        const migratedGroups: string[] = [];
        const migratedFriends: string[] = [];

        // Migrate friends first
        for (const friend of offlineFriends) {
          if (friend.id.startsWith("offline_")) {
            try {
              const existingFriend = await userService.getUserByEmail(
                friend.email,
              );
              if (existingFriend) {
                migratedFriends.push(friend.id);
                await localStorage.updateFriendReferences(
                  friend.id,
                  existingFriend.id,
                );
              } else {
                const newFriend = await userService.createUser({
                  name: friend.name,
                  email: friend.email,
                });
                migratedFriends.push(friend.id);
                await localStorage.updateFriendReferences(
                  friend.id,
                  newFriend.id,
                );
              }
            } catch (error) {
              console.error("Failed to migrate friend:", friend, error);
            }
          }
        }

        // Migrate groups
        for (const group of offlineGroups) {
          if (group.id.startsWith("offline_")) {
            try {
              const newGroup = await groupService.createGroup({
                name: group.name,
                description: group.description,
                members: group.members,
                createdBy: user.id,
                createdAt: group.createdAt,
                simplifyDebts: group.simplifyDebts,
              });
              migratedGroups.push(group.id);
              await localStorage.updateGroupReferences(group.id, newGroup.id);
            } catch (error) {
              console.error("Failed to migrate group:", group, error);
            }
          }
        }

        // Migrate expenses
        const updatedOfflineData = await localStorage.getLocalData();
        for (const expense of offlineExpenses) {
          if (expense.id.startsWith("offline_")) {
            try {
              await expenseService.createExpense({
                description: expense.description,
                amount: expense.amount,
                paidBy: expense.paidBy,
                splitBetween: expense.splitBetween,
                splitType: expense.splitType,
                splits: expense.splits,
                category: expense.category,
                date: expense.date,
                groupId: expense.groupId,
                receipt: expense.receipt,
                currency: expense.currency,
                tags: expense.tags,
                location: expense.location,
                isRecurring: expense.isRecurring,
                recurringFrequency: expense.recurringFrequency,
                recurringEndDate: expense.recurringEndDate,
              });
            } catch (error) {
              console.error("Failed to migrate expense:", expense, error);
            }
          }
        }

        // Clear synced offline data
        await localStorage.clearSyncedOfflineData();

        // Reload all data
        await Promise.all([
          loadUserGroups(),
          loadUserExpenses(),
          loadFriends(),
          calculateUserBalance(),
        ]);

        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error: any) {
        console.error("Failed to login from offline:", error);
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_ERROR",
          payload:
            error.message ||
            "Failed to login. Please check your credentials and try again.",
        });
        throw error;
      }
    },
    [
      state.isOfflineMode,
      state.currentUser,
      userService,
      groupService,
      expenseService,
      localStorage,
      loadUserGroups,
      loadUserExpenses,
      loadFriends,
      calculateUserBalance,
    ],
  );

  return {
    loginUser,
    createUser,
    continueOffline,
    logout,
    syncData,
    loginFromOffline,
  };
}
