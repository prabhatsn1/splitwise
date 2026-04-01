import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseService } from "./database";
import { Expense, Group } from "../types";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SyncActionType =
  | "CREATE_EXPENSE"
  | "UPDATE_EXPENSE"
  | "DELETE_EXPENSE"
  | "CREATE_GROUP"
  | "ADD_FRIEND"
  | "SETTLE_UP";

/** Discriminated union — each action carries a strongly-typed payload. */
export type SyncPayload =
  | { action: "CREATE_EXPENSE"; payload: Omit<Expense, "id"> }
  | {
      action: "UPDATE_EXPENSE";
      payload: { expenseId: string } & Partial<Omit<Expense, "id">>;
    }
  | { action: "DELETE_EXPENSE"; payload: { expenseId: string } }
  | {
      action: "CREATE_GROUP";
      payload: { groupData: Omit<Group, "id">; userId: string };
    }
  | { action: "ADD_FRIEND"; payload: Record<string, unknown> }
  | { action: "SETTLE_UP"; payload: Record<string, unknown> };

export type SyncQueueItem = {
  id: string;
  createdAt: string; // ISO string
  retryCount: number;
  lastError?: string;
} & SyncPayload;

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
// NOTE: With Supabase, most operations are direct API calls. This service is
// kept as a lightweight fallback queue for operations that fail due to network
// issues (e.g. pure AsyncStorage/offline mode). When Supabase is connected,
// enqueued items are auto-cleared since operations go directly to the server.

const QUEUE_STORAGE_KEY = "@splitwise_sync_queue";

class SyncQueueService {
  private static instance: SyncQueueService;
  private queue: SyncQueueItem[] = [];
  private isSyncing = false;
  private listeners: SyncProgressListener[] = [];

  private constructor() {
    this.loadQueue();
  }

  static getInstance(): SyncQueueService {
    if (!SyncQueueService.instance) {
      SyncQueueService.instance = new SyncQueueService();
    }
    return SyncQueueService.instance;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async enqueue<A extends SyncActionType>(
    action: A,
    payload: Extract<SyncPayload, { action: A }>["payload"],
  ): Promise<string> {
    // If Supabase is connected, writes go directly to the server — skip queue
    const db = DatabaseService.getInstance();
    if (db.isConnected()) {
      return "supabase-synced";
    }

    const item = {
      id: `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    } as SyncQueueItem;
    this.queue.push(item);
    await this.persistQueue();
    return item.id;
  }

  async remove(itemId: string): Promise<void> {
    this.queue = this.queue.filter((i) => i.id !== itemId);
    await this.persistQueue();
  }

  getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  addProgressListener(listener: SyncProgressListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async flush(
    _userId?: string,
    _dispatch?: React.Dispatch<any>,
  ): Promise<SyncProgress> {
    // When Supabase is connected, there's nothing to flush — operations go direct.
    const db = DatabaseService.getInstance();
    if (db.isConnected()) {
      // Clear any stale queued items since Supabase is connected
      if (this.queue.length > 0) {
        this.queue = [];
        await this.persistQueue();
      }
      return { total: 0, completed: 0, failed: 0, status: "idle" };
    }

    // No queued items
    if (this.isSyncing || this.queue.length === 0) {
      return {
        total: this.queue.length,
        completed: 0,
        failed: 0,
        status: "idle",
      };
    }

    return {
      total: this.queue.length,
      completed: 0,
      failed: 0,
      status: "idle",
    };
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

  destroy(): void {
    this.listeners = [];
  }
}

export default SyncQueueService;
