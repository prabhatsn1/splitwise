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
  calculateUserBalance: () => Promise<void>
) {
  // Helper function to calculate balances from local data
  const calculateOfflineBalance = useCallback(
    async (
      userId: string,
      expenses: Expense[],
      friends: User[]
    ): Promise<void> => {
      try {
        const balance: Balance = {
          userId,
          owes: {},
          owedBy: {},
          totalBalance: 0,
        };

        // Calculate balances from expenses
        expenses.forEach((expense) => {
          const userParticipated = expense.splitBetween?.some(
            (p) => p.id === userId
          );
          const userPaid = expense.paidBy.id === userId;

          if (!userParticipated && !userPaid) {
            return;
          }

          const userSplit = expense.splits?.find((s) => s.userId === userId);

          if (userPaid) {
            expense.splitBetween?.forEach((participant) => {
              if (participant.id !== userId) {
                const participantSplit = expense.splits?.find(
                  (s) => s.userId === participant.id
                );

                if (participantSplit && participantSplit.amount > 0) {
                  const friendId = participant.id;
                  balance.owedBy[friendId] =
                    (balance.owedBy[friendId] || 0) + participantSplit.amount;
                }
              }
            });
          } else if (userParticipated && userSplit && userSplit.amount > 0) {
            const payerId = expense.paidBy.id;
            balance.owes[payerId] =
              (balance.owes[payerId] || 0) + userSplit.amount;
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
          0
        );
        const totalOwes = Object.values(simplifiedBalance.owes).reduce(
          (sum, amount) => sum + amount,
          0
        );
        simplifiedBalance.totalBalance = totalOwed - totalOwes;

        await localStorage.saveBalances([simplifiedBalance]);
        dispatch({ type: "UPDATE_BALANCES", payload: [simplifiedBalance] });

        console.log(
          `Calculated offline balance: ${simplifiedBalance.totalBalance}`
        );
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
    [localStorage]
  );

  const loginUser = useCallback(
    async (email: string): Promise<void> => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        await DatabaseService.getInstance().connect();
        const user = await userService.getUserByEmail(email);

        if (user) {
          dispatch({ type: "SET_CURRENT_USER", payload: user });
          dispatch({ type: "SET_OFFLINE_MODE", payload: false });
          await localStorage.setOfflineMode(false);
          await localStorage.saveUser(user);

          await Promise.all([
            loadUserGroups(),
            loadUserExpenses(),
            loadFriends(),
            calculateUserBalance(),
          ]);
        } else {
          throw new Error("User not found");
        }

        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error) {
        console.error("Failed to login user:", error);
        dispatch({
          type: "SET_ERROR",
          payload: "Login failed. Please check your connection and try again.",
        });
      }
    },
    [userService]
  );

  const createUser = useCallback(
    async (userData: Omit<User, "id">): Promise<void> => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        await DatabaseService.getInstance().connect();
        const user = await userService.createUser(userData);

        dispatch({ type: "SET_CURRENT_USER", payload: user });
        dispatch({ type: "SET_OFFLINE_MODE", payload: false });
        await localStorage.setOfflineMode(false);
        await localStorage.saveUser(user);

        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error) {
        console.error("Failed to create user:", error);
        dispatch({
          type: "SET_ERROR",
          payload: "Signup failed. Please check your connection and try again.",
        });
      }
    },
    [userService]
  );

  const continueOffline = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const localData = await localStorage.getLocalData();
      let offlineUser = localData.currentUser;

      if (!offlineUser || !offlineUser.id) {
        offlineUser = localStorage.createOfflineUser();
        await localStorage.saveUser(offlineUser);
        console.log("Created new offline user:", offlineUser.id);
      } else {
        console.log("Using existing offline user:", offlineUser.id);
      }

      dispatch({ type: "SET_CURRENT_USER", payload: offlineUser });
      dispatch({ type: "SET_OFFLINE_MODE", payload: true });
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
        group.members?.some((member) => member.id === offlineUser.id)
      );

      const userExpenses = expenses.filter(
        (expense) =>
          expense.paidBy.id === offlineUser.id ||
          expense.splitBetween?.some((p) => p.id === offlineUser.id)
      );

      const userBalances = balances.filter(
        (balance) => balance.userId === offlineUser.id
      );

      dispatch({ type: "SET_GROUPS", payload: userGroups });
      dispatch({ type: "SET_EXPENSES", payload: userExpenses });
      dispatch({ type: "SET_FRIENDS", payload: friends });
      dispatch({ type: "UPDATE_BALANCES", payload: userBalances });

      if (userBalances.length === 0 && userExpenses.length > 0) {
        await calculateOfflineBalance(offlineUser.id, userExpenses, friends);
      }

      console.log(
        `Offline mode initialized with ${userGroups.length} groups, ${userExpenses.length} expenses, ${friends.length} friends`
      );

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
          "Critical error: Could not initialize offline mode:",
          fallbackError
        );
        dispatch({
          type: "SET_ERROR",
          payload: "Critical error initializing offline mode",
        });
      }
    }
  }, [localStorage, calculateOfflineBalance]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await localStorage.clearLocalData();
      await localStorage.setOfflineMode(false);
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }, [localStorage]);

  const syncData = useCallback(async (): Promise<void> => {
    if (!state.isOfflineMode || !state.currentUser) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      await DatabaseService.getInstance().connect();

      const localData = await localStorage.getLocalData();
      const syncResults = {
        groups: { synced: 0, failed: 0 },
        expenses: { synced: 0, failed: 0 },
        friends: { synced: 0, failed: 0 },
      };

      let onlineUser = state.currentUser;
      if (state.currentUser.id.startsWith("offline_")) {
        try {
          const existingUser = await userService.getUserByEmail(
            state.currentUser.email
          );
          if (existingUser) {
            onlineUser = existingUser;
          } else {
            const { id, ...userDataWithoutId } = state.currentUser;
            onlineUser = await userService.createUser(userDataWithoutId);
          }

          await localStorage.saveUser(onlineUser);
          dispatch({ type: "SET_CURRENT_USER", payload: onlineUser });
        } catch (error) {
          console.error("Failed to sync user:", error);
          throw new Error("Failed to sync user account");
        }
      }

      // Sync friends
      for (const friend of localData.friends) {
        if (friend.id.startsWith("offline_")) {
          try {
            const { id, ...friendDataWithoutId } = friend;
            const onlineFriend = await userService.createUser(
              friendDataWithoutId
            );

            await localStorage.updateFriendReferences(
              friend.id,
              onlineFriend.id
            );
            syncResults.friends.synced++;
          } catch (error) {
            console.error(`Failed to sync friend ${friend.name}:`, error);
            syncResults.friends.failed++;
          }
        }
      }

      // Sync groups
      for (const group of localData.groups) {
        if (group.id.startsWith("offline_")) {
          try {
            const { id, ...groupDataWithoutId } = group;
            const onlineGroup = await groupService.createGroup(
              groupDataWithoutId,
              onlineUser.id
            );

            await localStorage.updateGroupReferences(group.id, onlineGroup.id);
            syncResults.groups.synced++;
          } catch (error) {
            console.error(`Failed to sync group ${group.name}:`, error);
            syncResults.groups.failed++;
          }
        }
      }

      // Sync expenses
      for (const expense of localData.expenses) {
        if (expense.id.startsWith("offline_")) {
          try {
            const { id, ...expenseDataWithoutId } = expense;
            await expenseService.createExpense(expenseDataWithoutId);
            syncResults.expenses.synced++;
          } catch (error) {
            console.error(
              `Failed to sync expense ${expense.description}:`,
              error
            );
            syncResults.expenses.failed++;
          }
        }
      }

      await Promise.all([
        loadUserGroups(),
        loadUserExpenses(),
        loadFriends(),
        calculateUserBalance(),
      ]);

      dispatch({ type: "SET_OFFLINE_MODE", payload: false });
      await localStorage.setOfflineMode(false);
      await localStorage.updateLastSyncDate();
      await localStorage.clearSyncedOfflineData();

      const totalSynced =
        syncResults.groups.synced +
        syncResults.expenses.synced +
        syncResults.friends.synced;
      const totalFailed =
        syncResults.groups.failed +
        syncResults.expenses.failed +
        syncResults.friends.failed;

      console.log(
        `Sync completed: ${totalSynced} items synced, ${totalFailed} items failed`
      );

      if (totalFailed > 0) {
        dispatch({
          type: "SET_ERROR",
          payload: `Sync completed with ${totalFailed} items that couldn't be synced. They remain stored locally.`,
        });
      }

      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      console.error("Failed to sync data:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          "Failed to sync data. Please check your connection and try again.",
      });
    }
  }, [
    state.isOfflineMode,
    state.currentUser,
    userService,
    groupService,
    expenseService,
    localStorage,
  ]);

  return {
    loginUser,
    createUser,
    continueOffline,
    logout,
    syncData,
  };
}
