import AsyncStorage from "@react-native-async-storage/async-storage";
import { NetworkService } from "./networkService";
import { ExpenseService } from "./expenseService";
import { GroupService } from "./groupService";
import { UserService } from "./userService";
import LocalStorageService from "./localStorageService";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SyncActionType =
  | "CREATE_EXPENSE"
  | "UPDATE_EXPENSE"
  | "DELETE_EXPENSE"
  | "CREATE_GROUP"
  | "ADD_FRIEND"
  | "SETTLE_UP";

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  payload: any;
  createdAt: string; // ISO string
  retryCount: number;
  lastError?: string;
}

export type SyncStatus = "idle" | "syncing" | "error";

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  status: SyncStatus;
}

// ── Listeners ──────────────────────────────────────────────────────────────────

type SyncProgressListener = (progress: SyncProgress) => void;

// ── Service ────────────────────────────────────────────────────────────────────

const QUEUE_STORAGE_KEY = "@splitwise_sync_queue";
const MAX_RETRIES = 3;

class SyncQueueService {
  private static instance: SyncQueueService;
  private queue: SyncQueueItem[] = [];
  private isSyncing = false;
  private listeners: SyncProgressListener[] = [];
  private networkUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.loadQueue();
    this.startNetworkListener();
  }

  static getInstance(): SyncQueueService {
    if (!SyncQueueService.instance) {
      SyncQueueService.instance = new SyncQueueService();
    }
    return SyncQueueService.instance;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Enqueue an offline action to be replayed when connectivity returns.
   */
  async enqueue(action: SyncActionType, payload: any): Promise<string> {
    const item: SyncQueueItem = {
      id: `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    this.queue.push(item);
    await this.persistQueue();
    return item.id;
  }

  /**
   * Remove a specific item from the queue (e.g. after manual cancel).
   */
  async remove(itemId: string): Promise<void> {
    this.queue = this.queue.filter((i) => i.id !== itemId);
    await this.persistQueue();
  }

  /**
   * Get a snapshot of the current queue.
   */
  getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get the number of pending items.
   */
  get pendingCount(): number {
    return this.queue.length;
  }

  /**
   * Subscribe to sync progress updates. Returns an unsubscribe function.
   */
  addProgressListener(listener: SyncProgressListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Manually trigger a sync attempt. No-op if already syncing or queue is empty.
   */
  async flush(
    userId?: string,
    dispatch?: React.Dispatch<any>,
  ): Promise<SyncProgress> {
    if (this.isSyncing || this.queue.length === 0) {
      return {
        total: this.queue.length,
        completed: 0,
        failed: 0,
        status: "idle",
      };
    }

    const network = NetworkService.getInstance();
    const isOnline = await network.checkConnectivity();
    if (!isOnline) {
      return {
        total: this.queue.length,
        completed: 0,
        failed: 0,
        status: "idle",
      };
    }

    return this.processQueue(userId, dispatch);
  }

  // ── Queue processing ──────────────────────────────────────────────────────

  private async processQueue(
    userId?: string,
    dispatch?: React.Dispatch<any>,
  ): Promise<SyncProgress> {
    this.isSyncing = true;
    const total = this.queue.length;
    let completed = 0;
    let failed = 0;

    this.notifyListeners({ total, completed, failed, status: "syncing" });

    const expenseService = new ExpenseService();
    const groupService = new GroupService();
    const userService = new UserService();

    // Process in FIFO order — we iterate over a snapshot
    const snapshot = [...this.queue];
    for (const item of snapshot) {
      try {
        await this.processItem(
          item,
          expenseService,
          groupService,
          userService,
          userId,
          dispatch,
        );

        // Remove successfully processed item
        this.queue = this.queue.filter((i) => i.id !== item.id);
        completed++;
      } catch (error: any) {
        item.retryCount++;
        item.lastError = error?.message ?? String(error);

        if (item.retryCount >= MAX_RETRIES) {
          // Give up on this item — leave it but mark the error
          failed++;
          console.warn(
            `Sync item ${item.id} (${item.action}) failed after ${MAX_RETRIES} retries:`,
            error,
          );
        }
      }

      this.notifyListeners({ total, completed, failed, status: "syncing" });
    }

    // Remove items that exceeded MAX_RETRIES
    this.queue = this.queue.filter((i) => i.retryCount < MAX_RETRIES);

    await this.persistQueue();
    this.isSyncing = false;

    const finalStatus: SyncStatus = failed > 0 ? "error" : "idle";
    const progress: SyncProgress = {
      total,
      completed,
      failed,
      status: finalStatus,
    };
    this.notifyListeners(progress);
    return progress;
  }

  private async processItem(
    item: SyncQueueItem,
    expenseService: ExpenseService,
    groupService: GroupService,
    userService: UserService,
    userId?: string,
    dispatch?: React.Dispatch<any>,
  ): Promise<void> {
    switch (item.action) {
      case "CREATE_EXPENSE": {
        const expense = await expenseService.createExpense(item.payload);
        const localStorage = LocalStorageService.getInstance();
        await localStorage.addExpense(expense);
        if (dispatch) {
          dispatch({ type: "ADD_EXPENSE", payload: expense });
          dispatch({ type: "MARK_EXPENSE_CONFIRMED", payload: expense.id });
        }
        break;
      }
      case "UPDATE_EXPENSE": {
        const { expenseId, data } = item.payload;
        const updated = await expenseService.updateExpense(expenseId, data);
        if (updated && dispatch) {
          dispatch({ type: "UPDATE_EXPENSE", payload: updated });
        }
        break;
      }
      case "DELETE_EXPENSE": {
        await expenseService.deleteExpense(item.payload.expenseId);
        break;
      }
      case "CREATE_GROUP": {
        const group = await groupService.createGroup(
          item.payload.groupData,
          userId ?? item.payload.userId,
        );
        const localStorage = LocalStorageService.getInstance();
        await localStorage.addGroup(group);
        if (dispatch) {
          dispatch({ type: "ADD_GROUP", payload: group });
        }
        break;
      }
      case "ADD_FRIEND": {
        const friend = await userService.createUser(item.payload);
        const localStorage = LocalStorageService.getInstance();
        await localStorage.addFriend(friend);
        if (dispatch) {
          dispatch({ type: "ADD_FRIEND", payload: friend });
        }
        break;
      }
      case "SETTLE_UP": {
        // Settlements are currently local-only; nothing to replay for now.
        break;
      }
      default:
        console.warn(`Unknown sync action: ${item.action}`);
    }
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  private async loadQueue(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw) as SyncQueueItem[];
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
      this.queue = [];
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("Failed to persist sync queue:", error);
    }
  }

  // ── Network listener ────────────────────────────────────────────────────

  private startNetworkListener(): void {
    const network = NetworkService.getInstance();
    this.networkUnsubscribe = network.addListener((status) => {
      if (status.isConnected && this.queue.length > 0 && !this.isSyncing) {
        console.log(
          "[SyncQueue] Network restored – flushing",
          this.queue.length,
          "queued actions",
        );
        // Auto-flush; we don't have dispatch here, so updates go through localStorage only.
        this.flush().catch((err) =>
          console.error("[SyncQueue] Auto-flush failed:", err),
        );
      }
    });
  }

  // ── Listener helpers ─────────────────────────────────────────────────────

  private notifyListeners(progress: SyncProgress): void {
    for (const listener of this.listeners) {
      try {
        listener(progress);
      } catch {
        // swallow
      }
    }
  }

  /**
   * Cleanup (mostly for testing).
   */
  destroy(): void {
    this.networkUnsubscribe?.();
    this.listeners = [];
  }
}

export default SyncQueueService;
