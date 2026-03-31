import { useCallback } from "react";
import { AppState, AppAction } from "./types";
import { User, Group, Expense, Balance, Settlement } from "../types";
import { UserService } from "../services/userService";
import { GroupService } from "../services/groupService";
import { ExpenseService } from "../services/expenseService";
import { SettlementService } from "../services/settlementService";
import LocalStorageService from "../services/localStorageService";
import NotificationService from "../services/notificationService";
import SyncQueueService from "../services/syncQueueService";
import InvitationService, { ShareChannel } from "../services/invitationService";

export function useDataActions(
  state: AppState,
  dispatch: React.Dispatch<AppAction>,
  userService: UserService,
  groupService: GroupService,
  expenseService: ExpenseService,
  localStorage: LocalStorageService,
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
            (p) => p.id === currentUserId,
          );
          const userPaid = expense.paidBy.id === currentUserId;

          if (!userParticipated && !userPaid) return;

          const userSplit = expense.splits?.find(
            (s) => s.userId === currentUserId,
          );

          if (userPaid) {
            expense.splitBetween?.forEach((participant) => {
              if (participant.id !== currentUserId) {
                const participantSplit = expense.splits?.find(
                  (s) => s.userId === participant.id,
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
          0,
        );
        const totalOwes = Object.values(balance.owes).reduce(
          (sum, amount) => sum + amount,
          0,
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
          state.currentUser.id,
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
          // Queue for sync when back online
          const syncQueue = SyncQueueService.getInstance();
          await syncQueue.enqueue("CREATE_GROUP", {
            groupData,
            userId: state.currentUser.id,
          });
        } else {
          try {
            group = await groupService.createGroup(
              groupData,
              state.currentUser.id,
            );
            await localStorage.addGroup(group);
          } catch (backendError) {
            // Fallback: save locally and queue
            group = {
              ...groupData,
              id: localStorage.generateOfflineId(),
            };
            await localStorage.addGroup(group);
            const syncQueue = SyncQueueService.getInstance();
            await syncQueue.enqueue("CREATE_GROUP", {
              groupData,
              userId: state.currentUser.id,
            });
          }
        }

        dispatch({ type: "ADD_GROUP", payload: group });
      } catch (error) {
        console.error("Failed to create group:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to create group" });
      }
    },
    [state.currentUser, state.isOfflineMode, groupService, localStorage],
  );

  const loadUserExpenses = useCallback(async (): Promise<void> => {
    if (!state.currentUser) return;

    try {
      if (state.isOfflineMode) {
        const localData = await localStorage.getLocalData();
        dispatch({ type: "SET_EXPENSES", payload: localData.expenses });
      } else {
        const expenses = await expenseService.getExpensesByUserId(
          state.currentUser.id,
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
          // --- Optimistic UI: insert immediately with a temp ID ---
          const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const optimisticExpense: Expense = {
            ...expenseData,
            id: tempId,
          } as Expense;

          // Show in UI right away
          dispatch({ type: "ADD_EXPENSE", payload: optimisticExpense });

          if (expenseData.recurring) {
            // Handle recurring expenses – replace the optimistic one with real backend data
            try {
              const expenses =
                await expenseService.createRecurringExpenses(expenseData);

              // Remove the optimistic placeholder
              dispatch({ type: "DELETE_EXPENSE", payload: tempId });

              for (const expense of expenses) {
                await localStorage.addExpense(expense);
                dispatch({ type: "ADD_EXPENSE", payload: expense });
                dispatch({
                  type: "MARK_EXPENSE_CONFIRMED",
                  payload: expense.id,
                });
              }
            } catch (backendError) {
              // Rollback the optimistic expense
              dispatch({ type: "DELETE_EXPENSE", payload: tempId });
              throw backendError;
            }
          } else {
            // Single expense – reconcile temp → real in background
            try {
              const expense = await expenseService.createExpense(expenseData);
              await localStorage.addExpense(expense);

              // Swap temp entry for the real one
              dispatch({
                type: "REPLACE_EXPENSE",
                payload: { tempId, expense },
              });

              // Fire notification for single expense
              if (state.currentUser) {
                await NotificationService.getInstance()
                  .notifyNewExpense(expense, state.currentUser)
                  .catch(() => {
                    /* swallow notification errors */
                  });

                // Schedule recurring reminder if applicable
                if (expense.recurring?.endDate) {
                  const nextDue = new Date(expense.date);
                  if (expense.recurring.frequency === "weekly") {
                    nextDue.setDate(nextDue.getDate() + 7);
                  } else if (expense.recurring.frequency === "monthly") {
                    nextDue.setMonth(nextDue.getMonth() + 1);
                  } else {
                    nextDue.setFullYear(nextDue.getFullYear() + 1);
                  }
                  if (nextDue <= new Date(expense.recurring.endDate)) {
                    await NotificationService.getInstance()
                      .scheduleRecurringExpenseReminder(expense, nextDue)
                      .catch(() => {});
                  }
                }
              }
            } catch (backendError) {
              // Rollback the optimistic expense
              dispatch({ type: "DELETE_EXPENSE", payload: tempId });
              throw backendError;
            }
          }
        }

        await calculateUserBalance();
      } catch (error) {
        // Queue the failed action for background sync
        console.error(
          "Failed to create expense, queuing for later sync:",
          error,
        );
        const syncQueue = SyncQueueService.getInstance();
        await syncQueue.enqueue("CREATE_EXPENSE", expenseData);
        // Keep the optimistic entry in local storage for offline access
        dispatch({
          type: "SET_ERROR",
          payload:
            "Expense saved locally. It will sync when you're back online.",
        });
      }
    },
    [
      state.isOfflineMode,
      state.currentUser,
      expenseService,
      localStorage,
      calculateUserBalance,
    ],
  );

  const updateExpense = useCallback(
    async (
      expenseId: string,
      expenseData: Partial<Omit<Expense, "id">>,
    ): Promise<void> => {
      try {
        let updatedExpense: Expense | null = null;

        if (state.isOfflineMode) {
          const localData =
            await LocalStorageService.getInstance().getLocalData();
          const existing = localData.expenses.find((e) => e.id === expenseId);
          if (existing) {
            updatedExpense = { ...existing, ...expenseData };
            // Update in local storage via delete + add
            await localStorage.deleteExpense(expenseId);
            await localStorage.addExpense(updatedExpense);
          }
        } else {
          updatedExpense = await expenseService.updateExpense(
            expenseId,
            expenseData,
          );
          if (updatedExpense) {
            await localStorage.deleteExpense(expenseId);
            await localStorage.addExpense(updatedExpense);
          }
        }

        if (updatedExpense) {
          dispatch({ type: "UPDATE_EXPENSE", payload: updatedExpense });
          await calculateUserBalance();
        }
      } catch (error) {
        console.error("Failed to update expense:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to update expense" });
      }
    },
    [state.isOfflineMode, expenseService, localStorage, calculateUserBalance],
  );

  const settlementService = SettlementService.getInstance();

  const settleUp = useCallback(
    async (
      toUserId: string,
      amount: number,
      note?: string,
      paymentMethod?: string,
    ): Promise<void> => {
      if (!state.currentUser) return;

      try {
        const settlement = await settlementService.createSettlement({
          fromUserId: state.currentUser.id,
          toUserId,
          amount,
          paymentMethod,
          note,
        });

        dispatch({ type: "ADD_SETTLEMENT", payload: settlement });

        // Notify about the settlement
        const toUser = state.friends.find((f) => f.id === toUserId);
        if (toUser) {
          await NotificationService.getInstance().notifySettlement(
            state.currentUser,
            toUser,
            amount,
          );
        }

        await calculateUserBalance();
      } catch (error) {
        console.error("Failed to record settlement:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to record settlement" });
      }
    },
    [state.currentUser, state.friends, calculateUserBalance],
  );

  const deleteExpense = useCallback(
    async (expenseId: string): Promise<void> => {
      try {
        // Optimistic delete from UI immediately
        dispatch({ type: "DELETE_EXPENSE", payload: expenseId });

        if (state.isOfflineMode) {
          await localStorage.deleteExpense(expenseId);
          // Queue for sync
          const syncQueue = SyncQueueService.getInstance();
          await syncQueue.enqueue("DELETE_EXPENSE", { expenseId });
        } else {
          try {
            const success = await expenseService.deleteExpense(expenseId);
            if (success) {
              await localStorage.deleteExpense(expenseId);
            }
          } catch (backendError) {
            // Queue for later sync, keep optimistic delete
            const syncQueue = SyncQueueService.getInstance();
            await syncQueue.enqueue("DELETE_EXPENSE", { expenseId });
            await localStorage.deleteExpense(expenseId);
          }
        }

        await calculateUserBalance();
      } catch (error) {
        console.error("Failed to delete expense:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to delete expense" });
      }
    },
    [state.isOfflineMode, expenseService, localStorage, calculateUserBalance],
  );

  const getExpensesByCategory = useCallback(
    async (category: string): Promise<Expense[]> => {
      if (!state.currentUser) return [];

      try {
        if (state.isOfflineMode) {
          const localData = await localStorage.getLocalData();
          return localData.expenses.filter(
            (expense) => expense.category === category,
          );
        } else {
          return await expenseService.getExpensesByCategory(
            category,
            state.currentUser.id,
          );
        }
      } catch (error) {
        console.error("Failed to get expenses by category:", error);
        return [];
      }
    },
    [state.currentUser, state.isOfflineMode, expenseService, localStorage],
  );

  const getExpensesByTags = useCallback(
    async (tags: string[]): Promise<Expense[]> => {
      if (!state.currentUser) return [];

      try {
        if (state.isOfflineMode) {
          const localData = await localStorage.getLocalData();
          return localData.expenses.filter(
            (expense) =>
              expense.tags && expense.tags.some((tag) => tags.includes(tag)),
          );
        } else {
          return await expenseService.getExpensesByTags(
            tags,
            state.currentUser.id,
          );
        }
      } catch (error) {
        console.error("Failed to get expenses by tags:", error);
        return [];
      }
    },
    [state.currentUser, state.isOfflineMode, expenseService, localStorage],
  );

  const getExpensesByLocation = useCallback(
    async (
      latitude: number,
      longitude: number,
      radiusKm: number = 1,
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
              expense.location.longitude,
            );
            return distance <= radiusKm;
          });
        } else {
          return await expenseService.getExpensesByLocation(
            latitude,
            longitude,
            radiusKm,
            state.currentUser.id,
          );
        }
      } catch (error) {
        console.error("Failed to get expenses by location:", error);
        return [];
      }
    },
    [state.currentUser, state.isOfflineMode, expenseService, localStorage],
  );

  // Helper function for distance calculation
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
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
          (user) => user.id !== state.currentUser?.id,
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

        // Prevent adding duplicates (e.g. existing Supabase user already a friend)
        const alreadyAdded = state.friends.some(
          (f) =>
            f.id === friend.id ||
            (friend.email &&
              f.email.toLowerCase() === friend.email.toLowerCase()),
        );
        if (alreadyAdded) {
          throw new Error("already_friend");
        }

        dispatch({ type: "ADD_FRIEND", payload: friend });
      } catch (error) {
        if ((error as Error).message === "already_friend") throw error;
        console.error("Failed to add friend:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to add friend" });
        throw error;
      }
    },
    [state.isOfflineMode, state.friends, userService, localStorage],
  );

  const updateProfile = useCallback(
    async (name: string, email: string): Promise<void> => {
      if (!state.currentUser) return;
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const updatedUser = await userService.updateUser(state.currentUser.id, {
        name: trimmedName,
        email: trimmedEmail,
      });
      if (updatedUser) {
        dispatch({ type: "SET_CURRENT_USER", payload: updatedUser });
      }
    },
    [state.currentUser, userService, dispatch],
  );

  // ── Invitation actions ────────────────────────────────────────────────

  const invitationService = InvitationService.getInstance();

  const loadInvitations = useCallback(async (): Promise<void> => {
    try {
      const invitations = await invitationService.getInvitations();
      dispatch({ type: "SET_INVITATIONS", payload: invitations });
    } catch (error) {
      console.error("Failed to load invitations:", error);
    }
  }, [dispatch]);

  const sendInvitation = useCallback(
    async (
      toPhone: string,
      toName: string,
      message?: string,
      channel?: ShareChannel,
    ): Promise<void> => {
      if (!state.currentUser) return;
      try {
        const invitation = await invitationService.sendInvitation(
          state.currentUser.id,
          state.currentUser.name,
          toPhone,
          toName,
          message,
          channel,
        );
        dispatch({ type: "ADD_INVITATION", payload: invitation });
      } catch (error: any) {
        console.error("Failed to send invitation:", error);
        throw error; // Let the UI handle the specific error message
      }
    },
    [state.currentUser, dispatch],
  );

  const cancelInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      try {
        await invitationService.deleteInvitation(invitationId);
        dispatch({ type: "REMOVE_INVITATION", payload: invitationId });
      } catch (error) {
        console.error("Failed to cancel invitation:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to cancel invitation" });
      }
    },
    [dispatch],
  );

  const resendInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      try {
        await invitationService.resendInvitation(invitationId);
      } catch (error: any) {
        console.error("Failed to resend invitation:", error);
        throw error;
      }
    },
    [],
  );

  const markInvitationAccepted = useCallback(
    async (invitationId: string): Promise<void> => {
      try {
        const updated = await invitationService.updateInvitationStatus(
          invitationId,
          "accepted",
        );
        if (updated) {
          dispatch({ type: "UPDATE_INVITATION", payload: updated });
        }
      } catch (error) {
        console.error("Failed to update invitation:", error);
      }
    },
    [dispatch],
  );

  const addMemberToGroup = useCallback(
    async (groupId: string, member: User): Promise<void> => {
      try {
        const updatedGroup = await groupService.addMemberToGroup(groupId, member);
        if (updatedGroup) {
          dispatch({ type: "UPDATE_GROUP", payload: updatedGroup });
          await localStorage.saveGroups(
            state.groups.map((g) => (g.id === groupId ? updatedGroup : g))
          );
        }
      } catch (error) {
        console.error("Failed to add member:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to add member to group" });
        throw error;
      }
    },
    [groupService, localStorage, state.groups]
  );

  const removeMemberFromGroup = useCallback(
    async (groupId: string, memberId: string): Promise<void> => {
      try {
        const group = state.groups.find((g) => g.id === groupId);
        if (!group) throw new Error("Group not found");

        // Calculate member's balance in the group
        const groupExpenses = state.expenses.filter((e) => e.groupId === groupId);
        let memberBalance = 0;

        groupExpenses.forEach((expense) => {
          const memberSplit = expense.splits.find((s) => s.userId === memberId);
          if (!memberSplit) return;

          if (expense.paidBy.id === memberId) {
            memberBalance += expense.amount - (memberSplit.amount ?? 0);
          } else {
            memberBalance -= memberSplit.amount ?? 0;
          }
        });

        // Prevent removal if member has unsettled balance
        if (Math.abs(memberBalance) > 0.01) {
          throw new Error(
            `Cannot remove member. They have an unsettled balance of ₹${Math.abs(memberBalance).toFixed(2)}`
          );
        }

        const updatedGroup = await groupService.removeMemberFromGroup(groupId, memberId);
        if (updatedGroup) {
          dispatch({ type: "UPDATE_GROUP", payload: updatedGroup });
          await localStorage.saveGroups(
            state.groups.map((g) => (g.id === groupId ? updatedGroup : g))
          );
        }
      } catch (error) {
        console.error("Failed to remove member:", error);
        throw error;
      }
    },
    [groupService, localStorage, state.groups, state.expenses]
  );

  return {
    loadUserGroups,
    createGroup,
    loadUserExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    settleUp,
    loadFriends,
    addFriend,
    calculateUserBalance,
    getExpensesByCategory,
    getExpensesByTags,
    getExpensesByLocation,
    updateProfile,
    loadInvitations,
    sendInvitation,
    cancelInvitation,
    resendInvitation,
    markInvitationAccepted,
    addMemberToGroup,
    removeMemberFromGroup,
  };
}
