import { useCallback } from "react";
import { AppState, AppAction } from "./types";
import { User, Group, Expense, Balance } from "../types";
import { UserService } from "../services/userService";
import { GroupService } from "../services/groupService";
import { ExpenseService } from "../services/expenseService";
import LocalStorageService from "../services/localStorageService";

export function useDataActions(
  state: AppState,
  dispatch: React.Dispatch<AppAction>,
  userService: UserService,
  groupService: GroupService,
  expenseService: ExpenseService,
  localStorage: LocalStorageService
) {
  const calculateUserBalance = useCallback(async (): Promise<void> => {
    if (!state.currentUser) return;

    const currentUserId = state.currentUser.id; // Store the ID to avoid repeated null checks

    try {
      if (state.isOfflineMode) {
        // Calculate balance from local data
        const localData = await localStorage.getLocalData();

        const balance: Balance = {
          userId: currentUserId,
          owes: {},
          owedBy: {},
          totalBalance: 0,
        };

        localData.expenses.forEach((expense) => {
          const userParticipated = expense.splitBetween?.some(
            (p) => p.id === currentUserId
          );
          const userPaid = expense.paidBy.id === currentUserId;

          if (!userParticipated && !userPaid) return;

          const userSplit = expense.splits?.find(
            (s) => s.userId === currentUserId
          );

          if (userPaid) {
            expense.splitBetween?.forEach((participant) => {
              if (participant.id !== currentUserId) {
                const participantSplit = expense.splits?.find(
                  (s) => s.userId === participant.id
                );

                if (participantSplit && (participantSplit.amount || 0) > 0) {
                  balance.owedBy[participant.id] =
                    (balance.owedBy[participant.id] || 0) +
                    (participantSplit.amount || 0);
                }
              }
            });
          } else if (
            userParticipated &&
            userSplit &&
            (userSplit.amount || 0) > 0
          ) {
            balance.owes[expense.paidBy.id] =
              (balance.owes[expense.paidBy.id] || 0) + (userSplit.amount || 0);
          }
        });

        // Simplify balances
        Object.keys(balance.owes).forEach((otherId) => {
          const userOwes = balance.owes[otherId] || 0;
          const otherOwes = balance.owedBy[otherId] || 0;

          if (userOwes > 0 && otherOwes > 0) {
            const netAmount = userOwes - otherOwes;
            delete balance.owes[otherId];
            delete balance.owedBy[otherId];

            if (netAmount > 0) {
              balance.owes[otherId] = netAmount;
            } else if (netAmount < 0) {
              balance.owedBy[otherId] = Math.abs(netAmount);
            }
          }
        });

        const totalOwed = Object.values(balance.owedBy).reduce(
          (sum, amount) => sum + amount,
          0
        );
        const totalOwes = Object.values(balance.owes).reduce(
          (sum, amount) => sum + amount,
          0
        );
        balance.totalBalance = totalOwed - totalOwes;

        await localStorage.saveBalances([balance]);
        dispatch({ type: "UPDATE_BALANCES", payload: [balance] });
      } else {
        const balance = await expenseService.calculateBalances(currentUserId);
        dispatch({ type: "UPDATE_BALANCES", payload: [balance] });
        await localStorage.saveBalances([balance]);
      }
    } catch (error) {
      console.error("Failed to calculate balance:", error);
      if (!state.isOfflineMode) {
        dispatch({ type: "SET_ERROR", payload: "Failed to calculate balance" });
      }
    }
  }, [state.currentUser, state.isOfflineMode, expenseService, localStorage]);

  const loadUserGroups = useCallback(async (): Promise<void> => {
    if (!state.currentUser) return;

    try {
      if (state.isOfflineMode) {
        const localData = await localStorage.getLocalData();
        dispatch({ type: "SET_GROUPS", payload: localData.groups });
      } else {
        const groups = await groupService.getGroupsByUserId(
          state.currentUser.id
        );
        dispatch({ type: "SET_GROUPS", payload: groups });
        await localStorage.saveGroups(groups);
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
      if (!state.isOfflineMode) {
        dispatch({ type: "SET_ERROR", payload: "Failed to load groups" });
      }
    }
  }, [state.currentUser, state.isOfflineMode, groupService, localStorage]);

  const createGroup = useCallback(
    async (groupData: Omit<Group, "id">): Promise<void> => {
      if (!state.currentUser) return;

      try {
        let group: Group;

        if (state.isOfflineMode) {
          group = {
            ...groupData,
            id: localStorage.generateOfflineId(),
          };
          await localStorage.addGroup(group);
        } else {
          group = await groupService.createGroup(
            groupData,
            state.currentUser.id
          );
          await localStorage.addGroup(group);
        }

        dispatch({ type: "ADD_GROUP", payload: group });
      } catch (error) {
        console.error("Failed to create group:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to create group" });
      }
    },
    [state.currentUser, state.isOfflineMode, groupService, localStorage]
  );

  const loadUserExpenses = useCallback(async (): Promise<void> => {
    if (!state.currentUser) return;

    try {
      if (state.isOfflineMode) {
        const localData = await localStorage.getLocalData();
        dispatch({ type: "SET_EXPENSES", payload: localData.expenses });
      } else {
        const expenses = await expenseService.getExpensesByUserId(
          state.currentUser.id
        );
        dispatch({ type: "SET_EXPENSES", payload: expenses });
        await localStorage.saveExpenses(expenses);
      }
    } catch (error) {
      console.error("Failed to load expenses:", error);
      if (!state.isOfflineMode) {
        dispatch({ type: "SET_ERROR", payload: "Failed to load expenses" });
      }
    }
  }, [state.currentUser, state.isOfflineMode, expenseService, localStorage]);

  const createExpense = useCallback(
    async (expenseData: Omit<Expense, "id">): Promise<void> => {
      try {
        if (state.isOfflineMode) {
          const expense: Expense = {
            ...expenseData,
            id: localStorage.generateOfflineId(),
          };
          await localStorage.addExpense(expense);
          dispatch({ type: "ADD_EXPENSE", payload: expense });
        } else {
          if (expenseData.recurring) {
            // Handle recurring expenses
            const expenses = await expenseService.createRecurringExpenses(
              expenseData
            );

            // Add all recurring expenses to local storage and state
            for (const expense of expenses) {
              await localStorage.addExpense(expense);
              dispatch({ type: "ADD_EXPENSE", payload: expense });
            }
          } else {
            // Handle single expense
            const expense = await expenseService.createExpense(expenseData);
            await localStorage.addExpense(expense);
            dispatch({ type: "ADD_EXPENSE", payload: expense });
          }
        }

        await calculateUserBalance();
      } catch (error) {
        console.error("Failed to create expense:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to create expense" });
      }
    },
    [state.isOfflineMode, expenseService, localStorage, calculateUserBalance]
  );

  const deleteExpense = useCallback(
    async (expenseId: string): Promise<void> => {
      try {
        if (state.isOfflineMode) {
          await localStorage.deleteExpense(expenseId);
        } else {
          const success = await expenseService.deleteExpense(expenseId);
          if (success) {
            await localStorage.deleteExpense(expenseId);
          }
        }

        dispatch({ type: "DELETE_EXPENSE", payload: expenseId });
        await calculateUserBalance();
      } catch (error) {
        console.error("Failed to delete expense:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to delete expense" });
      }
    },
    [state.isOfflineMode, expenseService, localStorage, calculateUserBalance]
  );

  const getExpensesByCategory = useCallback(
    async (category: string): Promise<Expense[]> => {
      if (!state.currentUser) return [];

      try {
        if (state.isOfflineMode) {
          const localData = await localStorage.getLocalData();
          return localData.expenses.filter(
            (expense) => expense.category === category
          );
        } else {
          return await expenseService.getExpensesByCategory(
            category,
            state.currentUser.id
          );
        }
      } catch (error) {
        console.error("Failed to get expenses by category:", error);
        return [];
      }
    },
    [state.currentUser, state.isOfflineMode, expenseService, localStorage]
  );

  const getExpensesByTags = useCallback(
    async (tags: string[]): Promise<Expense[]> => {
      if (!state.currentUser) return [];

      try {
        if (state.isOfflineMode) {
          const localData = await localStorage.getLocalData();
          return localData.expenses.filter(
            (expense) =>
              expense.tags && expense.tags.some((tag) => tags.includes(tag))
          );
        } else {
          return await expenseService.getExpensesByTags(
            tags,
            state.currentUser.id
          );
        }
      } catch (error) {
        console.error("Failed to get expenses by tags:", error);
        return [];
      }
    },
    [state.currentUser, state.isOfflineMode, expenseService, localStorage]
  );

  const getExpensesByLocation = useCallback(
    async (
      latitude: number,
      longitude: number,
      radiusKm: number = 1
    ): Promise<Expense[]> => {
      if (!state.currentUser) return [];

      try {
        if (state.isOfflineMode) {
          const localData = await localStorage.getLocalData();
          // Simple distance calculation for offline mode
          return localData.expenses.filter((expense) => {
            if (!expense.location) return false;
            const distance = calculateDistance(
              latitude,
              longitude,
              expense.location.latitude,
              expense.location.longitude
            );
            return distance <= radiusKm;
          });
        } else {
          return await expenseService.getExpensesByLocation(
            latitude,
            longitude,
            radiusKm,
            state.currentUser.id
          );
        }
      } catch (error) {
        console.error("Failed to get expenses by location:", error);
        return [];
      }
    },
    [state.currentUser, state.isOfflineMode, expenseService, localStorage]
  );

  // Helper function for distance calculation
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const loadFriends = useCallback(async (): Promise<void> => {
    try {
      if (state.isOfflineMode) {
        const localData = await localStorage.getLocalData();
        dispatch({ type: "SET_FRIENDS", payload: localData.friends });
      } else {
        const allUsers = await userService.getAllUsers();
        const friends = allUsers.filter(
          (user) => user.id !== state.currentUser?.id
        );
        dispatch({ type: "SET_FRIENDS", payload: friends });
        await localStorage.saveFriends(friends);
      }
    } catch (error) {
      console.error("Failed to load friends:", error);
      if (!state.isOfflineMode) {
        dispatch({ type: "SET_ERROR", payload: "Failed to load friends" });
      }
    }
  }, [state.currentUser, state.isOfflineMode, userService, localStorage]);

  const addFriend = useCallback(
    async (friendData: Omit<User, "id">): Promise<void> => {
      try {
        let friend: User;

        if (state.isOfflineMode) {
          friend = {
            ...friendData,
            id: localStorage.generateOfflineId(),
          };
          await localStorage.addFriend(friend);
        } else {
          friend = await userService.createUser(friendData);
          await localStorage.addFriend(friend);
        }

        dispatch({ type: "ADD_FRIEND", payload: friend });
      } catch (error) {
        console.error("Failed to add friend:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to add friend" });
      }
    },
    [state.isOfflineMode, userService, localStorage]
  );

  return {
    loadUserGroups,
    createGroup,
    loadUserExpenses,
    createExpense,
    deleteExpense,
    loadFriends,
    addFriend,
    calculateUserBalance,
    getExpensesByCategory,
    getExpensesByTags,
    getExpensesByLocation,
  };
}
